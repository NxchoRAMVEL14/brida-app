// Generador mínimo de XLSX con formato de moneda/porcentaje (sin dependencias pesadas).
import { zipSync, strToU8 } from "fflate";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const colLetra = (n) => { let s = ""; n++; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };

// tipos de columna: "money" | "percent" | "date" | "text"(por defecto)
export function exportarXLSX(nombreArchivo, hoja, filas, tipos) {
  const estilo = { money: 1, percent: 2, text: 0 };
  const nCols = filas.reduce((m, f) => Math.max(m, f.length), 0);

  let sheetRows = "";
  filas.forEach((fila, r) => {
    let celdas = "";
    for (let c = 0; c < fila.length; c++) {
      const ref = colLetra(c) + (r + 1);
      const tipo = r === 0 ? "text" : (tipos[c] || "text");
      const val = fila[c];
      if (r === 0) {
        celdas += `<c r="${ref}" s="3" t="inlineStr"><is><t xml:space="preserve">${esc(val)}</t></is></c>`;
      } else if ((tipo === "money" || tipo === "percent") && val !== "" && val != null && !isNaN(Number(val))) {
        celdas += `<c r="${ref}" s="${estilo[tipo]}"><v>${Number(val)}</v></c>`;
      } else if (val === "" || val == null) {
        celdas += `<c r="${ref}"/>`;
      } else {
        celdas += `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(val)}</t></is></c>`;
      }
    }
    sheetRows += `<row r="${r + 1}">${celdas}</row>`;
  });

  const cols = `<cols>${Array.from({ length: nCols }).map((_, i) => `<col min="${i + 1}" max="${i + 1}" width="18" customWidth="1"/>`).join("")}</cols>`;
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>${cols}<sheetData>${sheetRows}</sheetData></worksheet>`;

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="&quot;$&quot;#,##0"/><numFmt numFmtId="165" formatCode="0&quot;%&quot;"/></numFmts>
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF141C26"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="4">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(hoja).slice(0,31)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;

  const zip = zipSync({
    "[Content_Types].xml": strToU8(contentTypes),
    "_rels/.rels": strToU8(rels),
    "xl/workbook.xml": strToU8(workbook),
    "xl/_rels/workbook.xml.rels": strToU8(wbRels),
    "xl/styles.xml": strToU8(styles),
    "xl/worksheets/sheet1.xml": strToU8(sheet),
  });

  const blob = new Blob([zip], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nombreArchivo;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// ── Exportador dedicado de COTIZACIÓN (datos + tabla + totales) ──
export function exportarCotizacionXLSX(cot, letras, nombreArchivo) {
  const parts = cot.partidas || [];
  const mon = cot.moneda === "USD" ? "USD" : "MXN";
  const num = (v) => (v == null || v === "" || isNaN(Number(v))) ? null : Number(v);
  const sub = parts.reduce((s, p) => s + (Number(p.cantidad) || 0) * (Number(p.precio) || 0) * (1 - (Number(p.descuento) || 0) / 100), 0);

  // filas: cada celda = [valor, estilo, esNumero]
  const rows = [];
  rows.push([["COTIZACIÓN TÉCNICA-ECONÓMICA", 2]]);
  rows.push([]);
  rows.push([["Razón Social:", 1], [cot.cliente || "", 0], ["", 0], ["", 0], ["Folio:", 1], [cot.folio || "", 0]]);
  rows.push([["Representante:", 1], [cot.representante || "", 0], ["", 0], ["", 0], ["Fecha:", 1], [cot.fecha || "", 0]]);
  rows.push([["Domicilio:", 1], [cot.domicilio || "", 0]]);
  rows.push([["Cotizador:", 1], [cot.cotizador || "", 0]]);
  rows.push([]);
  rows.push([["Part.", 3], ["Cant.", 3], ["Descripción", 3], ["P.U.", 3], ["TOTAL", 3], ["Tiempo estimado", 3], ["DataSheet", 3]]);
  parts.forEach((p, i) => {
    const imp = (Number(p.cantidad) || 0) * (Number(p.precio) || 0) * (1 - (Number(p.descuento) || 0) / 100);
    rows.push([[i + 1, 0, true], [num(p.cantidad) || 0, 0, true], [p.descripcion || "", 0], [num(p.precio), 4, true], [imp, 4, true], [p.tiempo || "", 0], [p.datasheet || "", 0]]);
  });
  rows.push([]);
  rows.push([["", 0], ["", 0], ["", 0], ["TOTAL " + mon + " + IVA", 1], [sub, 4, true]]);
  rows.push([[(letras || "") + " " + mon + " + IVA", 1]]);
  rows.push([]);
  rows.push([["Esta cotización no incluye el 16% de IVA. Precios sujetos a cambio según la paridad peso/dólar vigente.", 0]]);

  let sheetRows = "";
  rows.forEach((fila, r) => {
    let celdas = "";
    fila.forEach((cel, c) => {
      const ref = colLetra(c) + (r + 1);
      const [val, estilo, esNum] = cel;
      if (val === "" || val == null) celdas += `<c r="${ref}" s="${estilo}"/>`;
      else if (esNum && !isNaN(Number(val))) celdas += `<c r="${ref}" s="${estilo}"><v>${Number(val)}</v></c>`;
      else celdas += `<c r="${ref}" s="${estilo}" t="inlineStr"><is><t xml:space="preserve">${esc(val)}</t></is></c>`;
    });
    sheetRows += `<row r="${r + 1}">${celdas}</row>`;
  });

  const anchos = [7, 7, 46, 13, 13, 20, 34];
  const cols = `<cols>${anchos.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>`;
  const merges = `<mergeCells count="2"><mergeCell ref="A1:G1"/><mergeCell ref="A${rows.length - 1}:G${rows.length - 1}"/></mergeCells>`;
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${cols}<sheetData>${sheetRows}</sheetData>${merges}</worksheet>`;

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="166" formatCode="&quot;$&quot;#,##0.00"/></numFmts>
<fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF141C26"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="5">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center"/></xf>
<xf numFmtId="0" fontId="3" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" wrapText="1"/></xf>
<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Cotización" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;

  const zip = zipSync({
    "[Content_Types].xml": strToU8(contentTypes),
    "_rels/.rels": strToU8(rels),
    "xl/workbook.xml": strToU8(workbook),
    "xl/_rels/workbook.xml.rels": strToU8(wbRels),
    "xl/styles.xml": strToU8(styles),
    "xl/worksheets/sheet1.xml": strToU8(sheet),
  });
  const blob = new Blob([zip], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nombreArchivo;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
