// Importar oportunidades desde un Excel exportado de Monday.
// Lee el .xlsx (sin dependencias pesadas) con fflate + DOMParser del navegador.
import { unzipSync, strFromU8 } from "fflate";

const colToIdx = (col) => { let n = 0; for (let i = 0; i < col.length; i++) n = n * 26 + (col.charCodeAt(i) - 64); return n - 1; };

// Devuelve un arreglo de hojas; cada hoja es un arreglo de filas; cada fila un arreglo de celdas (texto)
export function leerXLSX(buffer) {
  const files = unzipSync(new Uint8Array(buffer));
  const parse = (name) => new DOMParser().parseFromString(strFromU8(files[name]), "application/xml");
  const ss = files["xl/sharedStrings.xml"]
    ? Array.from(parse("xl/sharedStrings.xml").getElementsByTagName("si")).map((si) => Array.from(si.getElementsByTagName("t")).map((t) => t.textContent).join(""))
    : [];
  const hojas = Object.keys(files).filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort();
  return hojas.map((sn) => {
    const doc = parse(sn);
    const filas = [];
    Array.from(doc.getElementsByTagName("row")).forEach((row) => {
      const cells = [];
      Array.from(row.getElementsByTagName("c")).forEach((c) => {
        const ref = c.getAttribute("r") || "";
        const i = colToIdx(ref.replace(/[0-9]/g, ""));
        const t = c.getAttribute("t");
        const v = c.getElementsByTagName("v")[0];
        let val = "";
        if (t === "s") val = v ? (ss[parseInt(v.textContent, 10)] || "") : "";
        else if (t === "inlineStr") { const tn = c.getElementsByTagName("t")[0]; val = tn ? tn.textContent : ""; }
        else val = v ? v.textContent : "";
        if (i >= 0) cells[i] = val;
      });
      filas.push(cells);
    });
    return filas;
  });
}

const limpiar = (s) => String(s || "").replace(/^\s*\d+\s+(?=[A-Za-zÁÉÍÓÚÑáéíóúñ])/, "").trim();
const limpiarPersona = (s) => {
  const partes = String(s || "").split(",").map((p) => p.replace(/^\s*\d+\s+/, "").trim()).filter(Boolean);
  return Array.from(new Set(partes)).join(", ");
};

// Convierte las hojas leídas en oportunidades, separando nuevas de duplicadas
export function mapearMonday(hojas, pipeline, tc) {
  let filas = null, hi = -1;
  for (const h of hojas) {
    const i = h.findIndex((r) => r && r.some((c) => String(c || "").trim().toLowerCase() === "cliente") && r.some((c) => String(c || "").trim().toLowerCase() === "nombre"));
    if (i >= 0) { filas = h; hi = i; break; }
  }
  if (!filas) return { error: "No encontré los encabezados de Monday (Nombre, Cliente…). Revisa que sea el Excel exportado desde tu tablero." };

  const headers = filas[hi].map((c) => String(c || "").trim());
  const col = (...names) => {
    for (const n of names) { const i = headers.findIndex((h) => h.toLowerCase() === n.toLowerCase()); if (i >= 0) return i; }
    for (const n of names) { const i = headers.findIndex((h) => h.toLowerCase().includes(n.toLowerCase())); if (i >= 0) return i; }
    return -1;
  };
  const idx = {
    nombre: col("Nombre"), idauto: col("ID AUTO"), cliente: col("Cliente"), vendedor: col("Vendedor Asignado"),
    solicitante: col("Solicitante"), pesos: col("$ Pesos", "Pesos"), dolares: col("$ Dolares", "Dolares", "Dólares"),
    sucursal: col("Sucursal"), oc: col("OC Cliente"), solicitud: col("Nombre de la solicitud o proyecto", "Nombre de la solicitud", "solicitud"),
    desc: col("Descripción", "Descripcion"), link: col("Link Cot"), estado: col("Estado"),
  };
  const num = (v) => { const n = parseFloat(String(v).replace(/[^0-9.\-]/g, "")); return isNaN(n) ? 0 : n; };
  const get = (row, i) => (i >= 0 && row[i] != null ? String(row[i]).trim() : "");

  const existeCot = new Set(pipeline.map((o) => (o.numCotizacion || "").trim().toLowerCase()).filter(Boolean));
  const existeMonday = new Set(pipeline.map((o) => (o.mondayId || "").trim()).filter(Boolean));
  const nuevas = [], duplicadas = [], vistos = new Set();

  for (let r = hi + 1; r < filas.length; r++) {
    const row = filas[r]; if (!row) continue;
    const cliente = limpiar(get(row, idx.cliente));
    const solicitud = get(row, idx.solicitud);
    const nombre = get(row, idx.nombre);
    if (!cliente && !solicitud && !nombre) continue;

    const pesos = num(get(row, idx.pesos));
    const dolares = num(get(row, idx.dolares));
    const mondayId = get(row, idx.idauto);
    const numCot = nombre;
    const esUSD = pesos <= 0 && dolares > 0;
    const estado = get(row, idx.estado).toLowerCase();
    const etapa = /factur/.test(estado) ? "facturado" : /(pedido|orden)/.test(estado) ? "pedido" : /ganad/.test(estado) ? "oc" : "cotizado";

    const cand = {
      cliente: cliente || solicitud || nombre,
      titulo: solicitud,
      etapa,
      monto: pesos > 0 ? Math.round(pesos) : (esUSD ? Math.round(dolares * (tc || 0)) : null),
      moneda: esUSD ? "USD" : "MXN",
      montoOrig: esUSD ? dolares : null,
      tcCaptura: esUSD ? (tc || null) : null,
      margen: null, marca: "",
      plaza: get(row, idx.sucursal),
      vendedor: limpiarPersona(get(row, idx.vendedor)) || limpiarPersona(get(row, idx.solicitante)),
      numCotizacion: numCot,
      ocCliente: get(row, idx.oc),
      notas: [get(row, idx.desc), get(row, idx.link)].filter(Boolean).join(" · "),
      mondayId,
    };

    const clave = (mondayId || "").trim() || (numCot || "").trim().toLowerCase();
    const dup = (mondayId && existeMonday.has(mondayId)) || (numCot && existeCot.has(numCot.toLowerCase())) || (clave && vistos.has(clave));
    if (clave) vistos.add(clave);
    (dup ? duplicadas : nuevas).push(cand);
  }
  return { nuevas, duplicadas };
}
