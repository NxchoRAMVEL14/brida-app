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

// ── Exportador dedicado de COTIZACIÓN (formato Elektron: bordes, secciones) ──
export function exportarCotizacionXLSX(cot, letras, nombreArchivo) {
  const parts = cot.partidas || [];
  const mon = cot.moneda === "USD" ? "USD" : "MXN";
  const num = (v) => (v == null || v === "" || isNaN(Number(v))) ? null : Number(v);
  const sub = parts.reduce((s, p) => s + (Number(p.cantidad) || 0) * (Number(p.precio) || 0) * (1 - (Number(p.descuento) || 0) / 100), 0);

  // estilos: 0 normal | 1 negrita | 2 título | 3 header(oscuro,borde) | 4 dinero(borde) |
  //          5 celda(borde,wrap) | 6 centro(borde) | 7 label negrita | 8 nota
  const rows = []; // {c:[[val,estilo,esNum]], h:alto}
  const merges = [];
  let r = 0;
  const push = (cells, h) => { rows.push({ c: cells, h }); r++; };
  const mrow = (val, estilo, cols, h) => { merges.push("A" + (r + 1) + ":" + String.fromCharCode(65 + cols - 1) + (r + 1)); push([[val, estilo]], h); };

  mrow("Cotización Técnica -Económica", 2, 6, 20);
  push([]);
  // datos: label | valor | | | Folio | folio
  merges.push("B" + (r + 1) + ":D" + (r + 1));
  push([["Razón Social:", 7], [cot.cliente || "", 1], ["", 0], ["", 0], ["", 0], [cot.folio || "", 7]]);
  merges.push("B" + (r + 1) + ":D" + (r + 1));
  push([["Representante:", 7], [cot.representante || "", 0], ["", 0], ["", 0], ["Fecha:", 7], [cot.fecha || "", 0]]);
  merges.push("B" + (r + 1) + ":F" + (r + 1));
  push([["Domicilio:", 7], [cot.domicilio || "", 0]]);
  merges.push("B" + (r + 1) + ":F" + (r + 1));
  push([["Cotizador:", 7], [cot.cotizador || "", 0]]);
  push([]);
  mrow("Estimados Clientes y Amigos:", 1, 6);
  mrow("Sometemos a sus finas atenciones nuestra oferta en precio y tiempo de entrega del siguiente material y equipo:", 0, 6);
  // encabezado tabla
  push([["Part.", 3], ["Cant.", 3], ["Descripción", 3], ["P.U.", 3], ["TOTAL", 3], ["DataSheet", 3]]);
  parts.forEach((p, i) => {
    const imp = (Number(p.cantidad) || 0) * (Number(p.precio) || 0) * (1 - (Number(p.descuento) || 0) / 100);
    const t = p.tiempo ? "Partida " + (i + 1) + " - Tiempo estimado: " + p.tiempo : "Partida " + (i + 1);
    const desc = (p.descripcion || "") + "\n" + t + "\n\nPRECIO EN " + mon;
    push([[i + 1, 6, true], [num(p.cantidad) || 0, 6, true], [desc, 5], [num(p.precio), 4, true], [imp, 4, true], [p.datasheet || "", 5]], 44);
  });
  // total
  merges.push("A" + (r + 1) + ":C" + (r + 1));
  push([[(letras || "") + " " + mon + " + IVA", 1], ["", 0], ["", 0], ["TOTAL", 3], [sub, 4, true], ["", 6]]);
  push([]);
  // condiciones
  const cond = [
    ["Condiciones Generales:", 7],
    ["El cliente deberá pagar el 50 % de anticipo (referirse a política de anticipos). El saldo deberá liquidarse contra aviso de disponibilidad, si no cuenta con línea de crédito.", 8],
    ["Notas de Escalación:", 7],
    ["Esta cotización no incluye el 16 % de IVA, el cual se cargará al momento de la facturación. Los precios están sujetos a cambio según la paridad peso/dólar vigente. No incluye servicio de configuración y puesta en marcha salvo que se indique.", 8],
    ["CANCELACIONES: Elektron del Bajío no acepta la cancelación de pedidos de Ingeniería y proyectos. En caso de ocurrir, el cargo se determina por gastos e insumos según la etapa: 10% al recibir el pedido, 35% en ingeniería, 50-75% en compra/ensamble, 100% orden terminada.", 8],
    ["NOTAS: Los tiempos de entrega son la mejor estimación al emitir la cotización, en días hábiles (lun-vie), salvo previa venta y sujetos a cambio. Considerar 3-5 días hábiles adicionales para entrega en sitio. Favor de colocar el pedido a nombre de Elektron del Bajío, S.A. de C.V.", 8],
  ];
  cond.forEach(([txt, est]) => { merges.push("A" + (r + 1) + ":F" + (r + 1)); push([[txt, est]], est === 8 ? 30 : 0); });
  push([]);
  mrow("ATENTAMENTE — ELEKTRON DEL BAJIO SA DE CV", 1, 6);
  mrow("Reviso y Verifico · Cotizador de ingeniería y proyectos, automatización y control · Ing. Saúl Velázquez", 0, 6);

  let sheetRows = "";
  rows.forEach((fila, ri) => {
    let celdas = "";
    (fila.c || []).forEach((cel, ci) => {
      const ref = colLetra(ci) + (ri + 1);
      const [val, estilo, esNum] = cel;
      if (val === "" || val == null) celdas += '<c r="' + ref + '" s="' + estilo + '"/>';
      else if (esNum && !isNaN(Number(val))) celdas += '<c r="' + ref + '" s="' + estilo + '"><v>' + Number(val) + '</v></c>';
      else celdas += '<c r="' + ref + '" s="' + estilo + '" t="inlineStr"><is><t xml:space="preserve">' + esc(val) + '</t></is></c>';
    });
    const ht = fila.h ? ' ht="' + fila.h + '" customHeight="1"' : "";
    sheetRows += '<row r="' + (ri + 1) + '"' + ht + '>' + celdas + '</row>';
  });

  const anchos = [6, 6, 54, 13, 13, 16];
  const cols = '<cols>' + anchos.map((w, i) => '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>').join("") + '</cols>';
  const mergeXml = merges.length ? '<mergeCells count="' + merges.length + '">' + merges.map((m) => '<mergeCell ref="' + m + '"/>').join("") + '</mergeCells>' : "";
  const sheet = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' + cols + '<sheetData>' + sheetRows + '</sheetData>' + mergeXml + '</worksheet>';

  const styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
'<numFmts count="1"><numFmt numFmtId="166" formatCode="&quot;$&quot;#,##0.00"/></numFmts>' +
'<fonts count="5"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="10"/><name val="Arial"/></font><font><b/><sz val="14"/><name val="Arial"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Arial"/></font><font><sz val="9"/><color rgb="FF444444"/><name val="Arial"/></font></fonts>' +
'<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF141C26"/></patternFill></fill></fills>' +
'<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/><diagonal/></border></borders>' +
'<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
'<cellXfs count="9">' +
'<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
'<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
'<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center"/></xf>' +
'<xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" wrapText="1"/></xf>' +
'<xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>' +
'<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
'<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>' +
'<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="right"/></xf>' +
'<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
'</cellXfs>' +
'<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
'</styleSheet>';

  const workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Cotización" sheetId="1" r:id="rId1"/></sheets></workbook>';
  const wbRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
  const rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
  const contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>';

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
