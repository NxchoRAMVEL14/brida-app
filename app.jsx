import { useState, useEffect, useMemo, useRef } from "react";
import {
  ListTodo, Timer, Briefcase, Target, FileDown, Plus, Play, Square,
  Circle, CheckCircle2, ChevronDown, ChevronRight, AlertTriangle, X,
  Trash2, Flag, Copy, Check, Zap, ArrowRight, Search, Link2, CalendarDays, Lightbulb, Download, Upload, Mic, Sparkles, CalendarPlus, Share2, HelpCircle, BookOpen, MessageSquare, Percent, User, MapPin, Camera, Navigation, Cloud, CloudOff, LogOut, Send, Building2, Users, FileText, Package
} from "lucide-react";
import { entrar, registrar, salir, sesionActual, alCambiarSesion, leerNube, subirNube, tieneDatos } from "./nube.jsx";
const nfEnteros = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
import { ILUSTRACIONES } from "./ilustraciones.jsx";
import { exportarXLSX } from "./xlsx.jsx";

/* ── Paleta: HMI industrial de alto desempeño ─────────────────────── */
const C = {
  bezel: "#17161B",   // negro (bisel superior e inferior)
  bezel2: "#28262E",
  fondo: "#ECEDEF",   // lienzo gris HMI
  panel: "#F8FAFC",
  borde: "#CBD5DE",
  tinta: "#181619",
  dim: "#5E6E7E",
  ambar: "#E23B3B", ambarBg: "#FBE9E9",   // acento rojo (color de marca)
  rojo: "#C94848", rojoBg: "#F9E9E9",     // falla / vencido
  verde: "#2F9467", verdeBg: "#E5F2EC",   // OK / ganado
  azul: "#3D74B8", azulBg: "#E8F0F8",     // info
  morado: "#7C5FB8", teal: "#2F8FA3",
};
const dsp = { fontFamily: "'Barlow Condensed','Arial Narrow',sans-serif" };
const mono = { fontFamily: "'IBM Plex Mono',ui-monospace,monospace" };
const inp = { background: "#FFFFFF", border: `1px solid ${C.borde}`, color: C.tinta, colorScheme: "light" };

const ETAPAS = [
  { id: "visita", label: "Acuerdo de visita", color: C.morado },
  { id: "cotizado", label: "Cotizado", color: C.azul },
  { id: "porcerrar", label: "Por cerrar", color: C.ambar },
  { id: "oc", label: "OC recibida", color: C.verde },
  { id: "pedido", label: "Pedido realizado", color: C.teal },
  { id: "facturado", label: "Facturado", color: "#1F7A55" },
  { id: "perdido", label: "Perdido", color: C.dim },
];
const ACTIVAS = ["visita", "cotizado", "porcerrar"];
const FLUJO = ["visita", "cotizado", "porcerrar", "oc", "pedido", "facturado"];
const etapa = (id) => ETAPAS.find((e) => e.id === id) || ETAPAS[0];

const CATS = [
  { id: "Visitas a cliente", color: C.ambar },
  { id: "Cotizaciones", color: C.azul },
  { id: "Llamadas y seguimiento", color: C.morado },
  { id: "Traslados", color: C.teal },
  { id: "Administrativo", color: C.dim },
  { id: "Capacitación", color: C.verde },
];
const catColor = (id) => (CATS.find((c) => c.id === id) || CATS[4]).color;
const PRIOS = [
  { id: "alta", label: "Alta", color: C.rojo },
  { id: "media", label: "Media", color: C.ambar },
  { id: "baja", label: "Baja", color: C.azul },
];

/* ── Utilidades ───────────────────────────────────────────────────── */
const pad = (n) => String(n).padStart(2, "0");
const fLocal = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hoy = () => fLocal();
const sumaDias = (base, n) => { const [y, m, d] = base.split("-").map(Number); const dt = new Date(y, m - 1, d + n); return fLocal(dt); };
const manana = () => sumaDias(hoy(), 1);
const iniSemana = () => { const d = new Date(); const k = (d.getDay() + 6) % 7; d.setDate(d.getDate() - k); return fLocal(d); };
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const fFecha = (s) => { if (!s) return ""; const [, m, d] = s.split("-").map(Number); return `${d} ${MESES[m - 1]}`; };
const fHoyLargo = () => { const d = new Date(); return `${DIAS[(d.getDay() + 6) % 7]} ${d.getDate()} ${MESES[d.getMonth()]}`; };
const MESES_L = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const fHoyCompleto = () => { const d = new Date(); return `${DIAS[(d.getDay() + 6) % 7]} ${d.getDate()} de ${MESES_L[d.getMonth()]} de ${d.getFullYear()}`; };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const fMXN = (n) => (n || n === 0 ? new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n) : "—");
const fMin = (m) => { m = Math.round(m || 0); return m >= 60 ? `${Math.floor(m / 60)}h ${pad(m % 60)}m` : `${m}m`; };
const fCrono = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`; };
const aCSV = (filas) => "\uFEFF" + filas.map((f) => f.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
const descargar = (nombre, contenido, tipo = "text/csv;charset=utf-8;") => {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};

const VACIO = { tareas: [], tiempo: [], pipeline: [], metas: { corto: [], mediano: [], largo: [] }, mejoras: [], visitas: [], clientes: [], contactos: [], actividades: [], productos: [], cotizaciones: [], timer: null, tipoCambio: 17, tipoCambioFecha: "" };
const RESULTADOS = [
  { id: "pendiente", label: "Pendiente", color: "#5E6E7E" },
  { id: "interes", label: "Interés", color: "#3D74B8" },
  { id: "cotizacion", label: "Cotización", color: "#DE9B10" },
  { id: "pedido", label: "Pedido/cierre", color: "#2F9467" },
  { id: "sininteres", label: "Sin interés", color: "#C94848" },
  { id: "reagendar", label: "Reagendar", color: "#7C5FB8" },
];
const resultadoDe = (id) => RESULTADOS.find((r) => r.id === id) || RESULTADOS[0];
const TIPOS_CLIENTE = [
  { id: "integrador", label: "Integrador" },
  { id: "oem", label: "OEM" },
  { id: "industria", label: "Industria" },
  { id: "publico", label: "Público" },
];
const ESTADOS_CLIENTE = [
  { id: "prospecto", label: "Prospecto", color: "#3D74B8" },
  { id: "activo", label: "Activo", color: "#2F9467" },
  { id: "dormido", label: "Dormido", color: "#5E6E7E" },
];
const ROLES_DECISION = [
  { id: "decide", label: "Decide" },
  { id: "influye", label: "Influye" },
  { id: "usa", label: "Usa" },
  { id: "paga", label: "Paga" },
];
const TIPOS_ACTIVIDAD = [
  { id: "llamada", label: "Llamada" },
  { id: "correo", label: "Correo" },
  { id: "reunion", label: "Reunión" },
  { id: "visita", label: "Visita" },
  { id: "nota", label: "Nota" },
];
const ESTADOS_COTIZACION = [
  { id: "borrador", label: "Borrador", color: "#5E6E7E" },
  { id: "enviada", label: "Enviada", color: "#3D74B8" },
  { id: "aceptada", label: "Aceptada", color: "#2F9467" },
  { id: "rechazada", label: "Rechazada", color: "#C94848" },
];
function totalesCot(cot) {
  const sub = (cot.partidas || []).reduce((s, p) => s + (Number(p.cantidad) || 0) * (Number(p.precio) || 0) * (1 - (Number(p.descuento) || 0) / 100), 0);
  const iva = cot.iva !== false ? sub * 0.16 : 0;
  return { sub, iva, total: sub + iva };
}
function escHtml(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function pdfCotizacion(cot) {
  const t = totalesCot(cot);
  const cur = cot.moneda === "USD" ? " USD" : "";
  const st = (ESTADOS_COTIZACION.find((s) => s.id === cot.estado) || ESTADOS_COTIZACION[0]).label;
  const filas = (cot.partidas || []).map((p, i) => {
    const imp = (Number(p.cantidad) || 0) * (Number(p.precio) || 0) * (1 - (Number(p.descuento) || 0) / 100);
    return `<tr><td>${i + 1}</td><td>${escHtml(p.descripcion)}</td><td class="r">${Number(p.cantidad) || 0}</td><td class="r">${fMXN(Number(p.precio) || 0)}</td><td class="r">${p.descuento ? Number(p.descuento) + "%" : "—"}</td><td class="r">${fMXN(imp)}</td></tr>`;
  }).join("");
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cotización ${escHtml(cot.folio || "")}</title>
<style>
*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#182430;margin:0;padding:32px}
.head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #E23B3B;padding-bottom:12px}
.marca{font-size:28px;font-weight:800;letter-spacing:2px;color:#182430}
.doc{font-size:12px;color:#5E6E7E;text-transform:uppercase;letter-spacing:1px;margin-top:4px}
.meta{text-align:right;font-size:13px;color:#5E6E7E;line-height:1.7}.meta b{color:#182430}
.cliente{margin:20px 0 4px}.cliente .lbl{font-size:11px;color:#9AA7B4;text-transform:uppercase;letter-spacing:1px}.cliente .nom{font-size:15px;font-weight:700}
table{width:100%;border-collapse:collapse;margin-top:10px;font-size:13px}
th{background:#141C26;color:#fff;text-align:left;padding:8px;font-size:10px;text-transform:uppercase;letter-spacing:.5px}
th.r,td.r{text-align:right}td{padding:7px 8px;border-bottom:1px solid #E5E9ED}
.tot{margin-top:16px;margin-left:auto;width:280px;font-size:14px}
.tot .row{display:flex;justify-content:space-between;padding:4px 0}
.tot .total{font-weight:800;font-size:17px;border-top:2px solid #182430;padding-top:7px;margin-top:2px}
.notas{margin-top:22px;font-size:12px;color:#5E6E7E;white-space:pre-wrap;border-left:3px solid #E5E9ED;padding-left:10px}
.foot{margin-top:36px;font-size:11px;color:#9AA7B4;border-top:1px solid #E5E9ED;padding-top:10px;text-align:center}
@media print{body{padding:16mm 14mm}@page{margin:0}}
</style></head><body>
<div class="head">
  <div><div class="marca">COTIZACIÓN</div><div class="doc">${cot.folio ? "Folio " + escHtml(cot.folio) : "Propuesta comercial"}</div></div>
  <div class="meta"><b>Fecha:</b> ${escHtml(cot.fecha || "")}<br><b>Estado:</b> ${escHtml(st)}</div>
</div>
<div class="cliente"><div class="lbl">Cliente</div><div class="nom">${escHtml(cot.cliente || "—")}</div></div>
<table>
  <thead><tr><th>#</th><th>Descripción</th><th class="r">Cant.</th><th class="r">P. Unit.</th><th class="r">Desc.</th><th class="r">Importe</th></tr></thead>
  <tbody>${filas || '<tr><td colspan="6" style="text-align:center;color:#9AA7B4;padding:16px">Sin partidas</td></tr>'}</tbody>
</table>
<div class="tot">
  <div class="row"><span>Subtotal</span><span>${fMXN(t.sub)}${cur}</span></div>
  ${cot.iva !== false ? `<div class="row"><span>IVA 16%</span><span>${fMXN(t.iva)}${cur}</span></div>` : ""}
  <div class="row total"><span>Total</span><span>${fMXN(t.total)}${cur}</span></div>
</div>
${cot.notas ? `<div class="notas">${escHtml(cot.notas)}</div>` : ""}
<div class="foot">Documento sujeto a confirmación · Precios en ${cur.trim() || "MXN"}</div>
</body></html>`;
  const w = window.open("", "_blank");
  if (!w) { alert("Permite las ventanas emergentes (pop-ups) para generar el PDF."); return; }
  w.document.write(html); w.document.close(); w.focus();
  setTimeout(() => { try { w.print(); } catch (e) {} }, 500);
}

/* ── Google Calendar (URL pre-llenada) ────────────────────────────── */
const masMinutos = (hhmm, mins) => {
  const [h, m] = hhmm.split(":").map(Number);
  const t = h * 60 + m + mins;
  return `${pad(Math.floor(t / 60) % 24)}:${pad(t % 60)}`;
};
const abrirGCal = ({ titulo, fecha, horaInicio, fechaFin, horaFin, detalles }) => {
  if (!fecha) return;
  const d0 = fecha.replace(/-/g, "");
  let dates;
  if (horaInicio) {
    const hf = horaFin || masMinutos(horaInicio, 60);
    const df = (fechaFin && fechaFin >= fecha ? fechaFin : fecha).replace(/-/g, "");
    dates = `${d0}T${horaInicio.replace(":", "")}00/${df}T${hf.replace(":", "")}00`;
  } else {
    dates = `${d0}/${sumaDias(fecha, 1).replace(/-/g, "")}`;
  }
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(titulo || "Pendiente")}&dates=${dates}&details=${encodeURIComponent(detalles || "Creado desde Brida")}`;
  window.open(url, "_blank", "noopener");
};
const textoTarea = (t) => `${t.titulo}${t.fecha ? ` · ${fFecha(t.fecha)}` : ""}${t.horaInicio ? ` ${t.horaInicio}` : ""}${t.horaFin ? `–${t.horaFin}` : ""}${t.cliente ? ` · ${t.cliente}` : ""}`;
const montoTexto = (o) => o.moneda === "USD" && o.montoOrig ? `US$${nfEnteros.format(o.montoOrig)} (${fMXN(o.monto || 0)})` : fMXN(o.monto || 0);
function mensajeEstatus(vendedor, lista) {
  const saludo = vendedor ? `Hola ${vendedor} 👋` : "Hola 👋";
  const enc = lista.length === 1 ? "esta oportunidad" : `estas ${lista.length} oportunidades`;
  let t = `${saludo}\n\n¿Me apoyas con el estatus de ${enc}? Con un comentario breve en cada renglón "Estatus" me sirve. ¡Gracias!\n`;
  lista.forEach((o, i) => {
    t += `\n${i + 1}) ${o.cliente}${o.titulo ? " — " + o.titulo : ""}`;
    t += `\n   💰 ${montoTexto(o)}  ·  📌 ${etapa(o.etapa).label}`;
    const ref = [o.numCotizacion ? `Cot ${o.numCotizacion}` : "", o.fechaCotizacion ? fFecha(o.fechaCotizacion) : "", o.marca || "", o.plaza || ""].filter(Boolean).join(" · ");
    if (ref) t += `\n   📄 ${ref}`;
    const nums = [o.ocCliente ? `OC ${o.ocCliente}` : "", o.numPedido ? `Pedido ${o.numPedido}` : "", o.numFactura ? `Factura ${o.numFactura}` : ""].filter(Boolean).join(" · ");
    if (nums) t += `\n   🧾 ${nums}`;
    if (o.proximaAccion) t += `\n   📝 Pendiente: ${o.proximaAccion}${o.fechaAccion ? ` (${fFecha(o.fechaAccion)})` : ""}`;
    t += `\n   → Estatus: __________`;
    t += `\n`;
  });
  return t;
}
const abrirWhatsApp = (texto) => window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
async function enviarTexto(texto) {
  if (navigator.share) { try { await navigator.share({ text: texto }); return "share"; } catch { return "cancel"; } }
  try { await navigator.clipboard.writeText(texto); return "copy"; } catch { return "err"; }
}
async function copiarTexto(texto) { try { await navigator.clipboard.writeText(texto); return true; } catch { return false; } }
const compartirTexto = async (titulo, texto) => {
  if (navigator.share) { try { await navigator.share({ title: titulo, text: texto }); } catch (e) {} return; }
  try { await navigator.clipboard.writeText(texto); window.alert("Copiado al portapapeles (tu navegador no tiene menú Compartir)."); } catch (e) {}
};

/* ── Asistente: intérprete local ──────────────────────────────────── */
const NOMBRES_DIA = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, "miércoles": 3, jueves: 4, viernes: 5, sabado: 6, "sábado": 6 };
const NOMBRES_MES = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
const escapeReg = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const detectarFecha = (txt) => {
  const H = hoy();
  let m = txt.match(/pasado ma[ñn]ana/); if (m) return { fecha: sumaDias(H, 2), frag: m[0] };
  m = txt.match(/\b(de la |en la |por la )?ma[ñn]ana\b/); if (m && !m[1]) return { fecha: sumaDias(H, 1), frag: m[0] };
  m = txt.match(/\bhoy\b/); if (m) return { fecha: H, frag: m[0] };
  m = txt.match(/\b(?:el |este |pr[oó]ximo )?(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\b/);
  if (m) { const dif = (NOMBRES_DIA[m[1]] - new Date().getDay() + 7) % 7; return { fecha: sumaDias(H, dif), frag: m[0] }; }
  m = txt.match(/\bel (\d{1,2})(?: de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre))?\b/);
  if (m) {
    const d = new Date(); const dia = +m[1]; let mes = m[2] ? NOMBRES_MES[m[2]] : d.getMonth() + 1; let anio = d.getFullYear();
    if (!m[2] && dia < d.getDate()) { mes += 1; if (mes > 12) { mes = 1; anio += 1; } }
    if (m[2] && (mes < d.getMonth() + 1 || (mes === d.getMonth() + 1 && dia < d.getDate()))) anio += 1;
    if (dia >= 1 && dia <= 31) return { fecha: `${anio}-${pad(mes)}-${pad(dia)}`, frag: m[0] };
  }
  return null;
};
const detectarHoras = (txt) => {
  const pm = /(tarde|noche|p\.?\s?m)/.test(txt);
  const aj = (h) => (pm && h >= 1 && h < 12 ? h + 12 : h);
  let m = txt.match(/de (?:las? )?(\d{1,2})(?::(\d{2}))?\s*(?:a|hasta) (?:las? )?(\d{1,2})(?::(\d{2}))?/);
  if (m) {
    let h1 = aj(+m[1]), h2 = aj(+m[3]);
    if (h2 <= h1 && h2 + 12 < 24) h2 += 12;
    if (h1 < 24 && h2 < 24) return { horaInicio: `${pad(h1)}:${pad(+(m[2] || 0))}`, horaFin: `${pad(h2)}:${pad(+(m[4] || 0))}`, frag: m[0] };
  }
  m = txt.match(/a (?:las? |la )?(\d{1,2})(?::(\d{2}))?/);
  if (m && +m[1] < 24) return { horaInicio: `${pad(aj(+m[1]))}:${pad(+(m[2] || 0))}`, horaFin: "", frag: m[0] };
  if (/mediod[ií]a/.test(txt)) return { horaInicio: "12:00", horaFin: "", frag: "mediod" };
  return null;
};
const detectarCliente = (orig) => {
  const m = orig.match(/\b(?:a|con|para|de)\s+([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÜÑáéíóúüñ&.\-]*(?:\s+[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÜÑáéíóúüñ&.\-]*){0,2})/);
  return m ? m[1] : "";
};
const limpiarFrag = (frag, quitar = []) => {
  let s = frag;
  for (const q of quitar) if (q) s = s.replace(new RegExp(escapeReg(q), "i"), " ");
  s = s.replace(/\s{2,}/g, " ").replace(/^[\s,.:;y]+|[\s,.:;]+$/g, "").trim();
  return s ? s[0].toUpperCase() + s.slice(1) : s;
};
const categoriaDe = (bajo) => /visita/.test(bajo) ? "Visitas a cliente" : /cotiza/.test(bajo) ? "Cotizaciones" : /llamad|seguimiento|whats|correo/.test(bajo) ? "Llamadas y seguimiento" : /traslad|manej|carretera|viaje/.test(bajo) ? "Traslados" : /curso|capacit|entrenamiento/.test(bajo) ? "Capacitación" : "Administrativo";
const interpretarLocal = (texto) => {
  const out = { tareas: [], oportunidades: [], metas: [], tiempo: [] };
  const partes = texto.split(/[\n;]+|\.\s+|,?\s+y (?:luego|tambi[eé]n)\s+|\s+tambi[eé]n\s+/i).map((p) => p.trim()).filter((p) => p.length > 2);
  for (const frag of partes) {
    const bajo = frag.toLowerCase();
    const f = detectarFecha(bajo);
    const hrs = detectarHoras(bajo);
    let m = bajo.match(/\bregistr\w*[\s\S]*?(\d+)\s*(minutos?|min\b|horas?|hrs?)/);
    if (m) {
      const n = Math.round(+m[1] * (/hora|hr/.test(m[2]) ? 60 : 1));
      out.tiempo.push({ categoria: categoriaDe(bajo), minutos: n, cliente: detectarCliente(frag), fecha: f ? f.fecha : hoy() });
      continue;
    }
    if (/^\s*(una? )?meta\b/.test(bajo)) {
      const plazo = /largo/.test(bajo) ? "largo" : /mediano/.test(bajo) ? "mediano" : "corto";
      out.metas.push({ plazo, texto: limpiarFrag(frag.replace(/^\s*(una? )?meta( a)?( de)?( corto| mediano| largo)?( plazo)?:?\s*/i, "")) });
      continue;
    }
    if (/oportunidad|proyecto (con|para|de)|cotizaci[oó]n (para|con|de)/.test(bajo)) {
      const mm = bajo.match(/\$?\s?(\d[\d,]*(?:\.\d+)?)\s*(mil|k)?\s*(pesos|mxn)?/);
      let monto = null;
      if (mm && mm[1]) { monto = parseFloat(mm[1].replace(/,/g, "")); if (mm[2]) monto *= 1000; if (!monto || (monto < 100 && !mm[2])) monto = null; }
      const etp = /cotiza/.test(bajo) ? "cotizado" : /cerrar/.test(bajo) ? "porcerrar" : /pedido/.test(bajo) ? "pedido" : "visita";
      out.oportunidades.push({ cliente: detectarCliente(frag), titulo: limpiarFrag(frag), etapa: etp, monto, proximaAccion: "", fechaAccion: f ? f.fecha : "" });
      continue;
    }
    const quitar = [f && f.frag, hrs && hrs.frag].filter(Boolean);
    out.tareas.push({
      titulo: limpiarFrag(frag, quitar) || frag,
      cliente: detectarCliente(frag),
      fecha: f ? f.fecha : hoy(),
      horaInicio: hrs ? hrs.horaInicio : "", horaFin: hrs ? hrs.horaFin : "", fechaFin: "",
      prioridad: /urgente|important/.test(bajo) ? "alta" : "media",
    });
  }
  return out;
};
const normalizarRes = (r) => {
  const arr = (x) => (Array.isArray(x) ? x : []);
  const tag = (x) => ({ ...x, incluir: true, _id: uid() });
  return {
    tareas: arr(r.tareas).filter((t) => t && (t.titulo || "").trim()).map(tag),
    oportunidades: arr(r.oportunidades).filter((o) => o && ((o.cliente || "").trim() || (o.titulo || "").trim())).map(tag),
    metas: arr(r.metas).filter((m) => m && (m.texto || "").trim()).map(tag),
    tiempo: arr(r.tiempo).filter((t) => t && +t.minutos > 0).map(tag),
  };
};
const pedirAClaude = async (texto, clave) => {
  const sistema = `Eres el intérprete del "Brida" de un ingeniero de ventas industriales en México. Hoy es ${hoy()} (AAAA-MM-DD). Convierte el dictado del usuario en JSON ESTRICTO, sin markdown ni texto extra, con exactamente esta forma: {"tareas":[{"titulo":"","cliente":"","fecha":"AAAA-MM-DD","horaInicio":"HH:MM","horaFin":"","fechaFin":"","prioridad":"alta|media|baja"}],"oportunidades":[{"cliente":"","titulo":"","etapa":"visita|cotizado|porcerrar|pedido|oc","monto":0,"proximaAccion":"","fechaAccion":""}],"metas":[{"plazo":"corto|mediano|largo","texto":""}],"tiempo":[{"categoria":"Visitas a cliente|Cotizaciones|Llamadas y seguimiento|Traslados|Administrativo|Capacitación","minutos":0,"cliente":"","fecha":"AAAA-MM-DD"}]}. Usa "" cuando un campo no aplique y listas vacías cuando no haya elementos. Interpreta fechas y horas relativas respecto a hoy. No inventes información que el usuario no dijo.`;
  const rsp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": clave, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 1200, system: sistema, messages: [{ role: "user", content: texto }] }),
  });
  const j = await rsp.json();
  if (!rsp.ok) throw new Error((j.error && j.error.message) || "HTTP " + rsp.status);
  const t = (j.content || []).map((b) => b.text || "").join("");
  return JSON.parse(t.replace(/```json|```/g, "").trim());
};

/* ── Piezas de interfaz ───────────────────────────────────────────── */
const Sec = ({ color, children, extra }) => (
  <div className="flex items-center justify-between mt-5 mb-2">
    <div style={{ ...dsp, color: color || C.dim, letterSpacing: "0.12em" }} className="text-sm font-semibold uppercase">{children}</div>
    {extra}
  </div>
);
const Dot = ({ color, pulso }) => (
  <span className={pulso ? "inline-block rounded-full pulso" : "inline-block rounded-full"} style={{ width: 8, height: 8, background: color }} />
);
const Vacio = ({ children }) => (
  <div className="rounded-xl border border-dashed px-4 py-5 text-sm text-center" style={{ borderColor: C.borde, color: C.dim, background: C.panel }}>{children}</div>
);
const Etiqueta = ({ e }) => {
  const lleno = e.id === "facturado";
  return (
    <span className="text-xs px-2 py-0.5 rounded font-semibold uppercase" style={{ ...dsp, letterSpacing: "0.06em", color: lleno ? "#fff" : e.color, background: lleno ? e.color : "#fff", border: `1px solid ${e.color}` }}>
      {e.label}
    </span>
  );
};

/* ── Fila de tarea con editor expandible ──────────────────────────── */
function TareaFila({ t, abierta, onAbrir, onToggle, onGuardar, onEliminar, onManana, opps }) {
  const [d, setD] = useState({ titulo: t.titulo, cliente: t.cliente || "", fecha: t.fecha, horaInicio: t.horaInicio || "", horaFin: t.horaFin || "", fechaFin: t.fechaFin || "", prioridad: t.prioridad || "media", oppId: t.oppId || "", comentarios: t.comentarios || "" });
  const p = PRIOS.find((x) => x.id === (t.prioridad || "media"));
  const vencida = !t.hecha && t.fecha < hoy();
  return (
    <div className="rounded-xl border" style={{ borderColor: abierta ? C.tinta : C.borde, background: C.panel }}>
      <div className="flex items-center gap-3 px-3 py-2.5">
        <button onClick={onToggle} aria-label="Completar" className="shrink-0">
          {t.hecha ? <CheckCircle2 size={22} style={{ color: C.verde }} /> : <Circle size={22} style={{ color: vencida ? C.rojo : C.dim }} />}
        </button>
        <button className="flex-1 text-left min-w-0" onClick={onAbrir}>
          <div className={t.hecha ? "text-sm line-through" : "text-sm"} style={{ color: t.hecha ? C.dim : C.tinta }}>{t.titulo}</div>
          <div className="text-xs flex items-center gap-2 mt-0.5" style={{ color: C.dim }}>
            {t.prioridad === "alta" && <Flag size={11} style={{ color: p.color }} />}
            {t.cliente && <span className="truncate">{t.cliente}</span>}
            {t.comentarios ? <MessageSquare size={11} style={{ color: C.dim }} /> : null}
            <span style={{ ...mono, color: vencida ? C.rojo : C.dim }}>{fFecha(t.fecha)}{t.horaInicio ? ` ${t.horaInicio}` : ""}{t.horaFin ? `–${t.horaFin}` : ""}{t.fechaFin && t.fechaFin !== t.fecha ? ` → ${fFecha(t.fechaFin)}` : ""}</span>
          </div>
        </button>
        {!t.hecha && <button onClick={onManana} className="text-xs px-2 py-1 rounded-lg border shrink-0" style={{ borderColor: C.borde, color: C.dim }}>→ mañana</button>}
      </div>
      {abierta && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t" style={{ borderColor: C.borde }}>
          <input value={d.titulo} onChange={(e) => setD({ ...d, titulo: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm" style={inp} />
          <div className="grid grid-cols-2 gap-2">
            <input value={d.cliente} onChange={(e) => setD({ ...d, cliente: e.target.value })} placeholder="Cliente" className="rounded-lg px-3 py-2 text-sm" style={inp} />
            <input type="date" value={d.fecha} onChange={(e) => setD({ ...d, fecha: e.target.value })} className="rounded-lg px-3 py-2 text-sm" style={inp} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><div className="text-xs mb-1" style={{ color: C.dim }}>Hora inicio</div>
              <input type="time" value={d.horaInicio} onChange={(e) => setD({ ...d, horaInicio: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm" style={inp} /></div>
            <div><div className="text-xs mb-1" style={{ color: C.dim }}>Hora fin</div>
              <input type="time" value={d.horaFin} onChange={(e) => setD({ ...d, horaFin: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm" style={inp} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><div className="text-xs mb-1" style={{ color: C.dim }}>Fecha fin (opcional)</div>
              <input type="date" value={d.fechaFin} onChange={(e) => setD({ ...d, fechaFin: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm" style={inp} /></div>
            <div className="flex items-end gap-1.5">
              <button onClick={() => abrirGCal({ titulo: d.titulo, fecha: d.fecha, horaInicio: d.horaInicio, fechaFin: d.fechaFin, horaFin: d.horaFin, detalles: d.cliente ? `Cliente: ${d.cliente}` : "" })}
                className="flex-1 py-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5" style={{ borderColor: C.azul, background: "#fff", color: C.azul }}>
                <CalendarPlus size={14} /> Agendar
              </button>
              <button onClick={() => compartirTexto("Pendiente", textoTarea(d))} aria-label="Compartir a Google Tasks o Keep"
                className="px-2.5 py-2 rounded-lg border" style={{ borderColor: C.borde, background: "#fff", color: C.tinta }}>
                <Share2 size={14} />
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            {PRIOS.map((x) => (
              <button key={x.id} onClick={() => setD({ ...d, prioridad: x.id })} className="flex-1 text-xs py-1.5 rounded-lg border font-semibold"
                style={{ borderColor: d.prioridad === x.id ? x.color : C.borde, color: d.prioridad === x.id ? x.color : C.dim, background: d.prioridad === x.id ? "#fff" : "transparent" }}>
                {x.label}
              </button>
            ))}
          </div>
          <div>
            <div className="text-xs mb-1 flex items-center gap-1" style={{ color: C.dim }}><MessageSquare size={11} /> Comentarios</div>
            <textarea value={d.comentarios} onChange={(e) => setD({ ...d, comentarios: e.target.value })} rows={2} placeholder="Acuerdos, qué resolví, siguiente detalle…" className="w-full rounded-lg px-3 py-2 text-sm" style={inp} />
          </div>
          {opps.length > 0 && (
            <select value={d.oppId} onChange={(e) => setD({ ...d, oppId: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm" style={inp}>
              <option value="">Sin oportunidad ligada</option>
              {opps.map((o) => <option key={o.id} value={o.id}>{o.cliente} — {o.titulo || etapa(o.etapa).label}</option>)}
            </select>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={() => onGuardar(d)} className="flex-1 py-2 rounded-lg text-sm font-semibold" style={{ background: C.tinta, color: "#fff" }}>Guardar</button>
            <button onClick={onEliminar} className="px-3 rounded-lg border" style={{ borderColor: C.borde, color: C.rojo }}><Trash2 size={16} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Editor de oportunidad ────────────────────────────────────────── */
const SYNC_TXT = {
  local: "Sin cuenta · datos solo en este dispositivo",
  sincronizando: "Sincronizando…",
  sincronizado: "Sincronizado con la nube",
  offline: "Sin conexión · se sincroniza al volver",
  error: "No se pudo sincronizar · reintenta",
};
const SYNC_COL = { local: "#8FA0B3", sincronizando: "#DE9B10", sincronizado: "#2F9467", offline: "#DE9B10", error: "#C94848" };

function CuentaSheet({ sesion, sync, onSalir, onCerrar }) {
  const [modo, setModo] = useState("entrar");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState("");
  const [cargando, setCargando] = useState(false);
  const enviar = async () => {
    if (!email.trim() || !pass) { setMsg("Escribe tu correo y contraseña."); return; }
    setCargando(true); setMsg("");
    const r = modo === "entrar" ? await entrar(email, pass) : await registrar(email, pass);
    setCargando(false);
    setMsg(r.ok ? (r.msg || "") : r.msg);
    if (r.ok && r.sesion === false) setModo("entrar");
  };
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(20,28,38,0.55)" }} onClick={onCerrar}>
      <div className="rounded-t-2xl max-h-full overflow-y-auto w-full max-w-xl mx-auto" style={{ background: C.fondo }} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b" style={{ background: C.bezel, borderColor: C.bezel2 }}>
          <span style={{ ...dsp, letterSpacing: "0.12em" }} className="uppercase font-bold flex items-center gap-2"><Cloud size={16} style={{ color: C.ambar }} /><span style={{ color: "#fff" }}>Cuenta y sincronización</span></span>
          <button onClick={onCerrar}><X size={20} style={{ color: "#8FA0B3" }} /></button>
        </div>
        <div className="p-4 pb-8 space-y-3">
          <div className="rounded-xl border p-3 flex items-center gap-2" style={{ borderColor: C.borde, background: C.panel }}>
            {sync === "sincronizado" ? <Cloud size={18} style={{ color: SYNC_COL[sync] }} /> : sync === "local" ? <CloudOff size={18} style={{ color: SYNC_COL[sync] }} /> : <Cloud size={18} style={{ color: SYNC_COL[sync] }} />}
            <div className="text-sm" style={{ color: C.tinta }}>{SYNC_TXT[sync]}</div>
          </div>

          {sesion ? (
            <div className="space-y-3">
              <div className="rounded-xl border p-3" style={{ borderColor: C.borde }}>
                <div className="text-xs uppercase font-semibold" style={{ ...dsp, color: C.dim, letterSpacing: "0.08em" }}>Sesión iniciada</div>
                <div className="text-sm font-semibold mt-0.5" style={{ color: C.tinta }}>{sesion.user.email}</div>
              </div>
              <div className="text-xs" style={{ color: C.dim }}>Tus datos se guardan en tu dispositivo y en la nube. Al entrar con este mismo correo en otro dispositivo, verás la misma información.</div>
              <button onClick={onSalir} className="w-full py-3 rounded-xl border font-semibold flex items-center justify-center gap-2" style={{ borderColor: C.borde, color: C.rojo }}><LogOut size={16} /> Cerrar sesión</button>
              <div className="text-xs" style={{ color: C.dim }}>Al cerrar sesión, tus datos siguen en este dispositivo, pero se dejan de sincronizar hasta que vuelvas a entrar.</div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: C.borde }}>
                {[["entrar", "Iniciar sesión"], ["registrar", "Crear cuenta"]].map(([id, lb]) => (
                  <button key={id} onClick={() => { setModo(id); setMsg(""); }} className="flex-1 py-2 text-sm font-semibold" style={{ background: modo === id ? C.tinta : "#fff", color: modo === id ? "#fff" : C.dim }}>{lb}</button>
                ))}
              </div>
              <input type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo" className="w-full rounded-lg px-3 py-2.5 text-sm" style={inp} />
              <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Contraseña (mínimo 6 caracteres)" className="w-full rounded-lg px-3 py-2.5 text-sm" style={inp} />
              {msg ? <div className="text-xs" style={{ color: msg.includes("creada") ? "#2F9467" : C.rojo }}>{msg}</div> : null}
              <button onClick={enviar} disabled={cargando} className="w-full py-3 rounded-xl font-semibold" style={{ background: C.ambar, color: "#fff", opacity: cargando ? 0.6 : 1 }}>{cargando ? "Un momento…" : modo === "entrar" ? "Entrar" : "Crear cuenta y entrar"}</button>
              <div className="text-xs" style={{ color: C.dim }}>Consejo: la primera vez, entra en el dispositivo que ya tiene tus datos; esa siembra la nube. Antes de todo, exporta un respaldo en Cierre por seguridad.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VisitaEditor({ visita, opps, onGuardar, onEliminar, onCheckin, onCerrar }) {
  const nueva = !visita.id;
  const [d, setD] = useState({
    fecha: visita.fecha || hoy(), hora: visita.hora || "", fechaFin: visita.fechaFin || "", horaFin: visita.horaFin || "", cliente: visita.cliente || "",
    oppId: visita.oppId || "", notas: visita.notas || "", resultado: visita.resultado || "pendiente",
    checkin: visita.checkin || null,
  });
  const oppSel = opps.find((o) => o.id === d.oppId);
  const cliente = d.cliente || (oppSel ? oppSel.cliente : "");
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(20,28,38,0.55)" }} onClick={onCerrar}>
      <div className="rounded-t-2xl max-h-full overflow-y-auto w-full max-w-xl mx-auto" style={{ background: C.fondo }} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b" style={{ background: C.bezel, borderColor: C.bezel2 }}>
          <span style={{ ...dsp, letterSpacing: "0.12em" }} className="uppercase font-bold flex items-center gap-2"><MapPin size={16} style={{ color: C.ambar }} /><span style={{ color: "#fff" }}>{nueva ? "Nueva visita" : "Visita"}</span></span>
          <button onClick={onCerrar}><X size={20} style={{ color: "#8FA0B3" }} /></button>
        </div>
        <div className="p-4 space-y-3 pb-8">
          {opps.length > 0 ? (
            <select value={d.oppId} onChange={(e) => setD({ ...d, oppId: e.target.value })} className="w-full rounded-lg px-3 py-2.5 text-sm" style={inp}>
              <option value="">Visita suelta (sin oportunidad ligada)</option>
              {opps.map((o) => <option key={o.id} value={o.id}>{o.cliente}{o.titulo ? " — " + o.titulo : ""}</option>)}
            </select>
          ) : null}
          <input value={d.cliente} onChange={(e) => setD({ ...d, cliente: e.target.value })} placeholder={oppSel ? oppSel.cliente + " (de la oportunidad)" : "Cliente *"} className="w-full rounded-lg px-3 py-2.5 text-sm" style={inp} />
          <div className="grid grid-cols-2 gap-2">
            <div><div className="text-xs mb-1" style={{ color: C.dim }}>Fecha de inicio</div>
              <input type="date" value={d.fecha} onChange={(e) => setD({ ...d, fecha: e.target.value })} className="w-full rounded-lg px-3 py-2.5 text-sm" style={inp} /></div>
            <div><div className="text-xs mb-1" style={{ color: C.dim }}>Hora de inicio</div>
              <input type="time" value={d.hora} onChange={(e) => setD({ ...d, hora: e.target.value })} className="w-full rounded-lg px-3 py-2.5 text-sm" style={inp} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><div className="text-xs mb-1" style={{ color: C.dim }}>Fecha de término</div>
              <input type="date" value={d.fechaFin} onChange={(e) => setD({ ...d, fechaFin: e.target.value })} className="w-full rounded-lg px-3 py-2.5 text-sm" style={inp} /></div>
            <div><div className="text-xs mb-1" style={{ color: C.dim }}>Hora de término</div>
              <input type="time" value={d.horaFin} onChange={(e) => setD({ ...d, horaFin: e.target.value })} className="w-full rounded-lg px-3 py-2.5 text-sm" style={inp} /></div>
          </div>
          {(cliente || "").trim() && d.fecha ? (
            <button onClick={() => abrirGCal({ titulo: `Visita: ${cliente}`, fecha: d.fecha, horaInicio: d.hora, fechaFin: d.fechaFin, horaFin: d.horaFin, detalles: `Visita comercial${oppSel ? " — " + (oppSel.titulo || oppSel.cliente) : ""}${d.notas ? "\n\n" + d.notas : ""}` })}
              className="w-full py-2.5 rounded-xl border font-semibold flex items-center justify-center gap-2" style={{ borderColor: C.azul, color: C.azul, background: "#fff" }}>
              <CalendarPlus size={16} /> Agendar en Google Calendar
            </button>
          ) : null}

          <div className="rounded-xl border p-3" style={{ borderColor: d.checkin ? C.verde : C.ambar, background: d.checkin ? C.verdeBg : C.ambarBg }}>
            {d.checkin ? (
              <div>
                <div className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: "#1F7A55" }}><Check size={15} /> Check-in registrado</div>
                <div className="text-xs mt-1" style={{ ...mono, color: C.tinta }}>{new Date(d.checkin.hora).toLocaleString("es-MX", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })} · precisión ±{d.checkin.precision} m</div>
                <div className="flex gap-2 mt-2">
                  <a href={`https://www.google.com/maps?q=${d.checkin.lat},${d.checkin.lng}`} target="_blank" rel="noopener" className="text-xs px-2.5 py-1.5 rounded-lg border font-semibold flex items-center gap-1" style={{ borderColor: C.azul, color: C.azul, background: "#fff" }}><Navigation size={12} /> Ver en mapa</a>
                  <button onClick={() => setD({ ...d, checkin: null })} className="text-xs px-2.5 py-1.5 rounded-lg border" style={{ borderColor: C.borde, color: C.dim, background: "#fff" }}>Quitar</button>
                </div>
              </div>
            ) : (
              <button onClick={() => onCheckin((ck) => setD((x) => ({ ...x, checkin: ck })))} className="w-full py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2" style={{ background: C.ambar, color: "#fff" }}>
                <MapPin size={16} /> Check-in — Estoy aquí
              </button>
            )}
          </div>

          <div>
            <div className="text-xs mb-1.5 uppercase font-semibold" style={{ ...dsp, color: C.dim, letterSpacing: "0.1em" }}>Resultado</div>
            <div className="flex flex-wrap gap-1.5">
              {RESULTADOS.map((r) => (
                <button key={r.id} onClick={() => setD({ ...d, resultado: r.id })} className="text-xs px-2.5 py-1.5 rounded-lg border font-semibold"
                  style={{ borderColor: d.resultado === r.id ? r.color : C.borde, color: d.resultado === r.id ? r.color : C.dim, background: d.resultado === r.id ? "#fff" : "transparent" }}>{r.label}</button>
              ))}
            </div>
          </div>

          <textarea value={d.notas} onChange={(e) => setD({ ...d, notas: e.target.value })} rows={3} placeholder="Notas de la visita, acuerdos, siguientes pasos…" className="w-full rounded-lg px-3 py-2.5 text-sm" style={inp} />


          <div className="flex gap-2 pt-1">
            <button onClick={() => (cliente || "").trim() && onGuardar({ ...visita, ...d, cliente, foto: undefined })} className="flex-1 py-3 rounded-xl font-semibold" style={{ background: (cliente || "").trim() ? C.tinta : C.borde, color: "#fff" }}>{nueva ? "Guardar visita" : "Guardar cambios"}</button>
            {!nueva ? <button onClick={onEliminar} className="px-4 rounded-xl border" style={{ borderColor: C.borde, color: C.rojo }}><Trash2 size={18} /></button> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function VisitasSheet({ visitas, opps, onNueva, onEditar, onCheckin, onCerrar }) {
  const H = hoy();
  const hoyV = visitas.filter((v) => v.fecha === H).sort((a, b) => (a.hora || "99:99").localeCompare(b.hora || "99:99"));
  const otras = visitas.filter((v) => v.fecha !== H).sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "") || (b.hora || "").localeCompare(a.hora || ""));
  const Tarjeta = ({ v, hoy: esHoy }) => {
    const r = resultadoDe(v.resultado);
    return (
      <div className="rounded-xl border p-3" style={{ borderColor: v.checkin ? C.verde : (esHoy ? C.ambar : C.borde), background: C.panel }}>
        <button className="w-full text-left" onClick={() => onEditar(v)}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{v.cliente}</div>
              <div className="text-xs" style={{ ...mono, color: C.dim }}>{fFecha(v.fecha)}{v.hora ? ` · ${v.hora}` : ""}{v.horaFin ? `–${v.horaFin}` : ""}</div>
            </div>
            <span className="text-xs px-1.5 py-0.5 rounded border font-semibold shrink-0" style={{ ...dsp, letterSpacing: "0.04em", color: r.color, borderColor: r.color }}>{r.label}</span>
          </div>
          {v.checkin ? (
            <div className="text-xs mt-1.5 flex items-center gap-1" style={{ color: "#1F7A55" }}><Check size={12} /> Llegaste a las {new Date(v.checkin.hora).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })} · ±{v.checkin.precision} m</div>
          ) : null}
        </button>
        {esHoy && !v.checkin ? (
          <button onClick={() => onCheckin(v.id)} className="w-full mt-2.5 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2" style={{ background: C.ambar, color: "#fff" }}>
            <MapPin size={16} /> Check-in — Estoy aquí
          </button>
        ) : null}
        {v.checkin ? (
          <a href={`https://www.google.com/maps?q=${v.checkin.lat},${v.checkin.lng}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs mt-2 px-2.5 py-1.5 rounded-lg border font-semibold" style={{ borderColor: C.azul, color: C.azul }}><Navigation size={12} /> Ver en mapa</a>
        ) : null}
      </div>
    );
  };
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(20,28,38,0.55)" }} onClick={onCerrar}>
      <div className="rounded-t-2xl max-h-full overflow-y-auto w-full max-w-xl mx-auto" style={{ background: C.fondo }} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b" style={{ background: C.bezel, borderColor: C.bezel2 }}>
          <span style={{ ...dsp, letterSpacing: "0.14em" }} className="uppercase font-bold flex items-center gap-2"><MapPin size={16} style={{ color: C.ambar }} /><span style={{ color: "#fff" }}>Visitas</span></span>
          <button onClick={onCerrar}><X size={20} style={{ color: "#8FA0B3" }} /></button>
        </div>
        <div className="p-4 pb-8 space-y-2">
          <button onClick={onNueva} className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2" style={{ background: C.tinta, color: "#fff" }}><Plus size={17} /> Programar visita</button>
          {visitas.length === 0 ? <div className="mt-2"><Vacio>Sin visitas todavía. Programa una y, al llegar con el cliente, haz check-in para dejar registrada tu ubicación y hora.</Vacio></div> : null}
          {hoyV.length > 0 ? (<>
            <Sec color={C.ambar}>Hoy · {hoyV.length}</Sec>
            <div className="space-y-2">{hoyV.map((v) => <Tarjeta key={v.id} v={v} hoy />)}</div>
          </>) : null}
          {otras.length > 0 ? (<>
            <Sec>Anteriores y próximas · {otras.length}</Sec>
            <div className="space-y-2">{otras.map((v) => <Tarjeta key={v.id} v={v} hoy={false} />)}</div>
          </>) : null}
        </div>
      </div>
    </div>
  );
}

function SeguimientoSheet({ opps, onCerrar }) {
  const [excl, setExcl] = useState({});
  const [abierto, setAbierto] = useState(null);
  const [aviso, setAviso] = useState("");
  const grupos = useMemo(() => {
    const g = {};
    opps.filter((o) => !["facturado", "perdido"].includes(o.etapa)).forEach((o) => {
      const v = (o.vendedor || "").trim() || "— Sin vendedor asignado";
      (g[v] = g[v] || []).push(o);
    });
    Object.values(g).forEach((arr) => arr.sort((a, b) => (b.monto || 0) - (a.monto || 0)));
    return g;
  }, [opps]);
  const nombres = Object.keys(grupos).sort((a, b) => (a.startsWith("—") ? 1 : b.startsWith("—") ? -1 : a.localeCompare(b)));
  const sel = (arr) => arr.filter((o) => !excl[o.id]);
  const nom = (v) => (v.startsWith("—") ? "" : v);
  const flash = (m) => { setAviso(m); setTimeout(() => setAviso(""), 1800); };
  const enviar = async (modo, v, arr) => {
    const lista = sel(arr); if (!lista.length) { flash("Selecciona al menos una."); return; }
    const texto = mensajeEstatus(nom(v), lista);
    if (modo === "wa") abrirWhatsApp(texto);
    else if (modo === "share") { const r = await enviarTexto(texto); if (r === "copy") flash("Copiado al portapapeles"); }
    else { if (await copiarTexto(texto)) flash("Copiado al portapapeles"); }
  };
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(20,20,25,0.55)" }} onClick={onCerrar}>
      <div className="rounded-t-2xl max-h-full overflow-y-auto w-full max-w-xl mx-auto" style={{ background: C.fondo }} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b" style={{ background: C.bezel, borderColor: C.bezel2 }}>
          <span style={{ ...dsp, letterSpacing: "0.12em" }} className="uppercase font-bold flex items-center gap-2"><Send size={16} style={{ color: C.ambar }} /><span style={{ color: "#fff" }}>Seguimiento a vendedores</span></span>
          <button onClick={onCerrar}><X size={20} style={{ color: "#8FA0B3" }} /></button>
        </div>
        <div className="p-4 pb-8 space-y-3">
          <div className="text-xs" style={{ color: C.dim }}>Pide a cada vendedor el estatus de sus oportunidades en curso. Elige cuáles incluir y envía por WhatsApp o compártelo; el mensaje va formateado con un renglón «Estatus» para que respondan fácil.</div>
          {nombres.length === 0 ? <Vacio>No hay oportunidades en curso. Cuando tengas oportunidades activas con vendedor asignado, aparecerán aquí agrupadas.</Vacio> : null}
          {nombres.map((v) => {
            const arr = grupos[v]; const n = sel(arr).length;
            const prev = mensajeEstatus(nom(v), sel(arr));
            return (
              <div key={v} className="rounded-xl border" style={{ borderColor: C.borde, background: C.panel }}>
                <div className="px-3 pt-3 pb-2 flex items-center justify-between">
                  <div className="font-semibold text-sm flex items-center gap-1.5" style={{ color: v.startsWith("—") ? C.dim : C.tinta }}><User size={13} style={{ color: C.dim }} />{v.startsWith("—") ? "Sin vendedor asignado" : v}</div>
                  <span className="text-xs" style={{ ...mono, color: C.dim }}>{n} de {arr.length}</span>
                </div>
                <div className="px-3 pb-2 space-y-1">
                  {arr.map((o) => (
                    <label key={o.id} className="flex items-start gap-2 py-1 cursor-pointer">
                      <input type="checkbox" checked={!excl[o.id]} onChange={() => setExcl((x) => ({ ...x, [o.id]: !x[o.id] }))} className="mt-0.5" style={{ accentColor: C.ambar }} />
                      <span className="text-xs leading-snug" style={{ color: C.tinta }}>
                        <span className="font-semibold">{o.cliente}</span>{o.titulo ? ` — ${o.titulo}` : ""}
                        <span style={{ ...mono, color: C.dim }}> · {montoTexto(o)} · {etapa(o.etapa).label}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <button onClick={() => setAbierto(abierto === v ? null : v)} className="px-3 pb-1 text-xs font-semibold flex items-center gap-1" style={{ color: C.azul }}>
                  <ChevronDown size={13} style={{ transform: abierto === v ? "rotate(180deg)" : "none" }} /> {abierto === v ? "Ocultar mensaje" : "Ver mensaje"}
                </button>
                {abierto === v ? <pre className="mx-3 mb-2 p-2 rounded-lg text-xs whitespace-pre-wrap" style={{ ...mono, background: "#fff", border: `1px solid ${C.borde}`, color: C.tinta }}>{prev || "(sin oportunidades seleccionadas)"}</pre> : null}
                <div className="grid grid-cols-3 gap-2 p-3 pt-1">
                  <button onClick={() => enviar("share", v, arr)} className="py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1" style={{ background: C.ambar, color: "#fff" }}><Share2 size={13} /> Compartir</button>
                  <button onClick={() => enviar("wa", v, arr)} className="py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1" style={{ background: "#25D366", color: "#0B3D24" }}><MessageSquare size={13} /> WhatsApp</button>
                  <button onClick={() => enviar("copy", v, arr)} className="py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border" style={{ borderColor: C.borde, color: C.tinta }}><Copy size={13} /> Copiar</button>
                </div>
              </div>
            );
          })}
          {aviso ? <div className="fixed left-1/2 -translate-x-1/2 bottom-6 px-3 py-2 rounded-lg text-xs font-semibold" style={{ background: C.bezel, color: "#fff" }}>{aviso}</div> : null}
        </div>
      </div>
    </div>
  );
}

function OppEditor({ opp, onGuardar, onEliminar, onCerrar, tc, clientes }) {
  const nueva = !opp.id;
  const [d, setD] = useState({
    cliente: opp.cliente || "", clienteId: opp.clienteId || "", titulo: opp.titulo || "", etapa: opp.etapa || "visita",
    monto: opp.moneda === "USD" && opp.montoOrig != null ? opp.montoOrig : (opp.monto ?? ""),
    moneda: opp.moneda || "MXN", marca: opp.marca || "", plaza: opp.plaza || "", vendedor: opp.vendedor || "",
    proximaAccion: opp.proximaAccion || "", fechaAccion: opp.fechaAccion || "", notas: opp.notas || "",
    numCotizacion: opp.numCotizacion || "", ocCliente: opp.ocCliente || "",
    numPedido: opp.numPedido || "", numFactura: opp.numFactura || "", margen: opp.margen ?? "",
    fechaCotizacion: opp.fechaCotizacion || "", fechaOC: opp.fechaOC || "", fechaPedido: opp.fechaPedido || "", fechaFactura: opp.fechaFactura || "",
  });
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(20,28,38,0.55)" }} onClick={onCerrar}>
      <div className="rounded-t-2xl max-h-full overflow-y-auto w-full max-w-xl mx-auto" style={{ background: C.fondo }} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b" style={{ background: C.fondo, borderColor: C.borde }}>
          <div style={{ ...dsp, letterSpacing: "0.1em" }} className="uppercase font-semibold" >{nueva ? "Nueva oportunidad" : "Editar oportunidad"}</div>
          <button onClick={onCerrar}><X size={20} style={{ color: C.dim }} /></button>
        </div>
        <div className="p-4 space-y-3 pb-8">
          <div>
            <input value={d.cliente} onChange={(e) => setD({ ...d, cliente: e.target.value, clienteId: "" })} placeholder="Cliente *" className="w-full rounded-lg px-3 py-2.5 text-sm" style={inp} />
            {d.cliente.trim() && !d.clienteId ? (() => {
              const ms = (clientes || []).filter((c) => (c.nombre || "").toLowerCase().includes(d.cliente.trim().toLowerCase())).slice(0, 5);
              return ms.length ? (
                <div className="mt-1 space-y-1">
                  {ms.map((c) => (
                    <button key={c.id} onClick={() => setD({ ...d, cliente: c.nombre, clienteId: c.id })} className="w-full text-left text-xs px-2 py-1.5 rounded-lg border flex items-center gap-1.5" style={{ borderColor: C.borde, background: "#fff", color: C.tinta }}>
                      <Building2 size={12} style={{ color: C.azul }} /> Vincular a: {c.nombre}
                    </button>
                  ))}
                </div>
              ) : null;
            })() : null}
            {d.clienteId ? (
              <div className="mt-1 text-xs flex items-center gap-1.5" style={{ color: C.verde }}>
                <Check size={12} /> Vinculado a cliente
                <button onClick={() => setD({ ...d, clienteId: "" })} className="underline" style={{ color: C.dim }}>desvincular</button>
              </div>
            ) : null}
          </div>
          <input value={d.titulo} onChange={(e) => setD({ ...d, titulo: e.target.value })} placeholder="Proyecto o descripción" className="w-full rounded-lg px-3 py-2.5 text-sm" style={inp} />
          <div>
            <div className="text-xs mb-1.5 uppercase font-semibold" style={{ ...dsp, color: C.dim, letterSpacing: "0.1em" }}>Etapa</div>
            <div className="flex flex-wrap gap-1.5">
              {ETAPAS.map((e) => (
                <button key={e.id} onClick={() => setD({ ...d, etapa: e.id })} className="text-xs px-2.5 py-1.5 rounded-lg border font-semibold"
                  style={{ borderColor: d.etapa === e.id ? e.color : C.borde, color: d.etapa === e.id ? (e.id === "facturado" ? "#fff" : e.color) : C.dim, background: d.etapa === e.id ? (e.id === "facturado" ? e.color : "#fff") : "transparent" }}>
                  {e.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs" style={{ color: C.dim }}>Monto{d.moneda === "USD" ? " en dólares" : " en pesos"}</div>
              <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: C.borde }}>
                {["MXN", "USD"].map((m) => (
                  <button key={m} onClick={() => {
                    if (d.moneda === m) return;
                    let nv = d.monto;
                    if (d.monto !== "" && tc > 0) nv = m === "USD" ? Math.round((Number(d.monto) / tc) * 100) / 100 : Math.round(Number(d.monto) * tc);
                    setD({ ...d, moneda: m, monto: nv });
                  }} className="text-xs px-3 py-1 font-semibold" style={{ background: d.moneda === m ? C.tinta : "#fff", color: d.moneda === m ? "#fff" : C.dim }}>{m}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" inputMode="decimal" value={d.monto} onChange={(e) => setD({ ...d, monto: e.target.value })} placeholder={d.moneda === "USD" ? "Monto USD" : "Monto MXN"} className="rounded-lg px-3 py-2.5 text-sm" style={{ ...inp, ...mono }} />
              <input value={d.marca} onChange={(e) => setD({ ...d, marca: e.target.value })} placeholder="Marca (Siemens…)" className="rounded-lg px-3 py-2.5 text-sm" style={inp} />
            </div>
            {d.moneda === "USD" ? (
              <div className="text-xs mt-1" style={{ color: tc > 0 ? C.dim : C.rojo }}>
                {tc > 0 ? `≈ ${fMXN((Number(d.monto) || 0) * tc)} MXN (TC ${tc}). Se guarda en pesos.` : "Define el tipo de cambio en la pantalla de inicio para convertir."}
              </div>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={d.plaza} onChange={(e) => setD({ ...d, plaza: e.target.value })} placeholder="Plaza / sucursal (León…)" className="rounded-lg px-3 py-2.5 text-sm" style={inp} />
            <div className="relative">
              <input type="number" inputMode="decimal" value={d.margen} onChange={(e) => setD({ ...d, margen: e.target.value })} placeholder="Margen" className="w-full rounded-lg px-3 py-2.5 text-sm" style={{ ...inp, ...mono }} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ ...mono, color: C.dim }}>%</span>
            </div>
          </div>
          <input value={d.vendedor} onChange={(e) => setD({ ...d, vendedor: e.target.value })} placeholder="Vendedor (a quién enviar la oportunidad)" className="w-full rounded-lg px-3 py-2.5 text-sm" style={inp} />
          {["cotizado", "porcerrar", "oc", "pedido", "facturado"].includes(d.etapa) ? (
            <div className="grid grid-cols-2 gap-2">
              <div><div className="text-xs mb-1" style={{ color: C.dim }}>N° de cotización</div>
                <input value={d.numCotizacion} onChange={(e) => setD({ ...d, numCotizacion: e.target.value })} className="w-full rounded-lg px-3 py-2.5 text-sm" style={{ ...inp, ...mono }} /></div>
              <div><div className="text-xs mb-1" style={{ color: C.dim }}>Fecha de cotización</div>
                <input type="date" value={d.fechaCotizacion} onChange={(e) => setD({ ...d, fechaCotizacion: e.target.value })} className="w-full rounded-lg px-3 py-2.5 text-sm" style={inp} /></div>
            </div>
          ) : null}
          {["oc", "pedido", "facturado"].includes(d.etapa) ? (
            <div className="grid grid-cols-2 gap-2">
              <div><div className="text-xs mb-1" style={{ color: C.dim }}>OC del cliente</div>
                <input value={d.ocCliente} onChange={(e) => setD({ ...d, ocCliente: e.target.value })} className="w-full rounded-lg px-3 py-2.5 text-sm" style={{ ...inp, ...mono }} /></div>
              <div><div className="text-xs mb-1" style={{ color: C.dim }}>Fecha de OC</div>
                <input type="date" value={d.fechaOC} onChange={(e) => setD({ ...d, fechaOC: e.target.value })} className="w-full rounded-lg px-3 py-2.5 text-sm" style={inp} /></div>
            </div>
          ) : null}
          {["pedido", "facturado"].includes(d.etapa) ? (<>
            <div className="grid grid-cols-2 gap-2">
              <div><div className="text-xs mb-1" style={{ color: C.dim }}>N° de pedido</div>
                <input value={d.numPedido} onChange={(e) => setD({ ...d, numPedido: e.target.value })} className="w-full rounded-lg px-3 py-2.5 text-sm" style={{ ...inp, ...mono }} /></div>
              <div><div className="text-xs mb-1" style={{ color: C.dim }}>Fecha de pedido</div>
                <input type="date" value={d.fechaPedido} onChange={(e) => setD({ ...d, fechaPedido: e.target.value })} className="w-full rounded-lg px-3 py-2.5 text-sm" style={inp} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><div className="text-xs mb-1" style={{ color: C.dim }}>N° de factura</div>
                <input value={d.numFactura} onChange={(e) => setD({ ...d, numFactura: e.target.value })} className="w-full rounded-lg px-3 py-2.5 text-sm" style={{ ...inp, ...mono }} /></div>
              <div><div className="text-xs mb-1" style={{ color: C.dim }}>Fecha de factura</div>
                <input type="date" value={d.fechaFactura} onChange={(e) => setD({ ...d, fechaFactura: e.target.value })} className="w-full rounded-lg px-3 py-2.5 text-sm" style={inp} /></div>
            </div>
          </>) : null}
          <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: C.ambar, background: C.ambarBg }}>
            <div className="text-xs uppercase font-semibold flex items-center gap-1.5" style={{ ...dsp, color: C.ambar, letterSpacing: "0.1em" }}><Zap size={12} /> Próxima acción</div>
            <input value={d.proximaAccion} onChange={(e) => setD({ ...d, proximaAccion: e.target.value })} placeholder="Ej. Llamar para cerrar cotización" className="w-full rounded-lg px-3 py-2 text-sm" style={inp} />
            <input type="date" value={d.fechaAccion} onChange={(e) => setD({ ...d, fechaAccion: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm" style={inp} />
            {d.proximaAccion && d.fechaAccion ? (
              <button onClick={() => abrirGCal({ titulo: `${d.cliente}: ${d.proximaAccion}`, fecha: d.fechaAccion, detalles: d.titulo || "Próxima acción de pipeline" })}
                className="w-full py-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5" style={{ borderColor: C.ambar, background: "#fff", color: C.tinta }}>
                <CalendarPlus size={14} /> Agendar en Google Calendar
              </button>
            ) : null}
          </div>
          <textarea value={d.notas} onChange={(e) => setD({ ...d, notas: e.target.value })} placeholder="Notas y acuerdos de visita" rows={3} className="w-full rounded-lg px-3 py-2.5 text-sm" style={inp} />
          {!nueva && d.cliente.trim() ? (
            <button onClick={() => enviarTexto(mensajeEstatus((d.vendedor || "").trim(), [{ ...opp, ...d, monto: d.moneda === "USD" && d.monto ? Math.round(Number(d.monto) * (tc || 0)) : (d.monto === "" ? null : Number(d.monto)) }]))} className="w-full py-2.5 mb-2 rounded-xl border font-semibold flex items-center justify-center gap-2" style={{ borderColor: C.azul, color: "#2C5A8F", background: C.azulBg }}>
              <Send size={15} /> Pedir estatus al vendedor
            </button>
          ) : null}
          <div className="flex gap-2 pt-1">
            <button onClick={() => d.cliente.trim() && onGuardar({ ...opp, ...d, monto: d.monto === "" ? null : (d.moneda === "USD" ? Math.round(Number(d.monto) * (tc || 0)) : Number(d.monto)), moneda: d.moneda, montoOrig: d.moneda === "USD" && d.monto !== "" ? Number(d.monto) : null, tcCaptura: d.moneda === "USD" ? (tc || null) : null, margen: d.margen === "" ? null : Number(d.margen) })}
              className="flex-1 py-3 rounded-xl font-semibold" style={{ background: d.cliente.trim() ? C.tinta : C.borde, color: "#fff" }}>
              {nueva ? "Crear oportunidad" : "Guardar cambios"}
            </button>
            {!nueva && <button onClick={onEliminar} className="px-4 rounded-xl border" style={{ borderColor: C.borde, color: C.rojo }}><Trash2 size={18} /></button>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Editor de Cliente (con sus contactos) ────────────────────────── */
function ClienteEditor({ cliente, contactos, actividades, opps, onGuardar, onEliminar, onCerrar }) {
  const nuevo = !cliente.id;
  const [d, setD] = useState({
    nombre: cliente.nombre || "", tipo: cliente.tipo || "", estado: cliente.estado || "prospecto",
    plaza: cliente.plaza || "", giro: cliente.giro || "", rfc: cliente.rfc || "",
    direccion: cliente.direccion || "", notas: cliente.notas || "",
  });
  const [cts, setCts] = useState(() => (contactos || []).filter((c) => c.clienteId === cliente.id).map((c) => ({ ...c })));
  const [acts, setActs] = useState(() => (actividades || []).filter((a) => a.clienteId === cliente.id).sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "")).map((a) => ({ ...a })));
  const [na, setNa] = useState({ tipo: "llamada", fecha: hoy(), nota: "" });
  const relacionadas = (opps || []).filter((o) => (cliente.id && o.clienteId === cliente.id) || (!o.clienteId && cliente.nombre && (o.cliente || "").trim().toLowerCase() === (cliente.nombre || "").trim().toLowerCase()));
  const addContacto = () => setCts([...cts, { id: uid(), nombre: "", puesto: "", telefono: "", correo: "", whatsapp: "", rolDecision: "" }]);
  const updContacto = (i, campos) => setCts(cts.map((c, j) => j === i ? { ...c, ...campos } : c));
  const delContacto = (i) => setCts(cts.filter((_, j) => j !== i));
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(20,28,38,0.55)" }} onClick={onCerrar}>
      <div className="rounded-t-2xl max-h-full overflow-y-auto w-full max-w-xl mx-auto" style={{ background: C.fondo }} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b" style={{ background: C.fondo, borderColor: C.borde }}>
          <div style={{ ...dsp, letterSpacing: "0.1em" }} className="uppercase font-semibold">{nuevo ? "Nuevo cliente" : "Editar cliente"}</div>
          <button onClick={onCerrar}><X size={20} style={{ color: C.dim }} /></button>
        </div>
        <div className="p-4 space-y-3 pb-8">
          <input value={d.nombre} onChange={(e) => setD({ ...d, nombre: e.target.value })} placeholder="Nombre / razón social *" className="w-full rounded-lg px-3 py-2.5 text-sm" style={inp} />
          <div>
            <div className="text-xs mb-1.5 uppercase font-semibold" style={{ ...dsp, color: C.dim, letterSpacing: "0.1em" }}>Tipo</div>
            <div className="flex flex-wrap gap-1.5">
              {TIPOS_CLIENTE.map((t) => (
                <button key={t.id} onClick={() => setD({ ...d, tipo: d.tipo === t.id ? "" : t.id })} className="text-xs px-2.5 py-1.5 rounded-lg border font-semibold"
                  style={{ borderColor: d.tipo === t.id ? C.tinta : C.borde, color: d.tipo === t.id ? C.tinta : C.dim, background: d.tipo === t.id ? "#fff" : "transparent" }}>{t.label}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs mb-1.5 uppercase font-semibold" style={{ ...dsp, color: C.dim, letterSpacing: "0.1em" }}>Estado de la relación</div>
            <div className="flex flex-wrap gap-1.5">
              {ESTADOS_CLIENTE.map((s) => (
                <button key={s.id} onClick={() => setD({ ...d, estado: s.id })} className="text-xs px-2.5 py-1.5 rounded-lg border font-semibold"
                  style={{ borderColor: d.estado === s.id ? s.color : C.borde, color: d.estado === s.id ? s.color : C.dim, background: d.estado === s.id ? "#fff" : "transparent" }}>{s.label}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={d.plaza} onChange={(e) => setD({ ...d, plaza: e.target.value })} placeholder="Plaza (León…)" className="rounded-lg px-3 py-2.5 text-sm" style={inp} />
            <input value={d.giro} onChange={(e) => setD({ ...d, giro: e.target.value })} placeholder="Giro (automotriz…)" className="rounded-lg px-3 py-2.5 text-sm" style={inp} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={d.rfc} onChange={(e) => setD({ ...d, rfc: e.target.value })} placeholder="RFC" className="rounded-lg px-3 py-2.5 text-sm" style={{ ...inp, ...mono }} />
            <input value={d.direccion} onChange={(e) => setD({ ...d, direccion: e.target.value })} placeholder="Dirección" className="rounded-lg px-3 py-2.5 text-sm" style={inp} />
          </div>
          <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: C.borde, background: C.panel }}>
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase font-semibold flex items-center gap-1.5" style={{ ...dsp, color: C.dim, letterSpacing: "0.1em" }}><Users size={12} /> Contactos</div>
              <button onClick={addContacto} className="text-xs px-2 py-1 rounded-lg border font-semibold flex items-center gap-1" style={{ borderColor: C.borde, color: C.tinta, background: "#fff" }}><Plus size={12} /> Agregar</button>
            </div>
            {cts.length === 0 ? <div className="text-xs" style={{ color: C.dim }}>Sin contactos. Agrega a las personas clave de esta cuenta.</div> : null}
            {cts.map((c, i) => (
              <div key={c.id} className="rounded-lg border p-2 space-y-1.5" style={{ borderColor: C.borde, background: "#fff" }}>
                <div className="flex gap-1.5">
                  <input value={c.nombre} onChange={(e) => updContacto(i, { nombre: e.target.value })} placeholder="Nombre" className="flex-1 rounded-lg px-2 py-1.5 text-sm" style={inp} />
                  <button onClick={() => delContacto(i)} className="px-2 rounded-lg border" style={{ borderColor: C.borde, color: C.rojo }}><Trash2 size={14} /></button>
                </div>
                <input value={c.puesto} onChange={(e) => updContacto(i, { puesto: e.target.value })} placeholder="Puesto" className="w-full rounded-lg px-2 py-1.5 text-sm" style={inp} />
                <div className="grid grid-cols-2 gap-1.5">
                  <input value={c.telefono} onChange={(e) => updContacto(i, { telefono: e.target.value })} placeholder="Teléfono" className="rounded-lg px-2 py-1.5 text-sm" style={{ ...inp, ...mono }} />
                  <input value={c.whatsapp} onChange={(e) => updContacto(i, { whatsapp: e.target.value })} placeholder="WhatsApp" className="rounded-lg px-2 py-1.5 text-sm" style={{ ...inp, ...mono }} />
                </div>
                <input value={c.correo} onChange={(e) => updContacto(i, { correo: e.target.value })} placeholder="Correo" className="w-full rounded-lg px-2 py-1.5 text-sm" style={inp} />
                <div className="flex flex-wrap gap-1">
                  {ROLES_DECISION.map((r) => (
                    <button key={r.id} onClick={() => updContacto(i, { rolDecision: c.rolDecision === r.id ? "" : r.id })} className="text-xs px-2 py-1 rounded border font-semibold"
                      style={{ borderColor: c.rolDecision === r.id ? C.azul : C.borde, color: c.rolDecision === r.id ? "#2C5A8F" : C.dim, background: c.rolDecision === r.id ? C.azulBg : "transparent" }}>{r.label}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {relacionadas.length > 0 ? (
            <div className="rounded-xl border p-3 space-y-1.5" style={{ borderColor: C.borde, background: C.panel }}>
              <div className="text-xs uppercase font-semibold" style={{ ...dsp, color: C.dim, letterSpacing: "0.1em" }}>Oportunidades de este cliente ({relacionadas.length})</div>
              {relacionadas.slice(0, 8).map((o) => (
                <div key={o.id} className="flex items-center justify-between text-sm gap-2">
                  <span className="truncate" style={{ color: C.tinta }}>{o.titulo || o.cliente}</span>
                  <span style={{ ...mono, color: C.dim }}>{fMXN(o.monto || 0)}</span>
                </div>
              ))}
            </div>
          ) : null}
          <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: C.borde, background: C.panel }}>
            <div className="text-xs uppercase font-semibold flex items-center gap-1.5" style={{ ...dsp, color: C.dim, letterSpacing: "0.1em" }}><CalendarDays size={12} /> Actividades / bitácora</div>
            <div className="rounded-lg border p-2 space-y-1.5" style={{ borderColor: C.borde, background: "#fff" }}>
              <div className="flex flex-wrap gap-1">
                {TIPOS_ACTIVIDAD.map((t) => (
                  <button key={t.id} onClick={() => setNa({ ...na, tipo: t.id })} className="text-xs px-2 py-1 rounded border font-semibold"
                    style={{ borderColor: na.tipo === t.id ? C.tinta : C.borde, color: na.tipo === t.id ? C.tinta : C.dim, background: na.tipo === t.id ? C.fondo : "transparent" }}>{t.label}</button>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input type="date" value={na.fecha} onChange={(e) => setNa({ ...na, fecha: e.target.value })} className="rounded-lg px-2 py-1.5 text-sm" style={{ ...inp, ...mono }} />
                <input value={na.nota} onChange={(e) => setNa({ ...na, nota: e.target.value })} placeholder="¿Qué pasó o se acordó?" className="flex-1 rounded-lg px-2 py-1.5 text-sm" style={inp} />
              </div>
              <button onClick={() => { if (na.nota.trim()) { setActs([{ id: uid(), tipo: na.tipo, fecha: na.fecha, nota: na.nota.trim() }, ...acts]); setNa({ tipo: "llamada", fecha: hoy(), nota: "" }); } }}
                className="w-full text-xs py-1.5 rounded-lg font-semibold" style={{ background: na.nota.trim() ? C.tinta : C.borde, color: "#fff" }}>Registrar actividad</button>
            </div>
            {acts.length === 0 ? <div className="text-xs" style={{ color: C.dim }}>Sin actividades. Registra cada llamada, correo o reunión para no perder el hilo.</div> : (
              <div className="space-y-1">
                {acts.map((a, i) => {
                  const t = TIPOS_ACTIVIDAD.find((x) => x.id === a.tipo) || TIPOS_ACTIVIDAD[0];
                  return (
                    <div key={a.id} className="flex items-start gap-2 text-sm py-1 border-b last:border-0" style={{ borderColor: C.borde }}>
                      <span className="text-xs px-1.5 py-0.5 rounded font-semibold whitespace-nowrap" style={{ background: C.fondo, color: C.dim }}>{t.label}</span>
                      <div className="flex-1 min-w-0">
                        <div style={{ color: C.tinta }}>{a.nota}</div>
                        <div className="text-xs" style={{ ...mono, color: C.dim }}>{a.fecha}</div>
                      </div>
                      <button onClick={() => setActs(acts.filter((_, j) => j !== i))} style={{ color: C.rojo }}><Trash2 size={13} /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <textarea value={d.notas} onChange={(e) => setD({ ...d, notas: e.target.value })} placeholder="Notas de la cuenta" rows={3} className="w-full rounded-lg px-3 py-2.5 text-sm" style={inp} />
          <div className="flex gap-2 pt-1">
            <button onClick={() => d.nombre.trim() && onGuardar({ ...cliente, ...d }, cts.filter((c) => c.nombre.trim()), acts)}
              className="flex-1 py-3 rounded-xl font-semibold" style={{ background: d.nombre.trim() ? C.tinta : C.borde, color: "#fff" }}>
              {nuevo ? "Crear cliente" : "Guardar cambios"}
            </button>
            {!nuevo && <button onClick={onEliminar} className="px-4 rounded-xl border" style={{ borderColor: C.borde, color: C.rojo }}><Trash2 size={18} /></button>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Catálogo de productos ────────────────────────────────────────── */
function ProdForm({ prod, onGuardar, onCancelar, onEliminar }) {
  const [d, setD] = useState({ codigo: prod.codigo || "", descripcion: prod.descripcion || "", marca: prod.marca || "", unidad: prod.unidad || "pza", precio: prod.precio ?? "", moneda: prod.moneda || "MXN" });
  return (
    <div className="space-y-2">
      <div style={dsp} className="uppercase text-xs font-semibold" >{prod.id ? "Editar producto" : "Nuevo producto"}</div>
      <input value={d.descripcion} onChange={(e) => setD({ ...d, descripcion: e.target.value })} placeholder="Descripción *" className="w-full rounded-lg px-3 py-2.5 text-sm" style={inp} />
      <div className="grid grid-cols-2 gap-2">
        <input value={d.codigo} onChange={(e) => setD({ ...d, codigo: e.target.value })} placeholder="Código" className="rounded-lg px-3 py-2.5 text-sm" style={{ ...inp, ...mono }} />
        <input value={d.marca} onChange={(e) => setD({ ...d, marca: e.target.value })} placeholder="Marca" className="rounded-lg px-3 py-2.5 text-sm" style={inp} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <input value={d.precio} onChange={(e) => setD({ ...d, precio: e.target.value })} placeholder="Precio" inputMode="decimal" className="rounded-lg px-3 py-2.5 text-sm" style={{ ...inp, ...mono }} />
        <select value={d.moneda} onChange={(e) => setD({ ...d, moneda: e.target.value })} className="rounded-lg px-2 py-2.5 text-sm" style={inp}><option>MXN</option><option>USD</option></select>
        <input value={d.unidad} onChange={(e) => setD({ ...d, unidad: e.target.value })} placeholder="Unidad" className="rounded-lg px-3 py-2.5 text-sm" style={inp} />
      </div>
      <div className="flex gap-2">
        <button onClick={() => d.descripcion.trim() && onGuardar({ ...prod, ...d, precio: d.precio === "" ? null : Number(d.precio) })} className="flex-1 py-2.5 rounded-xl font-semibold" style={{ background: d.descripcion.trim() ? C.tinta : C.borde, color: "#fff" }}>{prod.id ? "Guardar" : "Agregar"}</button>
        {onEliminar && <button onClick={onEliminar} className="px-4 rounded-xl border" style={{ borderColor: C.borde, color: C.rojo }}><Trash2 size={18} /></button>}
        <button onClick={onCancelar} className="px-3 rounded-xl border text-sm" style={{ borderColor: C.borde, color: C.dim }}>Cancelar</button>
      </div>
    </div>
  );
}
function CatalogoSheet({ productos, onGuardarProd, onEliminarProd, onCerrar }) {
  const [ed, setEd] = useState(null);
  const [q, setQ] = useState("");
  const lista = (productos || []).filter((p) => !q || `${p.codigo} ${p.descripcion} ${p.marca}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end" style={{ background: "rgba(20,28,38,0.55)" }} onClick={onCerrar}>
      <div className="rounded-t-2xl max-h-full overflow-y-auto w-full max-w-xl mx-auto" style={{ background: C.fondo }} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b" style={{ background: C.fondo, borderColor: C.borde }}>
          <div style={{ ...dsp, letterSpacing: "0.1em" }} className="uppercase font-semibold flex items-center gap-1.5"><Package size={16} /> Catálogo</div>
          <button onClick={onCerrar}><X size={20} style={{ color: C.dim }} /></button>
        </div>
        <div className="p-4 space-y-3 pb-8">
          {ed ? (
            <ProdForm prod={ed} onGuardar={(p) => { onGuardarProd(p); setEd(null); }} onCancelar={() => setEd(null)} onEliminar={ed.id ? () => { onEliminarProd(ed.id); setEd(null); } : null} />
          ) : (
            <>
              <button onClick={() => setEd({})} className="w-full py-2.5 rounded-xl font-semibold flex items-center justify-center gap-1.5" style={{ background: C.tinta, color: "#fff" }}><Plus size={16} /> Nuevo producto</button>
              <div className="relative">
                <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: C.dim }} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por código, descripción o marca…" className="w-full rounded-lg pl-8 pr-3 py-2 text-sm" style={inp} />
              </div>
              {lista.length === 0 ? <div className="text-sm text-center py-6" style={{ color: C.dim }}>Catálogo vacío. Agrega tus productos y marcas.</div> : (
                <div className="space-y-1.5">
                  {lista.map((p) => (
                    <button key={p.id} onClick={() => setEd(p)} className="w-full text-left rounded-xl border px-3 py-2 flex items-center gap-2" style={{ borderColor: C.borde, background: "#fff" }}>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate text-sm" style={{ color: C.tinta }}>{p.descripcion}</div>
                        <div className="text-xs truncate" style={{ color: C.dim }}>{[p.codigo, p.marca].filter(Boolean).join(" · ")}</div>
                      </div>
                      <span style={{ ...mono, color: C.tinta }} className="text-sm whitespace-nowrap">{fMXN(p.precio || 0)}{p.moneda === "USD" ? " USD" : ""}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Editor de Cotización (partidas + totales) ────────────────────── */
function CotizacionEditor({ cot, clientes, productos, folioAuto, onGuardar, onEliminar, onCerrar }) {
  const nueva = !cot.id;
  const [d, setD] = useState({
    cliente: cot.cliente || "", clienteId: cot.clienteId || "",
    folio: cot.folio || folioAuto || "", fecha: cot.fecha || hoy(),
    estado: cot.estado || "borrador", moneda: cot.moneda || "MXN",
    iva: cot.iva !== false, notas: cot.notas || "",
  });
  const [parts, setParts] = useState(() => (cot.partidas || []).map((p) => ({ ...p, id: p.id || uid() })));
  const [pickProd, setPickProd] = useState(false);
  const setP = (i, campos) => setParts(parts.map((p, j) => j === i ? { ...p, ...campos } : p));
  const delP = (i) => setParts(parts.filter((_, j) => j !== i));
  const addLibre = () => setParts([...parts, { id: uid(), descripcion: "", cantidad: "1", precio: "", descuento: "" }]);
  const addProd = (p) => { setParts([...parts, { id: uid(), descripcion: p.descripcion, codigo: p.codigo || "", cantidad: "1", precio: p.precio ?? "", descuento: "" }]); setPickProd(false); };
  const sub = parts.reduce((s, p) => s + (Number(p.cantidad) || 0) * (Number(p.precio) || 0) * (1 - (Number(p.descuento) || 0) / 100), 0);
  const iva = d.iva ? sub * 0.16 : 0;
  const total = sub + iva;
  const cur = d.moneda === "USD" ? " USD" : "";
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(20,28,38,0.55)" }} onClick={onCerrar}>
      <div className="rounded-t-2xl max-h-full overflow-y-auto w-full max-w-xl mx-auto" style={{ background: C.fondo }} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b" style={{ background: C.fondo, borderColor: C.borde }}>
          <div style={{ ...dsp, letterSpacing: "0.1em" }} className="uppercase font-semibold">{nueva ? "Nueva cotización" : "Editar cotización"}</div>
          <button onClick={onCerrar}><X size={20} style={{ color: C.dim }} /></button>
        </div>
        <div className="p-4 space-y-3 pb-8">
          <div>
            <input value={d.cliente} onChange={(e) => setD({ ...d, cliente: e.target.value, clienteId: "" })} placeholder="Cliente *" className="w-full rounded-lg px-3 py-2.5 text-sm" style={inp} />
            {d.cliente.trim() && !d.clienteId ? (() => {
              const ms = (clientes || []).filter((c) => (c.nombre || "").toLowerCase().includes(d.cliente.trim().toLowerCase())).slice(0, 5);
              return ms.length ? <div className="mt-1 space-y-1">{ms.map((c) => <button key={c.id} onClick={() => setD({ ...d, cliente: c.nombre, clienteId: c.id })} className="w-full text-left text-xs px-2 py-1.5 rounded-lg border flex items-center gap-1.5" style={{ borderColor: C.borde, background: "#fff", color: C.tinta }}><Building2 size={12} style={{ color: C.azul }} /> Vincular a: {c.nombre}</button>)}</div> : null;
            })() : null}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={d.folio} onChange={(e) => setD({ ...d, folio: e.target.value })} placeholder="Folio" className="rounded-lg px-3 py-2.5 text-sm" style={{ ...inp, ...mono }} />
            <input type="date" value={d.fecha} onChange={(e) => setD({ ...d, fecha: e.target.value })} className="rounded-lg px-3 py-2.5 text-sm" style={{ ...inp, ...mono }} />
          </div>
          <div className="flex flex-wrap gap-1.5 items-center">
            {ESTADOS_COTIZACION.map((s) => <button key={s.id} onClick={() => setD({ ...d, estado: s.id })} className="text-xs px-2.5 py-1.5 rounded-lg border font-semibold" style={{ borderColor: d.estado === s.id ? s.color : C.borde, color: d.estado === s.id ? s.color : C.dim, background: d.estado === s.id ? "#fff" : "transparent" }}>{s.label}</button>)}
            <div className="ml-auto flex rounded-lg overflow-hidden border" style={{ borderColor: C.borde }}>
              {["MXN", "USD"].map((m) => <button key={m} onClick={() => setD({ ...d, moneda: m })} className="text-xs px-2.5 py-1.5 font-semibold" style={{ background: d.moneda === m ? C.tinta : "#fff", color: d.moneda === m ? "#fff" : C.dim }}>{m}</button>)}
            </div>
          </div>
          <div className="rounded-xl border p-2 space-y-2" style={{ borderColor: C.borde, background: C.panel }}>
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase font-semibold" style={{ ...dsp, color: C.dim, letterSpacing: "0.1em" }}>Partidas</div>
              <div className="flex gap-1.5">
                <button onClick={() => setPickProd(true)} className="text-xs px-2 py-1 rounded-lg border font-semibold flex items-center gap-1" style={{ borderColor: C.borde, color: C.tinta, background: "#fff" }}><Package size={12} /> Catálogo</button>
                <button onClick={addLibre} className="text-xs px-2 py-1 rounded-lg border font-semibold flex items-center gap-1" style={{ borderColor: C.borde, color: C.tinta, background: "#fff" }}><Plus size={12} /> Línea</button>
              </div>
            </div>
            {parts.length === 0 ? <div className="text-xs" style={{ color: C.dim }}>Agrega productos del catálogo o líneas libres.</div> : parts.map((p, i) => {
              const imp = (Number(p.cantidad) || 0) * (Number(p.precio) || 0) * (1 - (Number(p.descuento) || 0) / 100);
              return (
                <div key={p.id} className="rounded-lg border p-2 space-y-1.5" style={{ borderColor: C.borde, background: "#fff" }}>
                  <div className="flex gap-1.5">
                    <input value={p.descripcion} onChange={(e) => setP(i, { descripcion: e.target.value })} placeholder="Descripción" className="flex-1 rounded-lg px-2 py-1.5 text-sm" style={inp} />
                    <button onClick={() => delP(i)} className="px-2 rounded-lg border" style={{ borderColor: C.borde, color: C.rojo }}><Trash2 size={14} /></button>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 items-center">
                    <input value={p.cantidad} onChange={(e) => setP(i, { cantidad: e.target.value })} placeholder="Cant." inputMode="decimal" className="rounded-lg px-2 py-1.5 text-sm text-center" style={{ ...inp, ...mono }} />
                    <input value={p.precio} onChange={(e) => setP(i, { precio: e.target.value })} placeholder="P.unit" inputMode="decimal" className="rounded-lg px-2 py-1.5 text-sm" style={{ ...inp, ...mono }} />
                    <input value={p.descuento} onChange={(e) => setP(i, { descuento: e.target.value })} placeholder="Desc%" inputMode="decimal" className="rounded-lg px-2 py-1.5 text-sm text-center" style={{ ...inp, ...mono }} />
                    <div className="text-sm text-right font-semibold" style={{ ...mono, color: C.tinta }}>{fMXN(imp)}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="rounded-xl border p-3 space-y-1" style={{ borderColor: C.borde, background: "#fff" }}>
            <div className="flex justify-between text-sm"><span style={{ color: C.dim }}>Subtotal</span><span style={mono}>{fMXN(sub)}{cur}</span></div>
            <div className="flex justify-between text-sm items-center">
              <button onClick={() => setD({ ...d, iva: !d.iva })} className="flex items-center gap-1.5" style={{ color: C.dim }}>
                <span className="w-4 h-4 rounded border flex items-center justify-center" style={{ borderColor: C.borde, background: d.iva ? C.tinta : "#fff" }}>{d.iva ? <Check size={11} style={{ color: "#fff" }} /> : null}</span>
                IVA 16%
              </button>
              <span style={mono}>{fMXN(iva)}{cur}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-1 border-t" style={{ borderColor: C.borde, color: C.tinta }}><span>Total</span><span style={mono}>{fMXN(total)}{cur}</span></div>
          </div>
          <textarea value={d.notas} onChange={(e) => setD({ ...d, notas: e.target.value })} placeholder="Notas / condiciones (tiempo de entrega, vigencia…)" rows={2} className="w-full rounded-lg px-3 py-2.5 text-sm" style={inp} />
          <button onClick={() => pdfCotizacion({ ...cot, ...d, partidas: parts })} className="w-full py-2.5 rounded-xl border font-semibold flex items-center justify-center gap-1.5" style={{ borderColor: C.borde, color: C.tinta, background: "#fff" }}><FileDown size={16} /> Descargar PDF</button>
          <div className="flex gap-2">
            <button onClick={() => d.cliente.trim() && onGuardar({ ...cot, ...d, partidas: parts })} className="flex-1 py-3 rounded-xl font-semibold" style={{ background: d.cliente.trim() ? C.tinta : C.borde, color: "#fff" }}>{nueva ? "Crear cotización" : "Guardar cambios"}</button>
            {!nueva && <button onClick={onEliminar} className="px-4 rounded-xl border" style={{ borderColor: C.borde, color: C.rojo }}><Trash2 size={18} /></button>}
          </div>
        </div>
      </div>
      {pickProd && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end" style={{ background: "rgba(20,28,38,0.55)" }} onClick={() => setPickProd(false)}>
          <div className="rounded-t-2xl max-h-[70vh] overflow-y-auto w-full max-w-xl mx-auto" style={{ background: C.fondo }} onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b" style={{ background: C.fondo, borderColor: C.borde }}>
              <div style={{ ...dsp, letterSpacing: "0.1em" }} className="uppercase font-semibold">Elegir del catálogo</div>
              <button onClick={() => setPickProd(false)}><X size={20} style={{ color: C.dim }} /></button>
            </div>
            <div className="p-4 space-y-1.5 pb-8">
              {(productos || []).length === 0 ? <div className="text-sm text-center py-4" style={{ color: C.dim }}>El catálogo está vacío. Llénalo desde el botón «Catálogo» en la pestaña Cotiza.</div> : (productos || []).map((p) => (
                <button key={p.id} onClick={() => addProd(p)} className="w-full text-left rounded-xl border px-3 py-2 flex items-center gap-2" style={{ borderColor: C.borde, background: "#fff" }}>
                  <div className="flex-1 min-w-0"><div className="font-semibold truncate text-sm" style={{ color: C.tinta }}>{p.descripcion}</div><div className="text-xs truncate" style={{ color: C.dim }}>{[p.codigo, p.marca].filter(Boolean).join(" · ")}</div></div>
                  <span style={{ ...mono, color: C.tinta }} className="text-sm">{fMXN(p.precio || 0)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Manual didáctico ─────────────────────────────────────────────── */
const MANUAL = [
  { id: "inicio", t: "Primeros pasos", c: [
    "Cada vez que abres la app, la pantalla de inicio te recibe con la fecha completa, tus pendientes del día —vencidos en rojo— como notificaciones, un panel con el total cotizado, y el tipo de cambio USD→MXN (edítalo a mano o toca Actualizar para traerlo automático con internet). Toca cualquiera para entrar directo, o usa Entrar al tablero.",
    "El Brida vive instalado en tu teléfono o PC y guarda todo localmente: funciona sin internet y nada viaja a servidores.",
    "Instalación: abre la dirección de la app en Chrome o Samsung Internet → menú ⋮ → Instalar aplicación.",
    "Actualizaciones: sube el nuevo index.html a tu repositorio de GitHub con el mismo nombre, cierra la app y ábrela con internet. Tus datos no se tocan.",
    "Respaldo: en Cierre → Respaldo de datos, exporta un .json de vez en cuando (y siempre antes de actualizar).",
  ]},
  { id: "regleta", t: "Barra superior (regleta de estado)", c: [
    "Los tres indicadores son lecturas en vivo, como un panel HMI: tiempo registrado hoy (rojo parpadeando si el cronómetro corre), pendientes de hoy + vencidos, y el total cotizado del pipeline (lo que tienes en la calle esperando respuesta). Tócalos para saltar a su pestaña.",
    "El punto cambia de color según el estado: verde = en orden, ámbar = requiere atención, rojo = hay vencidos.",
    "Nube (☁️) = Cuenta y sincronización. Ubicación (📍) = Visitas y check-in. Micrófono = Asistente por voz. Signo de interrogación = este manual.",
    "Toca el nombre Brida para volver a la pantalla de inicio con tu resumen del día en cualquier momento.",
  ]},
  { id: "hoy", t: "Hoy — pendientes", c: [
    "Captura rápida: escribe el pendiente, elige Hoy / Mañana / Otra fecha, opcionalmente una hora, y toca +.",
    "Toca un pendiente para abrirlo: cliente, fecha, hora de inicio y fin, fecha de finalización, prioridad y ligarlo a una oportunidad del pipeline.",
    "Dentro del pendiente: Agendar lo manda pre-llenado a Google Calendar; el botón de compartir lo envía individual a Google Tasks o Keep.",
    "Comentarios: dentro de cada pendiente puedes anotar acuerdos o qué resolviste; los pendientes con comentario muestran un ícono de globo.",
    "Los pendientes de hoy se ordenan por prioridad: primero los de prioridad alta y, dentro de cada nivel, por hora.",
    "→ mañana lo reprograma con un toque. Las secciones Vencidas (rojo) y Acciones de pipeline (ámbar) aparecen solo cuando existen.",
    "Cerrar el día: resumen de lo completado, tiempo registrado, opción de mover todo lo incompleto a mañana y alerta de oportunidades sin próxima acción. Úsalo cada tarde: nada se queda en la cabeza.",
  ]},
  { id: "tiempo", t: "Tiempo", c: [
    "Cronómetro: elige categoría (visitas, cotizaciones, llamadas, traslados, administrativo, capacitación), cliente opcional, Iniciar. Sigue corriendo aunque cierres la app; Detener y guardar registra los minutos.",
    "+ Registro manual: para capturar tiempo pasado con fecha, minutos y categoría.",
    "Las barras muestran tu día por categoría y tu semana por día (la barra ámbar es hoy). En Registros recientes ves los últimos movimientos de cualquier día y puedes eliminar cualquiera con la X, incluidos los de días anteriores.",
  ]},
  { id: "pipeline", t: "Pipeline", c: [
    "Flujo: Acuerdo de visita → Cotizado → Por cerrar → OC recibida → Pedido realizado → Facturado (o Perdido). Recibir la OC ya significa que la venta se ganó.",
    "Regla de oro: toda oportunidad activa debe tener próxima acción con fecha. La app te lo recuerda con la franja ámbar y en el cierre del día.",
    "Activas son las que aún persigues: Acuerdo de visita, Cotizado y Por cerrar. Al recibir la OC dejan de ser activas porque ya se ganaron.",
    "Tarjeta: toca para editar (cliente, monto, margen, marca, plaza, vendedor y los números de referencia); Avanzar la pasa a la siguiente etapa; Agendar manda la próxima acción a Google Calendar.",
    "El resumen muestra tres cifras: En juego (visita, cotizado y por cerrar), Pedido (OC y pedido) y Facturado (cobrado). El Acumulado por mes agrupa usando las fechas de OC, pedido y factura.",
    "Desde Cotizado aparecen N° y fecha de cotización; desde OC recibida, la OC del cliente con su fecha; desde Pedido, N° y fecha de pedido y de factura. Todo se muestra como etiquetas y sale en el CSV de Monday.",
    "Margen: captura el porcentaje con que vendiste; se muestra en la tarjeta y alimenta el cálculo de comisiones.",
    "Moneda: en cada oportunidad puedes capturar el monto en pesos o en dólares con el switch MXN/USD. Si eliges USD, se convierte y se guarda en pesos usando el tipo de cambio de la pantalla de inicio; la tarjeta muestra el monto original en dólares.",
    "Comisiones: el botón Calcular comisiones toma una oportunidad ya facturada, su monto y margen, y con tu porcentaje calcula utilidad y tu pago.",
    "Pedir estatus a vendedores: el botón agrupa tus oportunidades en curso por vendedor y arma un mensaje claro y numerado (cliente, monto, etapa, referencias y un renglón Estatus para llenar). Elige cuáles incluir y envíalo por WhatsApp, Compartir o Copiar. También puedes pedir el estatus de una sola oportunidad desde su ficha.",
    "Cuando cobres, avanza la oportunidad a Facturado. Las fechas de OC, pedido y factura se sellan solas al avanzar de etapa (y puedes editarlas).",
    "El buscador encuentra por cliente, vendedor, marca, plaza y por número de cotización, OC, pedido o factura. Los chips filtran por etapa (Todas al inicio, vista por defecto). Las tarjetas se ordenan por etapa y, dentro de cada etapa, de mayor a menor monto.",
  ]},
  { id: "metas", t: "Metas y proyectos", c: [
    "Tres horizontes: corto (1–3 meses), mediano (3–12) y largo (1–3 años). Agrega con el campo inferior y marca cumplidas con el círculo.",
    "Toca una meta para ponerle fecha de inicio y fin: en ese momento se vuelve un proyecto y aparece como barra en el Cronograma.",
    "Cronograma (Gantt): cada barra es una meta con fechas; el color indica el plazo, verde = cumplida, y la línea roja vertical marca hoy.",
  ]},
  { id: "cuenta", t: "Cuenta y sincronización en la nube", c: [
    "Abre Cuenta con el icono de nube (☁️) de la barra superior. Su color te dice el estado: verde = sincronizado, ámbar = sincronizando o sin conexión, gris = sin cuenta.",
    "Crea tu cuenta con correo y contraseña (mínimo 6 caracteres) y entra. Con la misma cuenta en tu celular y tu PC verás los mismos datos.",
    "La primera vez, entra en el dispositivo que ya tiene tus datos: ese los sube a la nube. En los demás dispositivos, al entrar, se descargan.",
    "Importante: antes de iniciar sesión por primera vez, exporta un respaldo en Cierre. Es tu red de seguridad.",
    "Funciona sin internet: los cambios se guardan en el dispositivo y suben a la nube en cuanto vuelve la conexión.",
    "Por ahora cada usuario tiene sus propios datos sincronizados entre sus dispositivos. Compartir cartera entre varios usuarios con roles es una mejora futura.",
  ]},
  { id: "visitas", t: "Visitas y check-in", c: [
    "Abre Visitas con el icono de ubicación (📍) de la barra superior; un punto ámbar avisa si tienes una visita de hoy sin check-in.",
    "Programa una visita (suelta o ligada a una oportunidad del pipeline, que autocompleta el cliente) con fecha y hora de inicio y de término, cliente, notas y resultado. El botón Agendar en Google Calendar crea el evento con ese horario.",
    "Check-in: al llegar con el cliente, toca «Estoy aquí» y la app guarda tu ubicación GPS y la hora exacta. La primera vez el teléfono pedirá permiso de ubicación: acéptalo.",
    "Cada visita con check-in muestra «Ver en mapa» (abre Google Maps en el punto) y la precisión en metros.",
    "Marca el resultado (Interés, Cotización, Pedido/cierre, Sin interés, Reagendar) para dar seguimiento después.",
  ]},
  { id: "asistente", t: "Asistente por voz", c: [
    "Ábrelo con el micrófono de la barra superior. Dicta o escribe varias cosas seguidas y toca Interpretar: la app las clasifica en pendientes, oportunidades, metas o registros de tiempo.",
    "Vista previa: toca cualquier elemento para incluirlo o excluirlo antes de Crear.",
    "Motor Local (gratis): entiende patrones como 'Llamar a Preisa mañana a las 10', 'Visita con CFE el viernes de 9 a 11', 'Oportunidad con Femsa por 250 mil, cotizado', 'Meta corto plazo: cerrar 3 proyectos', 'Registra 45 minutos de traslados'.",
    "Motor Claude API (opcional): entiende lenguaje totalmente libre usando tu propia clave de console.anthropic.com. La clave se guarda solo en tu dispositivo, nunca viaja en los respaldos, y el costo es de centavos por dictado.",
    "El dictado usa el reconocimiento del navegador: funciona mejor en Chrome.",
  ]},
  { id: "comisiones", t: "Comisiones", c: [
    "La pestaña Comisiones (icono %) se alimenta sola de las oportunidades en etapa Facturado.",
    "Para cada facturada calcula la utilidad (monto × margen) y, con el porcentaje de comisión que captures, tu comisión. El porcentaje es propio de cada oportunidad.",
    "Arriba eliges el mes (por fecha de factura) y ves el resumen: utilidad total, comisión total, comisión pagada y pendiente de pago.",
    "Marca «Pagado» cuando te liquiden la comisión (normalmente al mes siguiente); el resumen reparte automáticamente entre pagado y pendiente.",
    "El botón «Calcular comisiones» del Pipeline sigue disponible para un cálculo rápido sobre cualquier oportunidad facturada.",
  ]},
  { id: "cierre", t: "Cierre — reportes, exportar y respaldo", c: [
    "Cierre de semana: tus números de la semana y Copiar resumen para pegarlo en un reporte o mensaje a tu jefe.",
    "Exportar: «Pipeline en Excel» genera un .xlsx ordenado como el flujo de venta (Oportunidad, Etapa, Cliente, Cotización y su fecha, Monto en pesos y su equivalente en dólares, Margen, OC, Pedido, Factura y sus fechas, luego utilidad/comisión y datos de contacto), con las columnas de dinero en formato de moneda. La columna Monto (USD) usa el importe original si la oportunidad se capturó en dólares, o el equivalente al tipo de cambio actual si fue en pesos. «Pipeline para Monday» y los demás generan CSV para «Importar datos → Excel/CSV» en tu tablero.",
    "Enviar a Google Tasks / Keep: filtra pendientes, completados o todos, y Compartir abre el menú de Android (Tasks crea una tarea con la lista; Keep una nota). Copiar lista sirve para pegar en la PC.",
    "Respaldo de datos: Exportar genera un .json completo; Importar lo restaura en otro dispositivo o tras un cambio de teléfono.",
    "Mejoras de la app: anota cualquier fricción; el botón Copiar lista para Claude arma el mensaje exacto para pedir la siguiente versión.",
  ]},
  { id: "vers", t: "Novedades por versión", c: [
    "v3.3 — El Excel del pipeline incluye una columna Monto (USD) junto a la de pesos: muestra el importe original en dólares si así se capturó, o el equivalente al tipo de cambio actual.",
    "v3.2 — El Excel del pipeline se reordenó siguiendo el flujo de venta: Oportunidad, Etapa, Cliente, Cotización y su fecha, Monto, Margen, OC, Pedido, Factura y sus fechas, y al final utilidad/comisión y datos de contacto.",
    "v3.1 — Nuevo «Pedir estatus a vendedores» en el Pipeline: agrupa las oportunidades en curso por vendedor y genera un mensaje claro y numerado (con renglón Estatus) para enviar por WhatsApp o compartir. También disponible por oportunidad desde su ficha.",
    "v3.0 — Nuevo tema visual en negro y rojo; el tipo de cambio admite hasta 4 decimales para ver el dólar con más detalle; las visitas ya no guardan fotos (para no consumir memoria del dispositivo).",
    "v2.9 — Las visitas ahora tienen fecha y hora de término (además de las de inicio) y un botón para agendarlas directamente en Google Calendar.",
    "v2.8 — Cuenta en la nube (icono ☁️): inicia sesión con correo y contraseña y tus datos se sincronizan automáticamente entre tu celular y tu PC. Sigue funcionando sin internet y sincroniza al reconectar.",
    "v2.7 — Nuevo módulo de Visitas (icono de ubicación en la barra superior): programa visitas sueltas o ligadas a una oportunidad, haz check-in por GPS al llegar con hora y ubicación, marca el resultado y adjunta foto del lugar.",
    "v2.6 — Captura de oportunidades en pesos o dólares con switch MXN/USD (todo se guarda en pesos); tipo de cambio USD→MXN editable en la pantalla de inicio, con actualización automática por internet.",
    "v2.5 — El buscador del pipeline también encuentra por número de cotización, OC, pedido o factura; nuevo campo Vendedor en la oportunidad (buscable y en las exportaciones).",
    "v2.4 — Nueva pestaña Comisiones: se alimenta de las facturadas, con % de comisión propio por oportunidad, filtro por mes, totales de utilidad y comisión (pagada/pendiente) y marca de «Pagado». El Excel incluye columnas de utilidad y comisión.",
    "v2.3 — El pipeline abre en «Todas» y se ordena por etapa y monto (mayor primero); se quita el filtro «Activas»; la pantalla de inicio muestra el total cotizado y el número de cotizaciones; exportación a Excel (.xlsx) con formato de moneda.",
    "v2.2 — OC recibida va antes de Pedido realizado, con fecha de OC; la regleta superior monitorea el total cotizado; el manual ahora incluye la ilustración de cada pantalla.",
    "v2.1 — Fechas de cotización, pedido y factura (se sellan solas al avanzar); se elimina la etapa Ganado (Pedido ya implica venta ganada); Activas son solo visita, cotizado y por cerrar; flujo de etapas ilustrado en este manual.",
    "v2.0 — Resumen del pipeline con Pedido y Facturado y acumulado por mes; margen y calculadora de comisiones; N° de cotización y OC del cliente; filtro Todas al inicio.",
    "v1.9 — Comentarios en los pendientes; orden por prioridad en Hoy; los registros de tiempo de días anteriores ya se pueden eliminar.",
    "v1.8 — El nombre Brida en la barra superior regresa a la pantalla de inicio.",
    "v1.7 — Pantalla de inicio en cada apertura: fecha completa con año y resumen de pendientes del día estilo notificaciones.",
    "v1.6 — Pantalla de inicio y este manual con índice (botón ?); N° de pedido y factura con etapa Facturado; metas con fechas y cronograma Gantt.",
    "v1.5 — Envío de pendientes a Google Tasks y Keep: lista con filtro y botón individual por pendiente.",
    "v1.4 — Agendar en Google Calendar; horas de inicio y fin en pendientes; Asistente por voz con intérprete Local y Claude API.",
    "v1.3 — Corrección de estilos en la versión publicada (Tailwind incluido en el archivo).",
    "v1.2 — Versión PWA instalable con guardado local y Respaldo exportar/importar.",
    "v1.1 — Bitácora de mejoras con generador de prompt para Claude.",
    "v1.0 — Tablero inicial: pendientes, tiempo, pipeline, metas, cierre de día/semana y export a Monday.",
  ]},
];

const IMG = Object.fromEntries(Object.entries(ILUSTRACIONES).map(([k, v]) => [k, "data:image/svg+xml;utf8," + encodeURIComponent(v)]));

function ManualSheet({ onCerrar }) {
  const [abierta, setAbierta] = useState(null);
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(20,28,38,0.55)" }} onClick={onCerrar}>
      <div className="rounded-t-2xl max-h-full overflow-y-auto w-full max-w-xl mx-auto" style={{ background: C.fondo }} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b" style={{ background: C.bezel, borderColor: C.bezel2 }}>
          <span style={{ ...dsp, letterSpacing: "0.14em" }} className="uppercase font-bold flex items-center gap-2"><BookOpen size={16} style={{ color: C.ambar }} /><span style={{ color: "#fff" }}>Manual</span></span>
          <button onClick={onCerrar}><X size={20} style={{ color: "#8FA0B3" }} /></button>
        </div>
        <div className="p-4 pb-8 space-y-2">
          <div className="text-xs" style={{ color: C.dim }}>Índice — toca una sección para abrirla; cada una incluye la ilustración de su pantalla. Este manual se actualiza con cada versión (mira Novedades al final).</div>
          {MANUAL.map((s) => (
            <div key={s.id} className="rounded-xl border" style={{ borderColor: abierta === s.id ? C.tinta : C.borde, background: C.panel }}>
              <button onClick={() => setAbierta(abierta === s.id ? null : s.id)} className="w-full flex items-center justify-between px-3 py-2.5 text-left">
                <span className="text-sm font-semibold" style={{ color: C.tinta }}>{s.t}</span>
                <ChevronDown size={16} style={{ color: C.dim, transform: abierta === s.id ? "rotate(180deg)" : "none" }} />
              </button>
              {abierta === s.id ? (
                <div className="px-3 pb-3 pt-2 space-y-2 border-t" style={{ borderColor: C.borde }}>
                  {IMG[s.id] ? <img src={IMG[s.id]} alt="" className="w-full rounded-xl border" style={{ borderColor: C.borde, background: C.bezel }} /> : null}
                  {s.id === "pipeline" ? (
                    <div className="flex items-center flex-wrap gap-1 pb-1">
                      {FLUJO.map((id, i) => (
                        <span key={id} className="flex items-center gap-1">
                          {i > 0 ? <ChevronRight size={12} style={{ color: C.dim }} /> : null}
                          <Etiqueta e={etapa(id)} />
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {s.c.map((p, i) => <p key={i} className="text-sm leading-snug" style={{ color: C.tinta }}>{p}</p>)}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PantallaInicio({ vencidas, deHoy, acciones, totCotizado, numCotizado, tc, tcFecha, sesion, sync, onCuenta, onTC, onFetchTC, onEntrar, onIr, onManual }) {
  const [tcLocal, setTcLocal] = useState(tc ? String(tc) : "");
  const [tcEstado, setTcEstado] = useState("");
  const fetchTC = async () => { setTcEstado("…"); const ok = await onFetchTC(); setTcEstado(ok ? "ok" : "err"); if (ok) setTcLocal(String(ok)); setTimeout(() => setTcEstado(""), 2500); };
  const lista = [...vencidas.map((t) => ({ ...t, _v: true })), ...deHoy.map((t) => ({ ...t, _v: false }))];
  const visibles = lista.slice(0, 6);
  const extra = lista.length - visibles.length;
  return (
    <div className="fixed inset-0 z-50 flex flex-col p-5 overflow-y-auto" style={{ background: C.bezel }}>
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col">
        <div className="flex items-center justify-center gap-2 mt-1">
          <Zap size={18} style={{ color: C.ambar }} />
          <span style={{ ...dsp, letterSpacing: "0.16em" }} className="text-base font-bold uppercase"><span style={{ color: "#fff" }}>Bri</span><span style={{ color: C.ambar }}>da</span></span>
        </div>
        <div className="text-center mt-6">
          <div className="text-2xl font-semibold" style={{ color: "#fff" }}>{fHoyCompleto()}</div>
          <div className="flex items-center justify-center gap-3 mt-2 text-xs" style={{ ...mono, color: "#8FA0B3" }}>
            <span className="flex items-center gap-1.5"><Dot color={vencidas.length ? C.rojo : "#4A5A6C"} />{vencidas.length} vencidos</span>
            <span className="flex items-center gap-1.5"><Dot color={deHoy.length ? C.ambar : "#4A5A6C"} />{deHoy.length} para hoy</span>
          </div>
        </div>
        <button onClick={() => onIr("pipeline")} className="mt-4 rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: C.bezel2, border: `1px solid ${C.azul}` }}>
          <span className="flex items-center gap-2">
            <Briefcase size={16} style={{ color: C.azul }} />
            <span className="text-xs uppercase font-semibold" style={{ ...dsp, color: "#C6D2DE", letterSpacing: "0.1em" }}>Cotizado</span>
          </span>
          <span className="text-right">
            <span className="block text-lg font-semibold" style={{ ...mono, color: "#fff" }}>{fMXN(totCotizado)}</span>
            <span className="block text-xs" style={{ ...mono, color: "#8FA0B3" }}>{numCotizado} {numCotizado === 1 ? "cotización" : "cotizaciones"}</span>
          </span>
        </button>
        <div className="mt-2 rounded-xl px-3 py-2.5 flex items-center gap-2" style={{ background: C.bezel2 }}>
          <span className="text-xs uppercase font-semibold" style={{ ...dsp, color: "#8FA0B3", letterSpacing: "0.08em" }}>TC USD→MXN</span>
          <span className="text-sm" style={{ ...mono, color: "#fff" }}>$</span>
          <input type="number" inputMode="decimal" step="0.0001" value={tcLocal} onChange={(e) => setTcLocal(e.target.value)} onBlur={() => onTC(tcLocal === "" ? 0 : Number(tcLocal))}
            className="w-24 text-sm rounded-lg px-2 py-1" style={{ ...mono, background: C.bezel, color: "#fff", border: `1px solid #34435400`, colorScheme: "dark" }} />
          <button onClick={fetchTC} className="text-xs px-2.5 py-1 rounded-lg border font-semibold ml-auto" style={{ borderColor: tcEstado === "err" ? C.rojo : C.azul, color: tcEstado === "err" ? C.rojo : C.azul }}>
            {tcEstado === "…" ? "Buscando…" : tcEstado === "ok" ? "✓ Actualizado" : tcEstado === "err" ? "Sin conexión" : "↻ Actualizar"}
          </button>
        </div>
        {tcFecha ? <div className="text-xs text-center mt-1" style={{ ...mono, color: "#5E6E7E" }}>Tipo de cambio del {fFecha(tcFecha)}</div> : null}
        <div className="mt-5 space-y-2">
          {lista.length === 0 && acciones.length === 0 ? (
            <div className="rounded-xl px-3 py-4 text-center text-sm" style={{ background: C.bezel2, color: C.verde }}>Tablero limpio — sin pendientes para hoy.</div>
          ) : null}
          {visibles.map((t) => (
            <button key={t.id} onClick={() => onIr("hoy")} className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left" style={{ background: C.bezel2 }}>
              <Dot color={t._v || t.prioridad === "alta" ? C.rojo : C.ambar} />
              <span className="flex-1 min-w-0">
                <span className="block text-sm truncate" style={{ color: "#fff" }}>{t.titulo}</span>
                <span className="block text-xs" style={{ ...mono, color: t._v ? C.rojo : "#8FA0B3" }}>{t._v ? `vencido · ${fFecha(t.fecha)}` : (t.horaInicio || "hoy")}{t.cliente ? ` · ${t.cliente}` : ""}</span>
              </span>
              <ChevronRight size={15} style={{ color: "#5E6E7E" }} />
            </button>
          ))}
          {extra > 0 ? <button onClick={() => onIr("hoy")} className="w-full text-center text-xs py-1" style={{ ...mono, color: "#8FA0B3" }}>y {extra} más en el tablero…</button> : null}
          {acciones.length > 0 ? (
            <button onClick={() => onIr("hoy")} className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left" style={{ background: C.bezel2, border: `1px solid ${C.ambar}` }}>
              <Zap size={14} style={{ color: C.ambar }} />
              <span className="flex-1 text-sm" style={{ color: "#fff" }}>{acciones.length} {acciones.length === 1 ? "acción de pipeline para hoy" : "acciones de pipeline para hoy"}</span>
              <ChevronRight size={15} style={{ color: "#5E6E7E" }} />
            </button>
          ) : null}
        </div>
        <div className="mt-auto pt-6">
          <button onClick={onCuenta} className="w-full rounded-xl px-3 py-2.5 mb-2 flex items-center justify-center gap-2" style={{ background: C.bezel2 }}>
            {sesion ? <><Cloud size={14} style={{ color: sync === "sincronizado" ? "#2F9467" : "#DE9B10" }} /><span className="text-xs truncate" style={{ color: "#C6D2DE" }}>{sesion.user.email} · {sync === "sincronizado" ? "Sincronizado" : "Sincronizando…"}</span></> : <><CloudOff size={14} style={{ color: "#8FA0B3" }} /><span className="text-xs" style={{ color: "#C6D2DE" }}>Iniciar sesión para sincronizar tus dispositivos</span></>}
          </button>
          <button onClick={onEntrar} className="w-full py-3.5 rounded-xl font-bold uppercase" style={{ ...dsp, letterSpacing: "0.14em", background: C.ambar, color: "#fff" }}>Entrar al tablero</button>
          <button onClick={onManual} className="w-full text-center text-xs mt-3" style={{ color: "#5E6E7E" }}>Manual de uso (?)</button>
          <div className="text-center text-xs mt-2" style={{ ...mono, color: "#4A5A6C" }}>v3.3</div>
        </div>
      </div>
    </div>
  );
}

/* ── Asistente por voz ────────────────────────────────────────────── */
function AsistenteSheet({ onCerrar, onAplicar }) {
  const [texto, setTexto] = useState("");
  const [interim, setInterim] = useState("");
  const [oyendo, setOyendo] = useState(false);
  const [motor, setMotor] = useState(() => { try { return localStorage.getItem("brida-motor") || "local"; } catch { return "local"; } });
  const [clave, setClave] = useState(() => { try { return localStorage.getItem("brida-apikey") || ""; } catch { return ""; } });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [res, setRes] = useState(null);
  const [exito, setExito] = useState(null);
  const recRef = useRef(null);
  const oyendoRef = useRef(false);
  const baseRef = useRef("");
  const soporteVoz = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const pararVoz = () => { oyendoRef.current = false; setOyendo(false); setInterim(""); try { recRef.current && recRef.current.stop(); } catch (e) {} };
  const iniciarVoz = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = "es-MX"; r.continuous = true; r.interimResults = true;
    baseRef.current = texto.trim();
    r.onresult = (e) => {
      let fin = "", inte = "";
      for (let i = 0; i < e.results.length; i++) { const tx = e.results[i][0].transcript; if (e.results[i].isFinal) fin += tx + " "; else inte += tx; }
      setTexto((baseRef.current + " " + fin).trim()); setInterim(inte);
    };
    r.onerror = () => pararVoz();
    r.onend = () => {
      if (oyendoRef.current) { setTexto((t) => { baseRef.current = t; return t; }); try { r.start(); } catch (e) { pararVoz(); } }
      else setInterim("");
    };
    recRef.current = r; oyendoRef.current = true; setOyendo(true); setError("");
    try { r.start(); } catch (e) { pararVoz(); }
  };
  useEffect(() => () => { oyendoRef.current = false; try { recRef.current && recRef.current.stop(); } catch (e) {} }, []);

  const cerrar = () => { pararVoz(); onCerrar(); };
  const cambiarMotor = (m) => { setMotor(m); try { localStorage.setItem("brida-motor", m); } catch (e) {} };
  const cambiarClave = (v) => { setClave(v); try { localStorage.setItem("brida-apikey", v); } catch (e) {} };

  const interpretar = async () => {
    const txt = texto.trim(); if (!txt) return;
    pararVoz(); setError(""); setRes(null); setExito(null);
    if (motor === "claude") {
      if (!clave.trim()) { setError("Pega tu clave API de Anthropic abajo, o cambia al intérprete Local."); return; }
      setCargando(true);
      try { setRes(normalizarRes(await pedirAClaude(txt, clave.trim()))); }
      catch (e) { setError("No se pudo consultar a Claude: " + (e.message || "error") + ". Prueba el intérprete Local."); }
      setCargando(false);
    } else {
      setRes(normalizarRes(interpretarLocal(txt)));
    }
  };
  const alternar = (tipo, id) => setRes({ ...res, [tipo]: res[tipo].map((x) => x._id === id ? { ...x, incluir: !x.incluir } : x) });
  const totalSel = res ? res.tareas.filter(x=>x.incluir).length + res.oportunidades.filter(x=>x.incluir).length + res.metas.filter(x=>x.incluir).length + res.tiempo.filter(x=>x.incluir).length : 0;
  const crear = () => {
    if (!res || !totalSel) return;
    const sel = { tareas: res.tareas.filter(x=>x.incluir), oportunidades: res.oportunidades.filter(x=>x.incluir), metas: res.metas.filter(x=>x.incluir), tiempo: res.tiempo.filter(x=>x.incluir) };
    setExito(onAplicar(sel)); setRes(null); setTexto(""); setInterim("");
  };

  const FilaPrev = ({ sel, onSel, etq, color, titulo, sub }) => (
    <button onClick={onSel} className="w-full flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left" style={{ borderColor: sel ? color : C.borde, background: C.panel, opacity: sel ? 1 : 0.55 }}>
      {sel ? <CheckCircle2 size={19} style={{ color }} className="shrink-0 mt-0.5" /> : <Circle size={19} style={{ color: C.dim }} className="shrink-0 mt-0.5" />}
      <span className="min-w-0 flex-1">
        <span className="text-xs px-1.5 py-0.5 rounded font-semibold uppercase mr-1.5" style={{ ...dsp, letterSpacing: "0.06em", color, border: `1px solid ${color}` }}>{etq}</span>
        <span className="text-sm" style={{ color: C.tinta }}>{titulo}</span>
        {sub ? <span className="block text-xs mt-0.5" style={{ ...mono, color: C.dim }}>{sub}</span> : null}
      </span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(20,28,38,0.55)" }} onClick={cerrar}>
      <div className="rounded-t-2xl max-h-full overflow-y-auto w-full max-w-xl mx-auto" style={{ background: C.fondo }} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b" style={{ background: C.bezel, borderColor: C.bezel2 }}>
          <span style={{ ...dsp, letterSpacing: "0.14em" }} className="uppercase font-bold flex items-center gap-2"><Sparkles size={16} style={{ color: C.ambar }} /><span style={{ color: "#fff" }}>Asistente</span></span>
          <button onClick={cerrar}><X size={20} style={{ color: "#8FA0B3" }} /></button>
        </div>
        <div className="p-4 pb-8 space-y-3">
          {exito ? (
            <div className="rounded-xl border px-3 py-4 text-center space-y-3" style={{ borderColor: C.verde, background: C.verdeBg }}>
              <div className="text-sm font-semibold" style={{ color: C.verde }}>Creado y acomodado en su lugar</div>
              <div className="text-xs" style={{ ...mono, color: C.tinta }}>{exito.t} pendientes · {exito.o} oportunidades · {exito.m} metas · {exito.r} registros de tiempo</div>
              <div className="flex gap-2">
                <button onClick={() => setExito(null)} className="flex-1 py-2 rounded-lg border text-sm font-semibold" style={{ borderColor: C.borde, background: "#fff", color: C.tinta }}>Dictar más</button>
                <button onClick={cerrar} className="flex-1 py-2 rounded-lg text-sm font-semibold" style={{ background: C.tinta, color: "#fff" }}>Ir al tablero</button>
              </div>
            </div>
          ) : (<>
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={3}
              placeholder={'Dicta o escribe. Ej.: "Llamar a Preisa mañana a las 10; visita con CFE el viernes de 9 a 11"'}
              className="w-full rounded-xl px-3 py-2.5 text-sm" style={inp} />
            {interim ? <div className="text-xs" style={{ ...mono, color: C.ambar }}>{interim}…</div> : null}
            <div className="flex items-center gap-3">
              <button onClick={oyendo ? pararVoz : iniciarVoz} disabled={!soporteVoz} aria-label="Dictar"
                className="w-16 h-16 rounded-full flex items-center justify-center shrink-0"
                style={{ background: oyendo ? C.rojo : soporteVoz ? C.tinta : C.borde }}>
                <Mic size={26} color="#fff" className={oyendo ? "pulso" : ""} />
              </button>
              <div className="flex-1">
                <button onClick={interpretar} disabled={!texto.trim() || cargando}
                  className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                  style={{ background: texto.trim() && !cargando ? C.ambar : C.borde, color: "#141C26" }}>
                  <Sparkles size={16} /> {cargando ? "Interpretando…" : "Interpretar"}
                </button>
                <div className="text-xs mt-1" style={{ color: C.dim }}>{oyendo ? "Escuchando… toca el micrófono para detener." : soporteVoz ? "Toca el micrófono y habla; puedes corregir el texto antes de interpretar." : "Tu navegador no soporta dictado (usa Chrome) — escribe o usa el micrófono del teclado."}</div>
              </div>
            </div>
            <div className="flex gap-1.5">
              {[["local", "Intérprete Local (gratis)"], ["claude", "Claude API (tu clave)"]].map(([id, lb]) => (
                <button key={id} onClick={() => cambiarMotor(id)} className="flex-1 text-xs px-2 py-1.5 rounded-lg border font-semibold"
                  style={{ borderColor: motor === id ? C.tinta : C.borde, color: motor === id ? C.tinta : C.dim, background: motor === id ? "#fff" : "transparent" }}>{lb}</button>
              ))}
            </div>
            {motor === "claude" ? (
              <div className="rounded-xl border p-2.5 space-y-1.5" style={{ borderColor: C.borde, background: C.panel }}>
                <input type="password" value={clave} onChange={(e) => cambiarClave(e.target.value)} placeholder="sk-ant-…  (clave API de Anthropic)" className="w-full rounded-lg px-3 py-2 text-sm" style={{ ...inp, ...mono }} />
                <div className="text-xs" style={{ color: C.dim }}>Tu clave se guarda solo en este dispositivo y nunca viaja en los respaldos. El uso se cobra en tu cuenta de console.anthropic.com (centavos por dictado con Haiku).</div>
              </div>
            ) : (
              <div className="text-xs" style={{ color: C.dim }}>Entiende frases como: “Llamar a Preisa mañana a las 10” · “Visita con CFE el viernes de 9 a 11” · “Oportunidad con Femsa por 250 mil, cotizado” · “Meta corto plazo: cerrar 3 proyectos” · “Registra 45 minutos de traslados”.</div>
            )}
            {error ? <div className="rounded-xl border px-3 py-2 text-xs" style={{ borderColor: C.rojo, background: C.rojoBg, color: C.rojo }}>{error}</div> : null}
            {res ? (
              <div className="space-y-1.5">
                <div className="text-xs uppercase font-semibold" style={{ ...dsp, color: C.dim, letterSpacing: "0.12em" }}>Vista previa — toca para incluir o excluir</div>
                {res.tareas.map((t) => <FilaPrev key={t._id} sel={t.incluir} onSel={() => alternar("tareas", t._id)} etq="Pendiente" color={C.azul} titulo={t.titulo}
                  sub={`${fFecha(t.fecha || hoy())}${t.horaInicio ? ` · ${t.horaInicio}${t.horaFin ? `–${t.horaFin}` : ""}` : ""}${t.cliente ? ` · ${t.cliente}` : ""}`} />)}
                {res.oportunidades.map((o) => <FilaPrev key={o._id} sel={o.incluir} onSel={() => alternar("oportunidades", o._id)} etq="Oportunidad" color={C.ambar} titulo={o.titulo || o.cliente}
                  sub={`${etapa(o.etapa && ETAPAS.some((e) => e.id === o.etapa) ? o.etapa : "visita").label}${o.monto ? ` · ${fMXN(o.monto)}` : ""}${o.cliente ? ` · ${o.cliente}` : ""}`} />)}
                {res.metas.map((m) => <FilaPrev key={m._id} sel={m.incluir} onSel={() => alternar("metas", m._id)} etq="Meta" color={C.morado} titulo={m.texto} sub={`Plazo ${m.plazo || "corto"}`} />)}
                {res.tiempo.map((r) => <FilaPrev key={r._id} sel={r.incluir} onSel={() => alternar("tiempo", r._id)} etq="Tiempo" color={C.teal} titulo={r.categoria} sub={`${fMin(r.minutos)}${r.cliente ? ` · ${r.cliente}` : ""}`} />)}
                {totalSel === 0 ? <div className="text-xs text-center" style={{ color: C.dim }}>Nada seleccionado.</div> : null}
                <button onClick={crear} disabled={!totalSel} className="w-full py-3 rounded-xl font-semibold" style={{ background: totalSel ? C.tinta : C.borde, color: "#fff" }}>
                  Crear {totalSel} {totalSel === 1 ? "elemento" : "elementos"}
                </button>
              </div>
            ) : null}
          </>)}
        </div>
      </div>
    </div>
  );
}

/* ── App principal ────────────────────────────────────────────────── */
export default function App() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("hoy");
  const [ahora, setAhora] = useState(Date.now());
  const [expand, setExpand] = useState(null);
  const [oppEdit, setOppEdit] = useState(null);
  const [cliEdit, setCliEdit] = useState(null);
  const [buscarCli, setBuscarCli] = useState("");
  const [cotEdit, setCotEdit] = useState(null);
  const [catOpen, setCatOpen] = useState(false);
  const [verCierre, setVerCierre] = useState(false);
  const [verProx, setVerProx] = useState(false);
  const [verHechas, setVerHechas] = useState(false);
  const [filtroE, setFiltroE] = useState("todas");
  const [busca, setBusca] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [textoManual, setTextoManual] = useState(null);
  const [sinStorage, setSinStorage] = useState(false);
  // captura rápida
  const [qaT, setQaT] = useState(""); const [qaF, setQaF] = useState("hoy"); const [qaFO, setQaFO] = useState(hoy());
  // tiempo
  const [selCat, setSelCat] = useState(CATS[0].id); const [selCli, setSelCli] = useState("");
  const [verManual, setVerManual] = useState(false);
  const [mF, setMF] = useState(hoy()); const [mC, setMC] = useState(CATS[0].id); const [mMin, setMMin] = useState(""); const [mCli, setMCli] = useState("");
  // metas
  const [metaTxt, setMetaTxt] = useState({ corto: "", mediano: "", largo: "" });
  // mejoras de la app
  const [mejTxt, setMejTxt] = useState("");
  const [copiadoM, setCopiadoM] = useState(false);
  const [verAsis, setVerAsis] = useState(false);
  const [qaH, setQaH] = useState("");
  const [envFiltro, setEnvFiltro] = useState("pend");
  const [copiadoT, setCopiadoT] = useState(false);
  const [expMeta, setExpMeta] = useState(null);
  const [mesSel, setMesSel] = useState("");
  const [verComision, setVerComision] = useState(false);
  const [verSeguimiento, setVerSeguimiento] = useState(false);
  const [verVisitas, setVerVisitas] = useState(false);
  const [visitaEdit, setVisitaEdit] = useState(null);
  const [mesCom, setMesCom] = useState("");
  const [comOppId, setComOppId] = useState("");
  const [comMargen, setComMargen] = useState("");
  const [comPct, setComPct] = useState("");
  const [verAyuda, setVerAyuda] = useState(false);
  const [verIntro, setVerIntro] = useState(true);
  const [verCuenta, setVerCuenta] = useState(false);
  const [sesion, setSesion] = useState(null);
  const [sync, setSync] = useState("local");
  const dataRef = useRef(null);
  const sesionRef = useRef(null);
  const pushTimerRef = useRef(null);
  const syncIniRef = useRef(false);

  useEffect(() => {
    try {
      const r = localStorage.getItem("brida-v1");
      const d = r ? { ...VACIO, ...JSON.parse(r) } : VACIO;
      d.pipeline = (d.pipeline || []).map((o) => o.etapa === "ganado" ? { ...o, etapa: "oc" } : o);
      setData(d);
    } catch { setSinStorage(true); setData(VACIO); }
  }, []);

  useEffect(() => {
    if (!data?.timer) return;
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [data?.timer]);

  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => { sesionRef.current = sesion; }, [sesion]);

  const guardar = (next) => {
    const conTs = { ...next, __actualizado: new Date().toISOString() };
    setData(conTs);
    try { localStorage.setItem("brida-v1", JSON.stringify(conTs)); } catch { setSinStorage(true); }
    if (sesionRef.current) {
      setSync("sincronizando");
      clearTimeout(pushTimerRef.current);
      pushTimerRef.current = setTimeout(async () => {
        try { await subirNube(sesionRef.current.user.id, conTs); setSync("sincronizado"); }
        catch { setSync(navigator.onLine ? "error" : "offline"); }
      }, 1200);
    }
  };

  // Sesión actual + escucha de cambios
  useEffect(() => {
    sesionActual().then((s) => setSesion(s));
    return alCambiarSesion((s) => setSesion(s));
  }, []);

  // Sincronización inicial cuando hay sesión y el estado local ya cargó
  useEffect(() => {
    if (!sesion) { setSync("local"); syncIniRef.current = false; return; }
    if (data === null || syncIniRef.current) return;
    syncIniRef.current = true;
    (async () => {
      const uid = sesion.user.id, local = dataRef.current;
      setSync("sincronizando");
      try {
        const fila = await leerNube(uid);
        const nube = fila && fila.data;
        const nubeTs = (nube && nube.__actualizado) || (fila && fila.actualizado) || "";
        const localTs = (local && local.__actualizado) || "";
        if (tieneDatos(nube) && (!tieneDatos(local) || nubeTs >= localTs)) {
          if (tieneDatos(local) && !window.confirm("Tu cuenta ya tiene datos guardados en la nube. Se cargarán en este dispositivo y reemplazarán lo que tienes aquí ahora.\n\nSi prefieres conservar lo de este dispositivo, cancela y exporta un respaldo primero.\n\n¿Cargar los datos de la nube?")) {
            await subirNube(uid, local); setSync("sincronizado"); return;
          }
          const d = { ...VACIO, ...nube };
          setData(d);
          try { localStorage.setItem("brida-v1", JSON.stringify(d)); } catch {}
        } else {
          await subirNube(uid, local);
        }
        setSync("sincronizado");
      } catch { setSync(navigator.onLine ? "error" : "offline"); }
    })();
  }, [sesion, data]);

  // Al volver a la app o recuperar conexión, jala lo más reciente de la nube
  useEffect(() => {
    const jalar = async () => {
      const s = sesionRef.current; if (!s) return;
      try {
        const fila = await leerNube(s.user.id);
        const nube = fila && fila.data;
        if (nube) {
          const nubeTs = nube.__actualizado || "", localTs = (dataRef.current && dataRef.current.__actualizado) || "";
          if (nubeTs > localTs) {
            const d = { ...VACIO, ...nube };
            setData(d);
            try { localStorage.setItem("brida-v1", JSON.stringify(d)); } catch {}
          }
          setSync("sincronizado");
        }
      } catch {}
    };
    const onVis = () => { if (document.visibilityState === "visible") jalar(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", jalar);
    return () => { document.removeEventListener("visibilitychange", onVis); window.removeEventListener("online", jalar); };
  }, []);

  const cerrarSesion = async () => { await salir(); setSync("local"); syncIniRef.current = false; setVerCuenta(false); };

  /* ── Derivados ── */
  const der = useMemo(() => {
    if (!data) return null;
    const H = hoy(), IS = iniSemana();
    const pend = data.tareas.filter((t) => !t.hecha);
    const vencidas = pend.filter((t) => t.fecha < H).sort((a, b) => a.fecha.localeCompare(b.fecha));
    const ordenPrio = { alta: 0, media: 1, baja: 2 };
    const deHoy = pend.filter((t) => t.fecha === H).sort((a, b) => (ordenPrio[a.prioridad] ?? 1) - (ordenPrio[b.prioridad] ?? 1) || (a.horaInicio || "99:99").localeCompare(b.horaInicio || "99:99"));
    const proximas = pend.filter((t) => t.fecha > H).sort((a, b) => a.fecha.localeCompare(b.fecha));
    const hechasHoy = data.tareas.filter((t) => t.hecha && t.completadaEn && fLocal(new Date(t.completadaEn)) === H);
    const hechasSem = data.tareas.filter((t) => t.hecha && t.completadaEn && fLocal(new Date(t.completadaEn)) >= IS);
    const activas = data.pipeline.filter((o) => ACTIVAS.includes(o.etapa));
    const accionesHoy = activas.filter((o) => o.proximaAccion && o.fechaAccion && o.fechaAccion <= H);
    const sinAccion = activas.filter((o) => !o.proximaAccion);
    const minHoy = data.tiempo.filter((r) => r.fecha === H).reduce((s, r) => s + r.minutos, 0);
    const porCatHoy = CATS.map((c) => ({ ...c, min: data.tiempo.filter((r) => r.fecha === H && r.categoria === c.id).reduce((s, r) => s + r.minutos, 0) })).filter((c) => c.min > 0);
    const semDias = [...Array(7)].map((_, i) => { const f = sumaDias(IS, i); return { f, min: data.tiempo.filter((r) => r.fecha === f).reduce((s, r) => s + r.minutos, 0) }; });
    const minSem = semDias.reduce((s, d) => s + d.min, 0);
    const porCatSem = CATS.map((c) => ({ ...c, min: data.tiempo.filter((r) => r.fecha >= IS && r.categoria === c.id).reduce((s, r) => s + r.minutos, 0) })).filter((c) => c.min > 0).sort((a, b) => b.min - a.min);
    const enJuego = activas.reduce((s, o) => s + (o.monto || 0), 0);
    const cotizadas = data.pipeline.filter((o) => o.etapa === "cotizado");
    const totCotizado = cotizadas.reduce((s, o) => s + (o.monto || 0), 0);
    const numCotizado = cotizadas.length;
    const totPedido = data.pipeline.filter((o) => ["pedido", "oc"].includes(o.etapa)).reduce((s, o) => s + (o.monto || 0), 0);
    const totFacturado = data.pipeline.filter((o) => o.etapa === "facturado").reduce((s, o) => s + (o.monto || 0), 0);
    const ganadasSem = data.pipeline.filter((o) => ["pedido", "oc", "facturado"].includes(o.etapa) && (o.actualizada || "").slice(0, 10) >= IS);
    const nuevasSem = data.pipeline.filter((o) => (o.creada || "").slice(0, 10) >= IS);
    return { H, IS, pend, vencidas, deHoy, proximas, hechasHoy, hechasSem, activas, accionesHoy, sinAccion, minHoy, porCatHoy, semDias, minSem, porCatSem, enJuego, totCotizado, numCotizado, totPedido, totFacturado, ganadasSem, nuevasSem };
  }, [data]);

  if (!data || !der) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: C.bezel }}>
      <div className="text-center"><Zap size={28} style={{ color: C.ambar }} className="mx-auto pulso" /><div className="mt-2 text-sm" style={{ ...mono, color: "#8FA0B3" }}>Cargando tablero…</div></div>
    </div>
  );

  /* ── Acciones ── */
  const addTarea = () => {
    const titulo = qaT.trim(); if (!titulo) return;
    const fecha = qaF === "hoy" ? hoy() : qaF === "manana" ? manana() : qaFO;
    guardar({ ...data, tareas: [{ id: uid(), titulo, fecha, horaInicio: qaH || "", horaFin: "", fechaFin: "", prioridad: "media", cliente: "", comentarios: "", hecha: false, creada: new Date().toISOString() }, ...data.tareas] });
    setQaT(""); setQaH("");
  };
  const updTareas = (tareas) => guardar({ ...data, tareas });
  const toggleT = (id) => updTareas(data.tareas.map((t) => t.id === id ? { ...t, hecha: !t.hecha, completadaEn: !t.hecha ? new Date().toISOString() : null } : t));
  const mananaT = (id) => updTareas(data.tareas.map((t) => t.id === id ? { ...t, fecha: t.fecha < manana() ? manana() : t.fecha } : t));
  const todasManana = () => updTareas(data.tareas.map((t) => (!t.hecha && t.fecha <= hoy()) ? { ...t, fecha: manana() } : t));
  const guardarT = (id, d) => { updTareas(data.tareas.map((t) => t.id === id ? { ...t, ...d } : t)); setExpand(null); };
  const delT = (id) => { updTareas(data.tareas.filter((t) => t.id !== id)); setExpand(null); };

  const iniTimer = () => guardar({ ...data, timer: { inicio: new Date().toISOString(), categoria: selCat, cliente: selCli.trim() } });
  const stopTimer = () => {
    const t = data.timer; if (!t) return;
    const min = Math.max(1, Math.round((Date.now() - new Date(t.inicio).getTime()) / 60000));
    guardar({ ...data, timer: null, tiempo: [{ id: uid(), fecha: hoy(), categoria: t.categoria, cliente: t.cliente, minutos: min }, ...data.tiempo] });
  };
  const addManual = () => {
    const min = Number(mMin); if (!min || min <= 0) return;
    guardar({ ...data, tiempo: [{ id: uid(), fecha: mF, categoria: mC, cliente: mCli.trim(), minutos: Math.round(min) }, ...data.tiempo] });
    setMMin(""); setMCli(""); setVerManual(false);
  };
  const delTiempo = (id) => guardar({ ...data, tiempo: data.tiempo.filter((r) => r.id !== id) });

  const guardarOpp = (o) => {
    const ts = new Date().toISOString();
    const pipeline = o.id
      ? data.pipeline.map((x) => x.id === o.id ? { ...x, ...o, actualizada: ts } : x)
      : [{ ...o, id: uid(), creada: ts, actualizada: ts }, ...data.pipeline];
    guardar({ ...data, pipeline }); setOppEdit(null);
  };
  const delOpp = (id) => { guardar({ ...data, pipeline: data.pipeline.filter((o) => o.id !== id) }); setOppEdit(null); };
  const guardarCliente = (c, cts, acts) => {
    const ts = new Date().toISOString();
    const id = c.id || uid();
    const clientes = c.id
      ? (data.clientes || []).map((x) => x.id === id ? { ...x, ...c, actualizada: ts } : x)
      : [{ ...c, id, creada: ts, actualizada: ts }, ...(data.clientes || [])];
    const otros = (data.contactos || []).filter((ct) => ct.clienteId !== id);
    const nuevos = (cts || []).map((ct) => ({ ...ct, id: ct.id || uid(), clienteId: id }));
    const otrosAct = (data.actividades || []).filter((a) => a.clienteId !== id);
    const nuevosAct = (acts || []).map((a) => ({ ...a, id: a.id || uid(), clienteId: id }));
    guardar({ ...data, clientes, contactos: [...otros, ...nuevos], actividades: [...otrosAct, ...nuevosAct] }); setCliEdit(null);
  };
  const delCliente = (id) => {
    guardar({ ...data, clientes: (data.clientes || []).filter((c) => c.id !== id), contactos: (data.contactos || []).filter((ct) => ct.clienteId !== id), actividades: (data.actividades || []).filter((a) => a.clienteId !== id) });
    setCliEdit(null);
  };
  const guardarProducto = (p) => {
    const id = p.id || uid();
    const productos = p.id
      ? (data.productos || []).map((x) => x.id === id ? { ...x, ...p } : x)
      : [{ ...p, id, creada: new Date().toISOString() }, ...(data.productos || [])];
    guardar({ ...data, productos });
  };
  const delProducto = (id) => guardar({ ...data, productos: (data.productos || []).filter((p) => p.id !== id) });
  const guardarCotizacion = (c) => {
    const ts = new Date().toISOString();
    const id = c.id || uid();
    const cotizaciones = c.id
      ? (data.cotizaciones || []).map((x) => x.id === id ? { ...x, ...c, actualizada: ts } : x)
      : [{ ...c, id, creada: ts, actualizada: ts }, ...(data.cotizaciones || [])];
    guardar({ ...data, cotizaciones }); setCotEdit(null);
  };
  const delCotizacion = (id) => { guardar({ ...data, cotizaciones: (data.cotizaciones || []).filter((c) => c.id !== id) }); setCotEdit(null); };
  const setOppCampos = (id, campos) => guardar({ ...data, pipeline: data.pipeline.map((o) => o.id === id ? { ...o, ...campos } : o) });
  const guardarVisita = (v) => {
    const ts = new Date().toISOString();
    const visitas = v.id ? (data.visitas || []).map((x) => x.id === v.id ? { ...x, ...v } : x) : [{ ...v, id: uid(), creada: ts }, ...(data.visitas || [])];
    guardar({ ...data, visitas }); setVisitaEdit(null);
  };
  const delVisita = (id) => { guardar({ ...data, visitas: (data.visitas || []).filter((v) => v.id !== id) }); setVisitaEdit(null); };
  const obtenerUbicacion = (cb) => {
    if (!navigator.geolocation) { window.alert("Este dispositivo no permite obtener la ubicación."); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => cb({ lat: pos.coords.latitude, lng: pos.coords.longitude, precision: Math.round(pos.coords.accuracy), hora: new Date().toISOString() }),
      (err) => window.alert(err.code === 1 ? "Permiso de ubicación denegado. Actívalo para tu navegador en los ajustes del teléfono." : "No se pudo obtener la ubicación; inténtalo de nuevo con mejor señal."),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };
  const checkinVisita = (id) => obtenerUbicacion((ck) => guardar({ ...data, visitas: (data.visitas || []).map((v) => v.id === id ? { ...v, checkin: ck } : v) }));
  const setTC = (v) => { if (v && v > 0) guardar({ ...data, tipoCambio: v, tipoCambioFecha: hoy() }); };
  const fetchTC = async () => {
    try {
      const r = await fetch("https://open.er-api.com/v6/latest/USD");
      const j = await r.json();
      const v = j && j.rates && j.rates.MXN;
      if (v) { const val = Math.round(v * 10000) / 10000; guardar({ ...data, tipoCambio: val, tipoCambioFecha: hoy() }); return val; }
      return false;
    } catch { return false; }
  };
  const avanzar = (o) => {
    const i = FLUJO.indexOf(o.etapa);
    if (i === -1 || i === FLUJO.length - 1) return;
    const sig = FLUJO[i + 1];
    guardarOpp({ ...o, etapa: sig,
      proximaAccion: ACTIVAS.includes(sig) ? o.proximaAccion : "",
      fechaAccion: ACTIVAS.includes(sig) ? o.fechaAccion : "",
      fechaOC: sig === "oc" && !o.fechaOC ? hoy() : (o.fechaOC || ""),
      fechaPedido: sig === "pedido" && !o.fechaPedido ? hoy() : (o.fechaPedido || ""),
      fechaFactura: sig === "facturado" && !o.fechaFactura ? hoy() : (o.fechaFactura || "") });
  };

  const addMeta = (plazo) => {
    const texto = metaTxt[plazo].trim(); if (!texto) return;
    guardar({ ...data, metas: { ...data.metas, [plazo]: [...data.metas[plazo], { id: uid(), texto, hecha: false, inicio: "", fin: "" }] } });
    setMetaTxt({ ...metaTxt, [plazo]: "" });
  };
  const toggleMeta = (plazo, id) => guardar({ ...data, metas: { ...data.metas, [plazo]: data.metas[plazo].map((m) => m.id === id ? { ...m, hecha: !m.hecha } : m) } });
  const updMeta = (plazo, id, campos) => guardar({ ...data, metas: { ...data.metas, [plazo]: data.metas[plazo].map((m) => m.id === id ? { ...m, ...campos } : m) } });
  const delMeta = (plazo, id) => guardar({ ...data, metas: { ...data.metas, [plazo]: data.metas[plazo].filter((m) => m.id !== id) } });

  const addMejora = () => {
    const texto = mejTxt.trim(); if (!texto) return;
    guardar({ ...data, mejoras: [...(data.mejoras || []), { id: uid(), texto, hecha: false }] });
    setMejTxt("");
  };
  const toggleMejora = (id) => guardar({ ...data, mejoras: (data.mejoras || []).map((m) => m.id === id ? { ...m, hecha: !m.hecha } : m) });
  const delMejora = (id) => guardar({ ...data, mejoras: (data.mejoras || []).filter((m) => m.id !== id) });
  const cerrarIntro = (abrirManual) => { setVerIntro(false); if (abrirManual) setVerAyuda(true); };
  const aplicarAsistente = (sel) => {
    const ts = new Date().toISOString();
    const nm = { ...data.metas };
    sel.metas.forEach((m) => { const p = ["corto", "mediano", "largo"].includes(m.plazo) ? m.plazo : "corto"; nm[p] = [...nm[p], { id: uid(), texto: m.texto, hecha: false }]; });
    guardar({ ...data, metas: nm,
      tareas: [...sel.tareas.map((t) => ({ id: uid(), titulo: t.titulo, cliente: t.cliente || "", fecha: t.fecha || hoy(), horaInicio: t.horaInicio || "", horaFin: t.horaFin || "", fechaFin: t.fechaFin || "", prioridad: ["alta", "media", "baja"].includes(t.prioridad) ? t.prioridad : "media", comentarios: "", hecha: false, creada: ts })), ...data.tareas],
      pipeline: [...sel.oportunidades.map((o) => ({ id: uid(), cliente: o.cliente || "Cliente por definir", titulo: o.titulo || "", etapa: ETAPAS.some((e) => e.id === o.etapa) ? o.etapa : "visita", monto: o.monto ? Number(o.monto) : null, marca: "", plaza: "", proximaAccion: o.proximaAccion || "", fechaAccion: o.fechaAccion || "", notas: "Creada por el Asistente", creada: ts, actualizada: ts })), ...data.pipeline],
      tiempo: [...sel.tiempo.map((r) => ({ id: uid(), fecha: r.fecha || hoy(), categoria: CATS.some((c) => c.id === r.categoria) ? r.categoria : "Administrativo", cliente: r.cliente || "", minutos: Math.max(1, Math.round(+r.minutos || 0)) })), ...data.tiempo],
    });
    return { t: sel.tareas.length, o: sel.oportunidades.length, m: sel.metas.length, r: sel.tiempo.length };
  };
  const copiarMejoras = async () => {
    const pend = (data.mejoras || []).filter((m) => !m.hecha);
    const txt = [
      'Actualiza mi app "Brida" (PWA React, entrégala como index.html autónomo) con estas mejoras:',
      ...pend.map((m, i) => `${i + 1}. ${m.texto}`),
      "Conserva el diseño HMI, el guardado con localStorage (clave brida-v1) y todos los campos de datos existentes. Actualiza también el manual de ayuda y su sección de Novedades con la nueva versión.",
    ].join("\n");
    try { await navigator.clipboard.writeText(txt); setCopiadoM(true); setTimeout(() => setCopiadoM(false), 2000); }
    catch { setTextoManual(txt); }
  };

  /* ── Exportar y resumen ── */
  const expPipeline = () => descargar(`pipeline_monday_${hoy()}.csv`, aCSV([
    ["Name", "Etapa", "Cliente", "Monto (MXN)", "Margen (%)", "Marca", "Plaza", "Vendedor", "Cotización", "Fecha cotización", "OC cliente", "Fecha OC", "Pedido", "Fecha pedido", "Factura", "Fecha factura", "Próxima acción", "Fecha acción", "Notas", "Actualizada"],
    ...data.pipeline.map((o) => [`${o.cliente}${o.titulo ? " — " + o.titulo : ""}`, etapa(o.etapa).label, o.cliente, o.monto ?? "", o.margen ?? "", o.marca, o.plaza, o.vendedor || "", o.numCotizacion || "", o.fechaCotizacion || "", o.ocCliente || "", o.fechaOC || "", o.numPedido || "", o.fechaPedido || "", o.numFactura || "", o.fechaFactura || "", o.proximaAccion, o.fechaAccion, o.notas, (o.actualizada || "").slice(0, 10)]),
  ]));
  const expPipelineXLSX = () => {
    const filas = [
      ["Oportunidad", "Etapa", "Cliente", "Cotización", "Fecha cotización", "Monto (MXN)", "Monto (USD)", "Margen (%)", "OC cliente", "Fecha OC", "Pedido", "Fecha pedido", "Factura", "Fecha factura", "Utilidad (MXN)", "Comisión (%)", "Comisión (MXN)", "Pagada", "Vendedor", "Marca", "Plaza", "Próxima acción", "Fecha acción", "Notas", "Actualizada"],
      ...data.pipeline.map((o) => { const tc = data.tipoCambio || 0; const util = (o.monto || 0) * (o.margen || 0) / 100; const cp = o.comisionPct === "" || o.comisionPct == null ? "" : Number(o.comisionPct); const com = cp === "" ? "" : util * cp / 100; const usd = o.moneda === "USD" && o.montoOrig != null ? o.montoOrig : (tc > 0 && o.monto ? Math.round((o.monto / tc) * 100) / 100 : ""); return [`${o.cliente}${o.titulo ? " — " + o.titulo : ""}`, etapa(o.etapa).label, o.cliente, o.numCotizacion || "", o.fechaCotizacion || "", o.monto ?? "", usd, o.margen ?? "", o.ocCliente || "", o.fechaOC || "", o.numPedido || "", o.fechaPedido || "", o.numFactura || "", o.fechaFactura || "", o.etapa === "facturado" ? util : "", cp, o.etapa === "facturado" ? com : "", o.comisionPagada ? "Sí" : "No", o.vendedor || "", o.marca, o.plaza, o.proximaAccion, o.fechaAccion, o.notas, (o.actualizada || "").slice(0, 10)]; }),
    ];
    const tipos = ["text", "text", "text", "text", "text", "money", "money", "percent", "text", "text", "text", "text", "text", "text", "money", "percent", "money", "text", "text", "text", "text", "text", "text", "text", "text"];
    exportarXLSX(`pipeline_${hoy()}.xlsx`, "Pipeline", filas, tipos);
  };
  const expTareas = () => descargar(`pendientes_${hoy()}.csv`, aCSV([
    ["Name", "Estado", "Cliente", "Fecha", "Prioridad"],
    ...data.tareas.map((t) => [t.titulo, t.hecha ? "Hecha" : "Pendiente", t.cliente, t.fecha, t.prioridad || "media"]),
  ]));
  const expTiempo = () => descargar(`tiempo_${hoy()}.csv`, aCSV([
    ["Fecha", "Categoría", "Cliente", "Minutos"],
    ...data.tiempo.map((r) => [r.fecha, r.categoria, r.cliente, r.minutos]),
  ]));
  const expRespaldo = () => descargar(`respaldo_centro_control_${hoy()}.json`, JSON.stringify(data, null, 2), "application/json");
  const impRespaldo = (ev) => {
    const f = ev.target.files && ev.target.files[0]; if (!f) return;
    const lector = new FileReader();
    lector.onload = () => {
      try {
        const d = JSON.parse(lector.result);
        if (!d || !Array.isArray(d.tareas) || !Array.isArray(d.pipeline)) throw new Error("formato");
        if (window.confirm("Esto reemplazará los datos actuales por los del respaldo. ¿Continuar?")) guardar({ ...VACIO, ...d });
      } catch { window.alert("El archivo no es un respaldo válido del Brida."); }
    };
    lector.readAsText(f);
    ev.target.value = "";
  };
  const textoResumen = () => [
    `RESUMEN SEMANAL — ${fFecha(der.IS)} al ${fFecha(sumaDias(der.IS, 6))}`,
    `Tareas completadas: ${der.hechasSem.length}`,
    `Tiempo registrado: ${fMin(der.minSem)}${der.porCatSem[0] ? ` (principal: ${der.porCatSem[0].id} ${fMin(der.porCatSem[0].min)})` : ""}`,
    `Pipeline en juego: ${fMXN(der.enJuego)} · ${der.activas.length} oportunidades`,
    `Nuevas oportunidades: ${der.nuevasSem.length}`,
    `Ganado esta semana: ${fMXN(der.ganadasSem.reduce((s, o) => s + (o.monto || 0), 0))} (${der.ganadasSem.length})`,
    `Sin próxima acción: ${der.sinAccion.length}`,
  ].join("\n");
  const listaEnvio = () => {
    const sel = data.tareas
      .filter((t) => envFiltro === "todos" ? true : envFiltro === "comp" ? t.hecha : !t.hecha)
      .sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""));
    return { n: sel.length, txt: [`PENDIENTES — Brida (${fFecha(hoy())})`, ...sel.map((t) => `${t.hecha ? "☑" : "☐"} ${textoTarea(t)}`)].join("\n") };
  };
  const compartirLista = () => { const { n, txt } = listaEnvio(); if (n) compartirTexto("Pendientes — Brida", txt); };
  const copiarLista = async () => {
    const { n, txt } = listaEnvio(); if (!n) return;
    try { await navigator.clipboard.writeText(txt); setCopiadoT(true); setTimeout(() => setCopiadoT(false), 2000); }
    catch { setTextoManual(txt); }
  };
  const copiarResumen = async () => {
    const txt = textoResumen();
    try { await navigator.clipboard.writeText(txt); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }
    catch { setTextoManual(txt); }
  };

  const oppsFiltradas = data.pipeline
    .filter((o) => filtroE === "todas" ? true : o.etapa === filtroE)
    .filter((o) => { const q = busca.trim().toLowerCase(); return !q || [o.cliente, o.titulo, o.marca, o.plaza, o.vendedor, o.numCotizacion, o.ocCliente, o.numPedido, o.numFactura].some((v) => (v || "").toLowerCase().includes(q)); })
    .sort((a, b) => {
      const ia = ETAPAS.findIndex((e) => e.id === a.etapa), ib = ETAPAS.findIndex((e) => e.id === b.etapa);
      if (ia !== ib) return ia - ib;
      return (b.monto || 0) - (a.monto || 0);
    });

  const dotPend = der.vencidas.length ? C.rojo : der.deHoy.length ? C.ambar : C.verde;
  const dotPipe = der.sinAccion.length ? C.ambar : C.azul;
  const maxDia = Math.max(60, ...der.semDias.map((d) => d.min));

  const NAV = [
    { id: "hoy", icon: ListTodo, label: "Hoy" },
    { id: "tiempo", icon: Timer, label: "Tiempo" },
    { id: "pipeline", icon: Briefcase, label: "Pipeline" },
    { id: "clientes", icon: Building2, label: "Clientes" },
    { id: "cotiza", icon: FileText, label: "Cotiza" },
    { id: "metas", icon: Target, label: "Metas" },
    { id: "cierre", icon: FileDown, label: "Cierre" },
    { id: "comisiones", icon: Percent, label: "Comis." },
  ];

  return (
    <div className="min-h-screen" style={{ background: C.fondo, color: C.tinta }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        * { -webkit-tap-highlight-color: transparent; }
        input:focus, select:focus, textarea:focus { outline: 2px solid ${C.ambar}; outline-offset: -1px; }
        @keyframes pulsoK { 0%,100% { opacity: 1 } 50% { opacity: .35 } }
        .pulso { animation: pulsoK 1.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .pulso { animation: none } }
        ::-webkit-scrollbar { height: 0; width: 6px }
      `}</style>

      {/* ── Bisel superior: identidad + regleta de estado ── */}
      <header className="sticky top-0 z-40" style={{ background: C.bezel, borderBottom: `3px solid ${C.ambar}` }}>
        <div className="max-w-xl mx-auto px-4 pt-3 pb-2.5">
          <div className="flex items-end justify-between">
            <button onClick={() => setVerIntro(true)} aria-label="Volver a la pantalla de inicio" className="flex items-center gap-2">
              <Zap size={18} style={{ color: C.ambar }} />
              <span style={{ ...dsp, letterSpacing: "0.16em" }} className="text-lg font-bold uppercase" >
                <span style={{ color: "#fff" }}>Bri</span><span style={{ color: C.ambar }}>da</span>
              </span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ ...mono, color: "#8FA0B3" }}>{fHoyLargo()}</span>
              <button onClick={() => setVerCuenta(true)} aria-label="Cuenta y sincronización" className="rounded-lg px-2 py-1.5" style={{ background: C.bezel2, border: `1px solid ${C.bezel2}` }}>
                {sync === "local" || sync === "offline" ? <CloudOff size={15} style={{ color: SYNC_COL[sync] }} /> : <Cloud size={15} style={{ color: SYNC_COL[sync] }} />}
              </button>
              <button onClick={() => setVerVisitas(true)} aria-label="Visitas" className="rounded-lg px-2 py-1.5 relative" style={{ background: C.bezel2, border: `1px solid ${C.bezel2}` }}>
                <MapPin size={15} style={{ color: C.ambar }} />
                {(data.visitas || []).some((v) => v.fecha === der.H && !v.checkin) ? <span className="absolute -top-0.5 -right-0.5 rounded-full" style={{ width: 7, height: 7, background: C.ambar }} /> : null}
              </button>
              <button onClick={() => setVerAyuda(true)} aria-label="Manual de ayuda" className="rounded-lg px-2 py-1.5" style={{ background: C.bezel2, border: `1px solid ${C.bezel2}` }}>
                <HelpCircle size={15} style={{ color: "#C6D2DE" }} />
              </button>
              <button onClick={() => setVerAsis(true)} aria-label="Asistente por voz" className="rounded-lg px-2 py-1.5" style={{ background: C.bezel2, border: `1px solid ${C.bezel2}` }}>
                <Mic size={15} style={{ color: C.ambar }} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs" style={{ ...mono, color: "#C6D2DE" }}>
            <button onClick={() => setTab("tiempo")} className="flex items-center gap-1.5"><Dot color={data.timer ? C.rojo : der.minHoy ? C.verde : "#4A5A6C"} pulso={!!data.timer} />{data.timer ? fCrono(ahora - new Date(data.timer.inicio).getTime()) : fMin(der.minHoy)}</button>
            <button onClick={() => setTab("hoy")} className="flex items-center gap-1.5"><Dot color={dotPend} />{der.vencidas.length + der.deHoy.length} pend</button>
            <button onClick={() => setTab("pipeline")} className="flex items-center gap-1.5"><Dot color={dotPipe} />{fMXN(der.totCotizado)}</button>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pb-32 pt-3">
        {sinStorage && (
          <div className="rounded-xl border px-3 py-2 text-xs flex items-center gap-2 mb-2" style={{ borderColor: C.ambar, background: C.ambarBg, color: C.tinta }}>
            <AlertTriangle size={14} style={{ color: C.ambar }} /> Almacenamiento no disponible: los datos no se guardarán al salir.
          </div>
        )}

        {/* ════ HOY ════ */}
        {tab === "hoy" && (
          <div>
            <div className="rounded-xl border p-2.5" style={{ borderColor: C.borde, background: C.panel }}>
              <div className="flex gap-2">
                <input value={qaT} onChange={(e) => setQaT(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTarea()}
                  placeholder="Capturar pendiente…" className="flex-1 rounded-lg px-3 py-2.5 text-sm min-w-0" style={inp} />
                <button onClick={addTarea} aria-label="Agregar" className="px-3.5 rounded-lg" style={{ background: qaT.trim() ? C.tinta : C.borde, color: "#fff" }}><Plus size={20} /></button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2 items-center">
                {[["hoy", "Hoy"], ["manana", "Mañana"], ["otra", "Otra fecha"]].map(([id, lb]) => (
                  <button key={id} onClick={() => setQaF(id)} className="text-xs px-2.5 py-1 rounded-lg border font-semibold"
                    style={{ borderColor: qaF === id ? C.tinta : C.borde, color: qaF === id ? C.tinta : C.dim, background: qaF === id ? "#fff" : "transparent" }}>{lb}</button>
                ))}
                {qaF === "otra" && <input type="date" value={qaFO} onChange={(e) => setQaFO(e.target.value)} className="text-xs rounded-lg px-2 py-1" style={inp} />}
                <input type="time" value={qaH} onChange={(e) => setQaH(e.target.value)} title="Hora (opcional)" className="text-xs rounded-lg px-2 py-1" style={inp} />
              </div>
            </div>

            {der.pend.length === 0 && der.accionesHoy.length === 0 && data.pipeline.length === 0 && der.minHoy === 0 && (
              <div className="mt-4"><Vacio>Tablero nuevo. Captura tu primer pendiente arriba, registra tiempo en <b>Tiempo</b> o da de alta una oportunidad en <b>Pipeline</b>.</Vacio></div>
            )}

            {der.vencidas.length > 0 && (<>
              <Sec color={C.rojo} extra={<button onClick={todasManana} className="text-xs px-2 py-1 rounded-lg border" style={{ borderColor: C.borde, color: C.dim }}>Todas → mañana</button>}>Vencidas · {der.vencidas.length}</Sec>
              <div className="space-y-2">{der.vencidas.map((t) => (
                <TareaFila key={t.id} t={t} opps={der.activas} abierta={expand === t.id} onAbrir={() => setExpand(expand === t.id ? null : t.id)}
                  onToggle={() => toggleT(t.id)} onManana={() => mananaT(t.id)} onGuardar={(d) => guardarT(t.id, d)} onEliminar={() => delT(t.id)} />
              ))}</div>
            </>)}

            <Sec>Hoy · {der.deHoy.length}</Sec>
            {der.deHoy.length ? (
              <div className="space-y-2">{der.deHoy.map((t) => (
                <TareaFila key={t.id} t={t} opps={der.activas} abierta={expand === t.id} onAbrir={() => setExpand(expand === t.id ? null : t.id)}
                  onToggle={() => toggleT(t.id)} onManana={() => mananaT(t.id)} onGuardar={(d) => guardarT(t.id, d)} onEliminar={() => delT(t.id)} />
              ))}</div>
            ) : <Vacio>Sin pendientes para hoy. Tablero limpio.</Vacio>}

            {der.accionesHoy.length > 0 && (<>
              <Sec color={C.ambar}>Acciones de pipeline · {der.accionesHoy.length}</Sec>
              <div className="space-y-2">{der.accionesHoy.map((o) => (
                <button key={o.id} onClick={() => { setTab("pipeline"); setOppEdit(o); }} className="w-full text-left rounded-xl border px-3 py-2.5 flex items-center gap-3"
                  style={{ borderColor: C.ambar, background: C.ambarBg }}>
                  <Link2 size={16} style={{ color: C.ambar }} className="shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="text-sm block truncate" style={{ color: C.tinta }}><b>{o.cliente}</b> — {o.proximaAccion}</span>
                    <span className="text-xs" style={{ ...mono, color: o.fechaAccion < der.H ? C.rojo : C.dim }}>{fFecha(o.fechaAccion)}{o.fechaAccion < der.H ? " · vencida" : ""}</span>
                  </span>
                  <ChevronRight size={16} style={{ color: C.dim }} />
                </button>
              ))}</div>
            </>)}

            {der.proximas.length > 0 && (<>
              <Sec extra={<button onClick={() => setVerProx(!verProx)} style={{ color: C.dim }}><ChevronDown size={16} style={{ transform: verProx ? "rotate(180deg)" : "none" }} /></button>}>Próximos días · {der.proximas.length}</Sec>
              {verProx && <div className="space-y-2">{der.proximas.slice(0, 15).map((t) => (
                <TareaFila key={t.id} t={t} opps={der.activas} abierta={expand === t.id} onAbrir={() => setExpand(expand === t.id ? null : t.id)}
                  onToggle={() => toggleT(t.id)} onManana={() => mananaT(t.id)} onGuardar={(d) => guardarT(t.id, d)} onEliminar={() => delT(t.id)} />
              ))}</div>}
            </>)}

            {der.hechasHoy.length > 0 && (<>
              <Sec color={C.verde} extra={<button onClick={() => setVerHechas(!verHechas)} style={{ color: C.dim }}><ChevronDown size={16} style={{ transform: verHechas ? "rotate(180deg)" : "none" }} /></button>}>Completadas hoy · {der.hechasHoy.length}</Sec>
              {verHechas && <div className="space-y-2">{der.hechasHoy.map((t) => (
                <TareaFila key={t.id} t={t} opps={der.activas} abierta={false} onAbrir={() => {}} onToggle={() => toggleT(t.id)} onManana={() => {}} onGuardar={() => {}} onEliminar={() => delT(t.id)} />
              ))}</div>}
            </>)}

            <button onClick={() => setVerCierre(true)} className="w-full mt-6 py-3.5 rounded-xl font-bold uppercase"
              style={{ ...dsp, letterSpacing: "0.14em", background: C.bezel, color: C.ambar, border: `1px solid ${C.bezel}` }}>
              Cerrar el día
            </button>
          </div>
        )}

        {/* ════ TIEMPO ════ */}
        {tab === "tiempo" && (
          <div>
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: data.timer ? C.rojo : C.borde }}>
              {data.timer ? (
                <div className="p-4 text-center" style={{ background: C.panel }}>
                  <div className="flex items-center justify-center gap-2 text-xs uppercase font-semibold" style={{ ...dsp, color: C.rojo, letterSpacing: "0.12em" }}>
                    <Dot color={C.rojo} pulso /> Registrando · {data.timer.categoria}{data.timer.cliente ? ` · ${data.timer.cliente}` : ""}
                  </div>
                  <div className="text-5xl font-semibold my-3" style={{ ...mono, color: C.tinta }}>{fCrono(ahora - new Date(data.timer.inicio).getTime())}</div>
                  <button onClick={stopTimer} className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2" style={{ background: C.rojo, color: "#fff" }}>
                    <Square size={16} /> Detener y guardar
                  </button>
                </div>
              ) : (
                <div className="p-3" style={{ background: C.panel }}>
                  <div className="grid grid-cols-2 gap-1.5">
                    {CATS.map((c) => (
                      <button key={c.id} onClick={() => setSelCat(c.id)} className="text-xs px-2 py-2 rounded-lg border font-semibold text-left"
                        style={{ borderColor: selCat === c.id ? c.color : C.borde, color: selCat === c.id ? c.color : C.dim, background: selCat === c.id ? "#fff" : "transparent" }}>
                        {c.id}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <input value={selCli} onChange={(e) => setSelCli(e.target.value)} placeholder="Cliente (opcional)" className="flex-1 rounded-lg px-3 py-2.5 text-sm min-w-0" style={inp} />
                    <button onClick={iniTimer} className="px-4 rounded-lg font-semibold flex items-center gap-1.5" style={{ background: C.tinta, color: "#fff" }}><Play size={16} /> Iniciar</button>
                  </div>
                </div>
              )}
            </div>

            <button onClick={() => setVerManual(!verManual)} className="text-xs mt-3 px-3 py-1.5 rounded-lg border font-semibold" style={{ borderColor: C.borde, color: C.dim }}>
              + Registro manual
            </button>
            {verManual && (
              <div className="rounded-xl border p-3 mt-2 space-y-2" style={{ borderColor: C.borde, background: C.panel }}>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={mF} onChange={(e) => setMF(e.target.value)} className="rounded-lg px-3 py-2 text-sm" style={inp} />
                  <input type="number" inputMode="numeric" value={mMin} onChange={(e) => setMMin(e.target.value)} placeholder="Minutos" className="rounded-lg px-3 py-2 text-sm" style={{ ...inp, ...mono }} />
                </div>
                <select value={mC} onChange={(e) => setMC(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm" style={inp}>
                  {CATS.map((c) => <option key={c.id}>{c.id}</option>)}
                </select>
                <input value={mCli} onChange={(e) => setMCli(e.target.value)} placeholder="Cliente (opcional)" className="w-full rounded-lg px-3 py-2 text-sm" style={inp} />
                <button onClick={addManual} className="w-full py-2 rounded-lg text-sm font-semibold" style={{ background: C.tinta, color: "#fff" }}>Agregar registro</button>
              </div>
            )}

            <Sec>Hoy · <span style={mono}>{fMin(der.minHoy)}</span></Sec>
            {der.porCatHoy.length ? der.porCatHoy.map((c) => (
              <div key={c.id} className="mb-2">
                <div className="flex justify-between text-xs mb-1"><span style={{ color: C.tinta }}>{c.id}</span><span style={{ ...mono, color: C.dim }}>{fMin(c.min)}</span></div>
                <div className="h-2 rounded-full" style={{ background: "#DEE4EA" }}><div className="h-2 rounded-full" style={{ width: `${Math.min(100, (c.min / Math.max(1, der.minHoy)) * 100)}%`, background: c.color }} /></div>
              </div>
            )) : <Vacio>Sin tiempo registrado hoy. Inicia el cronómetro al comenzar tu siguiente actividad.</Vacio>}

            <Sec>Semana · <span style={mono}>{fMin(der.minSem)}</span></Sec>
            <div className="rounded-xl border p-3" style={{ borderColor: C.borde, background: C.panel }}>
              <div className="flex items-end justify-between gap-1.5" style={{ height: 76 }}>
                {der.semDias.map((d, i) => (
                  <div key={d.f} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                    <div className="w-full rounded-t" style={{ height: `${(d.min / maxDia) * 100}%`, minHeight: d.min ? 3 : 0, background: d.f === der.H ? C.ambar : "#B7C3CE" }} />
                    <span className="text-xs" style={{ ...mono, color: d.f === der.H ? C.tinta : C.dim }}>{"LMMJVSD"[i]}</span>
                  </div>
                ))}
              </div>
            </div>

            {data.tiempo.length > 0 && (<>
              <Sec>Registros recientes</Sec>
              <div className="space-y-1.5">
                {[...data.tiempo].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "") || (b.id || "").localeCompare(a.id || "")).slice(0, 12).map((r) => (
                  <div key={r.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: C.borde, background: C.panel }}>
                    <Dot color={catColor(r.categoria)} />
                    <span className="flex-1 truncate">{r.categoria}{r.cliente ? ` · ${r.cliente}` : ""}</span>
                    <span className="text-xs shrink-0" style={{ ...mono, color: r.fecha === der.H ? C.ambar : C.dim }}>{r.fecha === der.H ? "hoy" : fFecha(r.fecha)}</span>
                    <span style={{ ...mono, color: C.dim }}>{fMin(r.minutos)}</span>
                    <button onClick={() => delTiempo(r.id)} aria-label="Eliminar registro"><X size={14} style={{ color: C.dim }} /></button>
                  </div>
                ))}
              </div>
              <div className="text-xs mt-1.5" style={{ color: C.dim }}>Se muestran los 12 registros más recientes de cualquier día; toca la X para eliminar.</div>
            </>)}
          </div>
        )}

        {/* ════ PIPELINE ════ */}
        {tab === "pipeline" && (
          <div>
            {(() => {
              const H = hoy();
              const d7 = new Date(); d7.setDate(d7.getDate() + 7);
              const en7 = `${d7.getFullYear()}-${String(d7.getMonth() + 1).padStart(2, "0")}-${String(d7.getDate()).padStart(2, "0")}`;
              const seg = (data.pipeline || []).filter((o) => o.fechaAccion && !["facturado", "perdido"].includes(o.etapa));
              const venc = seg.filter((o) => o.fechaAccion < H).sort((a, b) => a.fechaAccion.localeCompare(b.fechaAccion));
              const hoyS = seg.filter((o) => o.fechaAccion === H);
              const prox = seg.filter((o) => o.fechaAccion > H && o.fechaAccion <= en7).sort((a, b) => a.fechaAccion.localeCompare(b.fechaAccion));
              if (!venc.length && !hoyS.length && !prox.length) return null;
              const fila = (o, col) => (
                <button key={o.id} onClick={() => setOppEdit(o)} className="w-full text-left flex items-center gap-2 py-1.5">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: col }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate" style={{ color: C.tinta }}>{o.cliente}{o.titulo ? ` — ${o.titulo}` : ""}</div>
                    <div className="text-xs truncate" style={{ color: C.dim }}>{o.proximaAccion || "Próxima acción"}</div>
                  </div>
                  <span className="text-xs whitespace-nowrap" style={{ ...mono, color: col }}>{o.fechaAccion.slice(5)}</span>
                </button>
              );
              return (
                <div className="rounded-xl border p-3 mb-3" style={{ borderColor: C.borde, background: C.panel }}>
                  <div className="text-xs uppercase font-semibold mb-1 flex items-center gap-1.5" style={{ ...dsp, color: C.dim, letterSpacing: "0.12em" }}>
                    <Send size={12} style={{ color: C.ambar }} /> Seguimiento
                  </div>
                  {venc.length ? <><div className="text-xs font-semibold mt-1" style={{ color: C.rojo }}>Vencidas ({venc.length})</div>{venc.slice(0, 6).map((o) => fila(o, C.rojo))}</> : null}
                  {hoyS.length ? <><div className="text-xs font-semibold mt-1" style={{ color: C.ambar }}>Para hoy ({hoyS.length})</div>{hoyS.map((o) => fila(o, C.ambar))}</> : null}
                  {prox.length ? <><div className="text-xs font-semibold mt-1" style={{ color: C.dim }}>Próximos 7 días ({prox.length})</div>{prox.slice(0, 6).map((o) => fila(o, C.azul))}</> : null}
                </div>
              );
            })()}
            <div className="rounded-xl border p-3" style={{ borderColor: C.borde, background: C.panel }}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs uppercase font-semibold" style={{ ...dsp, color: C.dim, letterSpacing: "0.12em" }}>Resumen del pipeline</div>
                <button onClick={() => setOppEdit({})} className="px-3 py-2 rounded-xl font-semibold flex items-center gap-1.5" style={{ background: C.tinta, color: "#fff" }}>
                  <Plus size={16} /> Nueva
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[["En juego", der.enJuego, C.ambar], ["Pedido", der.totPedido, C.teal], ["Facturado", der.totFacturado, "#1F7A55"]].map(([lb, val, col]) => (
                  <div key={lb} className="rounded-lg border p-2" style={{ borderColor: C.borde, background: "#fff" }}>
                    <div className="text-xs uppercase font-semibold" style={{ ...dsp, color: col, letterSpacing: "0.06em" }}>{lb}</div>
                    <div className="text-base font-semibold leading-tight" style={mono}>{fMXN(val)}</div>
                  </div>
                ))}
              </div>
              <div className="text-xs mt-2" style={{ color: C.dim }}>En juego = visita, cotizado y por cerrar · Pedido = OC y pedido (ya ganado) · Facturado = cobrado. Las tarjetas se ordenan por etapa y, dentro de cada una, por monto (mayor primero).</div>
              {(() => {
                const mesDe = (o) => ((o.etapa === "facturado" && o.fechaFactura) || (["pedido", "oc"].includes(o.etapa) && (o.fechaPedido || o.fechaOC)) || o.actualizada || o.creada || "").slice(0, 7);
                const meses = Array.from(new Set(data.pipeline.map(mesDe).filter(Boolean))).sort().reverse();
                if (!meses.length) return null;
                const sel = mesSel ? data.pipeline.filter((o) => mesDe(o) === mesSel) : [];
                const sum = (arr) => arr.reduce((s, o) => s + (o.monto || 0), 0);
                return (
                  <div className="mt-2 pt-2 border-t" style={{ borderColor: C.borde }}>
                    <div className="flex items-center gap-2">
                      <CalendarDays size={14} style={{ color: C.dim }} />
                      <select value={mesSel} onChange={(e) => setMesSel(e.target.value)} className="flex-1 rounded-lg px-2 py-1.5 text-sm" style={inp}>
                        <option value="">Acumulado por mes…</option>
                        {meses.map((m) => { const [a, mm] = m.split("-"); return <option key={m} value={m}>{MESES_L[+mm - 1]} {a}</option>; })}
                      </select>
                    </div>
                    {mesSel ? (
                      <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                        {[["Facturado", sum(sel.filter((o) => o.etapa === "facturado"))], ["Pedido", sum(sel.filter((o) => ["pedido", "oc"].includes(o.etapa)))], ["Movimientos", sel.length, true]].map(([lb, val, cnt]) => (
                          <div key={lb} className="rounded-lg border p-2" style={{ borderColor: C.borde, background: "#fff" }}>
                            <div className="text-xs" style={{ color: C.dim }}>{lb}</div>
                            <div className="text-sm font-semibold" style={mono}>{cnt ? val : fMXN(val)}</div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })()}
            </div>
            {der.sinAccion.length > 0 && (
              <div className="rounded-xl border px-3 py-2 mt-2 text-xs flex items-center gap-2" style={{ borderColor: C.ambar, background: C.ambarBg }}>
                <AlertTriangle size={14} style={{ color: C.ambar }} className="shrink-0" />
                <span><b>{der.sinAccion.length}</b> {der.sinAccion.length === 1 ? "oportunidad activa sin próxima acción" : "oportunidades activas sin próxima acción"}. Toda oportunidad viva necesita un siguiente paso con fecha.</span>
              </div>
            )}

            <div className="flex items-center gap-2 mt-3 rounded-lg border px-3 py-2" style={{ borderColor: C.borde, background: "#fff" }}>
              <Search size={15} style={{ color: C.dim }} />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente, vendedor, cotización, pedido, factura…" className="flex-1 text-sm min-w-0" style={{ background: "transparent", color: C.tinta }} />
              {busca && <button onClick={() => setBusca("")}><X size={14} style={{ color: C.dim }} /></button>}
            </div>
            <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
              {[{ id: "todas", label: "Todas" }, ...ETAPAS].map((e) => (
                <button key={e.id} onClick={() => setFiltroE(e.id)} className="text-xs px-2.5 py-1.5 rounded-lg border font-semibold whitespace-nowrap"
                  style={{ borderColor: filtroE === e.id ? C.tinta : C.borde, color: filtroE === e.id ? C.tinta : C.dim, background: filtroE === e.id ? "#fff" : "transparent" }}>
                  {e.label}{e.id !== "activas" && e.id !== "todas" ? ` · ${data.pipeline.filter((o) => o.etapa === e.id).length}` : ""}
                </button>
              ))}
            </div>

            <button onClick={() => setVerComision(true)} className="w-full mt-2 py-2.5 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2" style={{ borderColor: C.verde, background: C.verdeBg, color: "#1F7A55" }}>
              <Percent size={15} /> Calcular comisiones
            </button>
            <button onClick={() => setVerSeguimiento(true)} className="w-full mt-2 py-2.5 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2" style={{ borderColor: C.azul, background: C.azulBg, color: "#2C5A8F" }}>
              <Send size={15} /> Pedir estatus a vendedores
            </button>

            <div className="space-y-2 mt-2">
              {oppsFiltradas.length === 0 && <Vacio>Sin oportunidades aquí. Cada acuerdo de visita o cotización enviada merece una tarjeta.</Vacio>}
              {oppsFiltradas.map((o) => {
                const e = etapa(o.etapa);
                const venc = o.fechaAccion && o.fechaAccion < der.H && ACTIVAS.includes(o.etapa);
                return (
                  <div key={o.id} className="rounded-xl border p-3" style={{ borderColor: venc ? C.rojo : C.borde, background: C.panel }}>
                    <button className="w-full text-left" onClick={() => setOppEdit(o)}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">{o.cliente}</div>
                          {o.titulo && <div className="text-xs truncate" style={{ color: C.dim }}>{o.titulo}</div>}
                        </div>
                        <div className="text-sm font-semibold shrink-0" style={mono}>{fMXN(o.monto)}</div>
                      </div>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <Etiqueta e={e} />
                        {o.marca && <span className="text-xs px-1.5 py-0.5 rounded border" style={{ borderColor: C.borde, color: C.dim }}>{o.marca}</span>}
                        {o.plaza && <span className="text-xs" style={{ color: C.dim }}>{o.plaza}</span>}
                        {o.vendedor && <span className="text-xs px-1.5 py-0.5 rounded border flex items-center gap-1" style={{ borderColor: C.borde, color: C.dim }}><User size={10} />{o.vendedor}</span>}
                        {o.numCotizacion || o.fechaCotizacion ? <span className="text-xs px-1.5 py-0.5 rounded border" style={{ ...mono, borderColor: C.borde, color: C.dim }}>Cot{o.numCotizacion ? ` ${o.numCotizacion}` : ""}{o.fechaCotizacion ? ` · ${fFecha(o.fechaCotizacion)}` : ""}</span> : null}
                        {o.ocCliente || o.fechaOC ? <span className="text-xs px-1.5 py-0.5 rounded border" style={{ ...mono, borderColor: C.borde, color: C.dim }}>OC{o.ocCliente ? ` ${o.ocCliente}` : ""}{o.fechaOC ? ` · ${fFecha(o.fechaOC)}` : ""}</span> : null}
                        {o.numPedido || o.fechaPedido ? <span className="text-xs px-1.5 py-0.5 rounded border" style={{ ...mono, borderColor: C.borde, color: C.dim }}>Ped{o.numPedido ? ` ${o.numPedido}` : ""}{o.fechaPedido ? ` · ${fFecha(o.fechaPedido)}` : ""}</span> : null}
                        {o.numFactura || o.fechaFactura ? <span className="text-xs px-1.5 py-0.5 rounded border" style={{ ...mono, borderColor: C.borde, color: C.dim }}>Fac{o.numFactura ? ` ${o.numFactura}` : ""}{o.fechaFactura ? ` · ${fFecha(o.fechaFactura)}` : ""}</span> : null}
                        {o.moneda === "USD" && o.montoOrig ? <span className="text-xs px-1.5 py-0.5 rounded border" style={{ ...mono, borderColor: C.azul, color: C.azul }}>US$ {new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 }).format(o.montoOrig)}</span> : null}
                        {o.margen || o.margen === 0 ? <span className="text-xs px-1.5 py-0.5 rounded border" style={{ ...mono, borderColor: C.verde, color: "#1F7A55" }}>{o.margen}% mg</span> : null}
                      </div>
                      <div className="text-xs mt-2 flex items-center gap-1.5" style={{ color: o.proximaAccion ? (venc ? C.rojo : C.tinta) : C.ambar }}>
                        {o.proximaAccion
                          ? (<><ArrowRight size={12} className="shrink-0" /><span className="truncate">{o.proximaAccion}</span><span style={{ ...mono, color: venc ? C.rojo : C.dim }} className="shrink-0">{fFecha(o.fechaAccion)}</span></>)
                          : ACTIVAS.includes(o.etapa) ? (<><AlertTriangle size={12} className="shrink-0" /> Define la próxima acción</>) : null}
                      </div>
                    </button>
                    {FLUJO.includes(o.etapa) && o.etapa !== "facturado" && (
                      <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                        <button onClick={() => avanzar(o)} className="text-xs px-2.5 py-1.5 rounded-lg border font-semibold flex items-center gap-1" style={{ borderColor: C.borde, color: C.verde }}>
                          Avanzar a {etapa(FLUJO[FLUJO.indexOf(o.etapa) + 1]).label} <ChevronRight size={13} />
                        </button>
                        {ACTIVAS.includes(o.etapa) && o.proximaAccion && o.fechaAccion && (
                          <button onClick={() => abrirGCal({ titulo: `${o.cliente}: ${o.proximaAccion}`, fecha: o.fechaAccion, detalles: o.titulo || "Próxima acción de pipeline" })} className="text-xs px-2.5 py-1.5 rounded-lg border font-semibold flex items-center gap-1" style={{ borderColor: C.borde, color: C.azul }}>
                            <CalendarPlus size={13} /> Agendar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ════ METAS ════ */}
        {tab === "clientes" && (
          <div>
            <div className="rounded-xl border p-3" style={{ borderColor: C.borde, background: C.panel }}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs uppercase font-semibold" style={{ ...dsp, color: C.dim, letterSpacing: "0.12em" }}>Clientes ({(data.clientes || []).length})</div>
                <button onClick={() => setCliEdit({})} className="px-3 py-2 rounded-xl font-semibold flex items-center gap-1.5" style={{ background: C.tinta, color: "#fff" }}>
                  <Plus size={16} /> Nuevo
                </button>
              </div>
              <div className="relative mb-2">
                <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: C.dim }} />
                <input value={buscarCli} onChange={(e) => setBuscarCli(e.target.value)} placeholder="Buscar cliente…" className="w-full rounded-lg pl-8 pr-3 py-2 text-sm" style={inp} />
              </div>
              {(data.clientes || []).length === 0 ? (
                <div className="text-sm text-center py-6" style={{ color: C.dim }}>Aún no tienes clientes. Toca «Nuevo» para crear tu primera cuenta.</div>
              ) : (
                <div className="space-y-1.5">
                  {(data.clientes || []).filter((c) => !buscarCli || (c.nombre || "").toLowerCase().includes(buscarCli.toLowerCase())).map((c) => {
                    const est = ESTADOS_CLIENTE.find((s) => s.id === c.estado) || ESTADOS_CLIENTE[0];
                    const nCt = (data.contactos || []).filter((ct) => ct.clienteId === c.id).length;
                    const tipoLb = (TIPOS_CLIENTE.find((t) => t.id === c.tipo) || {}).label || "";
                    return (
                      <button key={c.id} onClick={() => setCliEdit(c)} className="w-full text-left rounded-xl border px-3 py-2.5 flex items-center gap-3" style={{ borderColor: C.borde, background: "#fff" }}>
                        <Building2 size={18} style={{ color: est.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate" style={{ color: C.tinta }}>{c.nombre}</div>
                          <div className="text-xs truncate" style={{ color: C.dim }}>{[tipoLb, c.plaza, nCt ? `${nCt} contacto${nCt > 1 ? "s" : ""}` : ""].filter(Boolean).join(" · ") || "Sin datos adicionales"}</div>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap" style={{ color: est.color, background: est.color + "22" }}>{est.label}</span>
                        <ChevronRight size={16} style={{ color: C.dim }} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="text-xs mt-3 px-1" style={{ color: C.dim }}>Las oportunidades se ligan al cliente por su nombre. Escríbelo igual en el pipeline y en la ficha para verlas juntas.</div>
          </div>
        )}
        {tab === "cotiza" && (
          <div>
            <div className="rounded-xl border p-3" style={{ borderColor: C.borde, background: C.panel }}>
              <div className="flex items-center justify-between mb-2 gap-2">
                <div className="text-xs uppercase font-semibold" style={{ ...dsp, color: C.dim, letterSpacing: "0.12em" }}>Cotizaciones ({(data.cotizaciones || []).length})</div>
                <div className="flex gap-1.5">
                  <button onClick={() => setCatOpen(true)} className="px-2.5 py-2 rounded-xl border font-semibold flex items-center gap-1.5 text-sm" style={{ borderColor: C.borde, color: C.tinta, background: "#fff" }}><Package size={15} /> Catálogo</button>
                  <button onClick={() => setCotEdit({})} className="px-3 py-2 rounded-xl font-semibold flex items-center gap-1.5" style={{ background: C.tinta, color: "#fff" }}><Plus size={16} /> Nueva</button>
                </div>
              </div>
              {(data.cotizaciones || []).length === 0 ? (
                <div className="text-sm text-center py-6" style={{ color: C.dim }}>Sin cotizaciones. Toca «Nueva» para crear la primera. Tip: llena tu «Catálogo» para armarlas en segundos.</div>
              ) : (
                <div className="space-y-1.5">
                  {(data.cotizaciones || []).map((c) => {
                    const st = ESTADOS_COTIZACION.find((s) => s.id === c.estado) || ESTADOS_COTIZACION[0];
                    const t = totalesCot(c);
                    return (
                      <button key={c.id} onClick={() => setCotEdit(c)} className="w-full text-left rounded-xl border px-3 py-2.5 flex items-center gap-3" style={{ borderColor: C.borde, background: "#fff" }}>
                        <FileText size={18} style={{ color: st.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate" style={{ color: C.tinta }}>{c.cliente || "Sin cliente"}</div>
                          <div className="text-xs truncate" style={{ color: C.dim }}>{[c.folio, c.fecha, `${(c.partidas || []).length} part.`].filter(Boolean).join(" · ")}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold" style={mono}>{fMXN(t.total)}{c.moneda === "USD" ? " USD" : ""}</div>
                          <span className="text-xs font-semibold" style={{ color: st.color }}>{st.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
        {tab === "metas" && (
          <div>
            <div className="text-xs" style={{ color: C.dim }}>Metas y proyectos. Toca una meta para ponerle fecha de inicio y fin: las que tengan ambas aparecen en el cronograma. Revísalas cada viernes — una meta sin acción es solo un deseo.</div>
            {(() => {
              const items = [];
              [["corto", C.azul], ["mediano", C.ambar], ["largo", C.morado]].forEach(([p, col]) => (data.metas[p] || []).forEach((m) => { if (m.inicio && m.fin && m.fin >= m.inicio) items.push({ ...m, col }); }));
              if (!items.length) return null;
              const dias = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
              const d0 = items.reduce((s, x) => (x.inicio < s ? x.inicio : s), hoy());
              const d1 = items.reduce((s, x) => (x.fin > s ? x.fin : s), hoy());
              const total = Math.max(1, dias(d0, d1));
              const pct = (f) => Math.min(100, Math.max(0, (dias(d0, f) / total) * 100));
              return (
                <div>
                  <Sec>Cronograma</Sec>
                  <div className="rounded-xl border p-3" style={{ borderColor: C.borde, background: C.panel }}>
                    <div className="flex justify-between text-xs mb-2" style={{ ...mono, color: C.dim }}><span>{fFecha(d0)}</span><span>{fFecha(d1)}</span></div>
                    <div className="relative space-y-1.5">
                      <div className="absolute top-0 bottom-0 z-10" style={{ left: `${pct(hoy())}%`, width: 2, background: C.rojo, opacity: 0.6 }} />
                      {items.sort((a, b) => a.inicio.localeCompare(b.inicio)).map((m) => (
                        <div key={m.id} className="relative h-5 rounded" style={{ background: "#E3E9EF" }}>
                          <div className="absolute top-0 h-5 rounded flex items-center px-1.5 overflow-hidden" style={{ left: `${pct(m.inicio)}%`, width: `${Math.max(4, pct(m.fin) - pct(m.inicio))}%`, background: m.hecha ? C.verde : m.col, opacity: m.hecha ? 0.55 : 0.92 }}>
                            <span className="text-xs truncate" style={{ color: "#fff" }}>{m.texto}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="text-xs mt-2" style={{ color: C.dim }}>Línea roja = hoy · color por plazo · verde tenue = cumplida.</div>
                  </div>
                </div>
              );
            })()}
            {[["corto", "Corto plazo", "1–3 meses"], ["mediano", "Mediano plazo", "3–12 meses"], ["largo", "Largo plazo", "1–3 años"]].map(([plazo, titulo, sub]) => (
              <div key={plazo}>
                <Sec extra={<span className="text-xs" style={{ ...mono, color: C.dim }}>{sub}</span>}>{titulo}</Sec>
                <div className="rounded-xl border p-2.5 space-y-1.5" style={{ borderColor: C.borde, background: C.panel }}>
                  {data.metas[plazo].map((m) => (
                    <div key={m.id}>
                      <div className="flex items-center gap-2.5 px-1 py-1">
                        <button onClick={() => toggleMeta(plazo, m.id)}>{m.hecha ? <CheckCircle2 size={19} style={{ color: C.verde }} /> : <Circle size={19} style={{ color: C.dim }} />}</button>
                        <button className="flex-1 text-left min-w-0" onClick={() => setExpMeta(expMeta && expMeta.id === m.id ? null : { plazo, id: m.id })}>
                          <span className={m.hecha ? "block text-sm line-through" : "block text-sm"} style={{ color: m.hecha ? C.dim : C.tinta }}>{m.texto}</span>
                          {(m.inicio || m.fin) ? <span className="block text-xs" style={{ ...mono, color: C.dim }}>{m.inicio ? fFecha(m.inicio) : "…"} → {m.fin ? fFecha(m.fin) : "…"}</span> : null}
                        </button>
                        <button onClick={() => delMeta(plazo, m.id)}><X size={14} style={{ color: C.dim }} /></button>
                      </div>
                      {expMeta && expMeta.id === m.id ? (
                        <div className="grid grid-cols-2 gap-2 px-1 pb-2">
                          <div><div className="text-xs mb-1" style={{ color: C.dim }}>Inicio</div>
                            <input type="date" value={m.inicio || ""} onChange={(e) => updMeta(plazo, m.id, { inicio: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm" style={inp} /></div>
                          <div><div className="text-xs mb-1" style={{ color: C.dim }}>Fin</div>
                            <input type="date" value={m.fin || ""} onChange={(e) => updMeta(plazo, m.id, { fin: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm" style={inp} /></div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <input value={metaTxt[plazo]} onChange={(e) => setMetaTxt({ ...metaTxt, [plazo]: e.target.value })} onKeyDown={(e) => e.key === "Enter" && addMeta(plazo)}
                      placeholder="Agregar meta…" className="flex-1 rounded-lg px-3 py-2 text-sm min-w-0" style={inp} />
                    <button onClick={() => addMeta(plazo)} className="px-3 rounded-lg" style={{ background: C.tinta, color: "#fff" }}><Plus size={16} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ════ CIERRE ════ */}
        {tab === "cierre" && (
          <div>
            <Sec>Cierre de semana · <span style={mono}>{fFecha(der.IS)} – {fFecha(sumaDias(der.IS, 6))}</span></Sec>
            <div className="rounded-xl border divide-y" style={{ borderColor: C.borde, background: C.panel }}>
              {[
                ["Tareas completadas", der.hechasSem.length],
                ["Tiempo registrado", fMin(der.minSem)],
                ["Pipeline en juego", `${fMXN(der.enJuego)} · ${der.activas.length}`],
                ["Nuevas oportunidades", der.nuevasSem.length],
                ["Ganado esta semana", `${fMXN(der.ganadasSem.reduce((s, o) => s + (o.monto || 0), 0))} · ${der.ganadasSem.length}`],
                ["Sin próxima acción", der.sinAccion.length],
              ].map(([k, v], i) => (
                <div key={i} className="flex justify-between px-3 py-2.5 text-sm" style={{ borderColor: C.borde }}>
                  <span style={{ color: C.dim }}>{k}</span><span className="font-semibold" style={mono}>{v}</span>
                </div>
              ))}
            </div>
            <button onClick={copiarResumen} className="w-full mt-2.5 py-2.5 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2" style={{ borderColor: C.borde, background: "#fff", color: C.tinta }}>
              {copiado ? <><Check size={16} style={{ color: C.verde }} /> Copiado</> : <><Copy size={15} /> Copiar resumen para reporte</>}
            </button>

            <Sec>Exportar a Monday</Sec>
            <div className="text-xs mb-2" style={{ color: C.dim }}>En Monday: tablero → <b>Importar datos → Excel/CSV</b>. La primera columna se convierte en el nombre del elemento y cada columna se mapea al tablero.</div>
            <div className="space-y-2">
              {[
                ["Pipeline en Excel (formato moneda)", `${data.pipeline.length} oportunidades · XLSX`, expPipelineXLSX],
                ["Pipeline para Monday", `${data.pipeline.length} oportunidades · CSV`, expPipeline],
                ["Pendientes", `${data.tareas.length} tareas · CSV`, expTareas],
                ["Registro de tiempo", `${data.tiempo.length} registros · CSV`, expTiempo],
              ].map(([t, s, fn], i) => (
                <button key={i} onClick={fn} className="w-full rounded-xl border px-3 py-3 flex items-center gap-3 text-left" style={{ borderColor: C.borde, background: C.panel }}>
                  <FileDown size={18} style={{ color: i === 0 ? "#1F7A55" : C.azul }} className="shrink-0" />
                  <span className="flex-1"><span className="text-sm font-semibold block">{t}</span><span className="text-xs" style={{ color: C.dim }}>{s}</span></span>
                  <ChevronRight size={16} style={{ color: C.dim }} />
                </button>
              ))}
            </div>
            <div className="text-xs mt-3 flex items-start gap-1.5" style={{ color: C.dim }}>
              <CalendarDays size={13} className="shrink-0 mt-0.5" /> Exporta cada viernes: te sirve de respaldo y deja Monday al día en una sola importación.
            </div>

            <Sec>Enviar a Google Tasks / Keep</Sec>
            <div className="rounded-xl border p-2.5" style={{ borderColor: C.borde, background: C.panel }}>
              <div className="flex gap-1.5">
                {[["pend", "Pendientes"], ["comp", "Completados"], ["todos", "Todos"]].map(([id, lb]) => (
                  <button key={id} onClick={() => setEnvFiltro(id)} className="flex-1 text-xs px-2 py-1.5 rounded-lg border font-semibold"
                    style={{ borderColor: envFiltro === id ? C.tinta : C.borde, color: envFiltro === id ? C.tinta : C.dim, background: envFiltro === id ? "#fff" : "transparent" }}>{lb}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button onClick={compartirLista} className="py-2.5 rounded-lg border text-sm font-semibold flex items-center justify-center gap-2" style={{ borderColor: C.azul, background: "#fff", color: C.azul }}>
                  <Share2 size={15} /> Compartir
                </button>
                <button onClick={copiarLista} className="py-2.5 rounded-lg border text-sm font-semibold flex items-center justify-center gap-2" style={{ borderColor: C.borde, background: "#fff", color: C.tinta }}>
                  {copiadoT ? <><Check size={15} style={{ color: C.verde }} /> Copiado</> : <><Copy size={14} /> Copiar lista</>}
                </button>
              </div>
              <div className="text-xs mt-2" style={{ color: C.dim }}>
                {listaEnvio().n} {listaEnvio().n === 1 ? "elemento" : "elementos"} con el filtro actual. Compartir abre el menú de Android: elige <b>Tasks</b> (crea una tarea con la lista) o <b>Keep</b> (crea una nota). Para pasar pendientes <b>uno por uno</b> a Tasks, usa el botón de compartir dentro de cada pendiente.
              </div>
            </div>

            <Sec>Respaldo de datos</Sec>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={expRespaldo} className="rounded-xl border px-3 py-3 flex items-center justify-center gap-2 text-sm font-semibold" style={{ borderColor: C.borde, background: C.panel, color: C.tinta }}>
                <Download size={16} style={{ color: C.azul }} /> Exportar
              </button>
              <label className="rounded-xl border px-3 py-3 flex items-center justify-center gap-2 text-sm font-semibold" style={{ borderColor: C.borde, background: C.panel, color: C.tinta, cursor: "pointer" }}>
                <Upload size={16} style={{ color: C.verde }} /> Importar
                <input type="file" accept=".json,application/json" onChange={impRespaldo} className="hidden" />
              </label>
            </div>
            <div className="text-xs mt-1.5 mb-1" style={{ color: C.dim }}>Respaldo completo en un archivo .json. Súbelo a tu Drive de vez en cuando; si cambias de teléfono o de navegador, restáuralo con Importar.</div>

            <Sec color={C.ambar}>Mejoras de la app</Sec>
            <div className="rounded-xl border p-2.5" style={{ borderColor: C.borde, background: C.panel }}>
              <div className="text-xs mb-2 flex items-start gap-1.5" style={{ color: C.dim }}>
                <Lightbulb size={13} className="shrink-0 mt-0.5" style={{ color: C.ambar }} /> ¿Algo te estorbó hoy? Anótalo aquí. El viernes, copia la lista y pégasela a Claude para recibir la siguiente versión.
              </div>
              <div className="space-y-1.5">
                {(data.mejoras || []).map((m) => (
                  <div key={m.id} className="flex items-center gap-2.5 px-1 py-1">
                    <button onClick={() => toggleMejora(m.id)}>{m.hecha ? <CheckCircle2 size={19} style={{ color: C.verde }} /> : <Circle size={19} style={{ color: C.dim }} />}</button>
                    <span className={m.hecha ? "flex-1 text-sm line-through" : "flex-1 text-sm"} style={{ color: m.hecha ? C.dim : C.tinta }}>{m.texto}</span>
                    <button onClick={() => delMejora(m.id)}><X size={14} style={{ color: C.dim }} /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-1.5">
                <input value={mejTxt} onChange={(e) => setMejTxt(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addMejora()}
                  placeholder="Ej. Quiero duplicar cotizaciones…" className="flex-1 rounded-lg px-3 py-2 text-sm min-w-0" style={inp} />
                <button onClick={addMejora} aria-label="Agregar mejora" className="px-3 rounded-lg" style={{ background: C.tinta, color: "#fff" }}><Plus size={16} /></button>
              </div>
              {(data.mejoras || []).some((m) => !m.hecha) && (
                <button onClick={copiarMejoras} className="w-full mt-2 py-2.5 rounded-lg border text-sm font-semibold flex items-center justify-center gap-2" style={{ borderColor: C.ambar, background: C.ambarBg, color: C.tinta }}>
                  {copiadoM ? <><Check size={16} style={{ color: C.verde }} /> Listo: pégalo en el chat</> : <><Copy size={15} /> Copiar lista para Claude</>}
                </button>
              )}
            </div>
            <div className="text-xs text-center mt-4" style={{ ...mono, color: C.dim }}>Brida v3.3 · PWA · nube</div>
          </div>
        )}

        {/* ════ COMISIONES ════ */}
        {tab === "comisiones" && (() => {
          const facturadas = data.pipeline.filter((o) => o.etapa === "facturado");
          const mesesCom = Array.from(new Set(facturadas.map((o) => (o.fechaFactura || "").slice(0, 7)).filter(Boolean))).sort().reverse();
          const filtradas = mesCom ? facturadas.filter((o) => (o.fechaFactura || "").slice(0, 7) === mesCom) : facturadas;
          const calc = filtradas.map((o) => {
            const monto = o.monto || 0, mg = o.margen || 0, util = monto * mg / 100;
            const pct = o.comisionPct === "" || o.comisionPct == null ? 0 : Number(o.comisionPct);
            return { o, monto, mg, util, pct, com: util * pct / 100 };
          }).sort((a, b) => (b.o.fechaFactura || "").localeCompare(a.o.fechaFactura || "") || b.com - a.com);
          const utilTotal = calc.reduce((s, x) => s + x.util, 0);
          const comTotal = calc.reduce((s, x) => s + x.com, 0);
          const comPagada = calc.filter((x) => x.o.comisionPagada).reduce((s, x) => s + x.com, 0);
          const comPend = comTotal - comPagada;
          return (
            <div>
              <div className="rounded-xl border p-2.5" style={{ borderColor: C.borde, background: C.panel }}>
                <div className="flex items-center gap-2">
                  <CalendarDays size={15} style={{ color: C.dim }} />
                  <select value={mesCom} onChange={(e) => setMesCom(e.target.value)} className="flex-1 rounded-lg px-2 py-1.5 text-sm" style={inp}>
                    <option value="">Todos los meses</option>
                    {mesesCom.map((m) => { const [a, mm] = m.split("-"); return <option key={m} value={m}>{MESES_L[+mm - 1]} {a}</option>; })}
                  </select>
                </div>
              </div>

              <Sec>Resumen{mesCom ? " del mes" : " total"}</Sec>
              <div className="grid grid-cols-2 gap-2">
                {[["Utilidad total", utilTotal, C.tinta], ["Comisión total", comTotal, "#1F7A55"], ["Comisión pagada", comPagada, C.azul], ["Pendiente de pago", comPend, C.ambar]].map(([lb, val, col]) => (
                  <div key={lb} className="rounded-xl border p-3" style={{ borderColor: C.borde, background: C.panel }}>
                    <div className="text-xs uppercase font-semibold" style={{ ...dsp, color: col, letterSpacing: "0.06em" }}>{lb}</div>
                    <div className="text-lg font-semibold" style={mono}>{fMXN(val)}</div>
                  </div>
                ))}
              </div>
              <div className="text-xs mt-2" style={{ color: C.dim }}>La utilidad es monto × margen; tu comisión es utilidad × tu %. El % es propio de cada oportunidad. Todo se alimenta de las oportunidades en etapa Facturado.</div>

              <Sec>Facturadas · {calc.length}</Sec>
              {calc.length === 0 ? (
                <Vacio>Aún no hay oportunidades facturadas{mesCom ? " en este mes" : ""}. Avanza una oportunidad a Facturado en el Pipeline y captura su margen para que aparezca aquí.</Vacio>
              ) : (
                <div className="space-y-2">
                  {calc.map(({ o, monto, mg, util, pct, com }) => (
                    <div key={o.id} className="rounded-xl border p-3" style={{ borderColor: o.comisionPagada ? C.verde : C.borde, background: C.panel }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">{o.cliente}</div>
                          {o.titulo ? <div className="text-xs truncate" style={{ color: C.dim }}>{o.titulo}</div> : null}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-semibold" style={mono}>{fMXN(monto)}</div>
                          {o.fechaFactura ? <div className="text-xs" style={{ ...mono, color: C.dim }}>{fFecha(o.fechaFactura)}</div> : null}
                        </div>
                      </div>
                      <div className="text-xs mt-1.5" style={{ color: C.dim }}>Margen {mg || 0}% · Utilidad <span style={{ ...mono, color: C.tinta }}>{fMXN(util)}</span></div>
                      <div className="flex items-center gap-2 mt-2.5">
                        <div className="flex items-center gap-1.5 rounded-lg border px-2 py-1.5" style={{ borderColor: C.borde, background: "#fff" }}>
                          <span className="text-xs" style={{ color: C.dim }}>Comisión</span>
                          <input type="number" inputMode="decimal" value={o.comisionPct ?? ""} onChange={(e) => setOppCampos(o.id, { comisionPct: e.target.value === "" ? "" : Number(e.target.value) })}
                            placeholder="0" className="w-12 text-sm text-right" style={{ ...mono, background: "transparent", color: C.tinta, border: "none" }} />
                          <span className="text-xs" style={{ color: C.dim }}>%</span>
                        </div>
                        <div className="text-sm font-semibold" style={{ ...mono, color: "#1F7A55" }}>= {fMXN(com)}</div>
                        <button onClick={() => setOppCampos(o.id, { comisionPagada: !o.comisionPagada })} className="ml-auto text-xs px-2.5 py-1.5 rounded-lg border font-semibold flex items-center gap-1"
                          style={{ borderColor: o.comisionPagada ? C.verde : C.borde, color: o.comisionPagada ? "#1F7A55" : C.dim, background: o.comisionPagada ? C.verdeBg : "#fff" }}>
                          {o.comisionPagada ? <><Check size={13} /> Pagado</> : "Marcar pagado"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </main>

      {/* ── Bisel inferior: navegación ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40" style={{ background: C.bezel, borderTop: `1px solid ${C.bezel2}` }}>
        <div className="max-w-xl mx-auto flex">
          {NAV.map((n) => {
            const activo = tab === n.id;
            return (
              <button key={n.id} onClick={() => { setTab(n.id); setExpand(null); }} className="flex-1 py-2 flex flex-col items-center gap-0.5" style={{ borderTop: `2px solid ${activo ? C.ambar : "transparent"}` }}>
                <n.icon size={17} style={{ color: activo ? C.ambar : "#7C8DA0" }} />
                <span className="font-semibold uppercase" style={{ ...dsp, fontSize: 8, letterSpacing: "0.04em", color: activo ? "#fff" : "#7C8DA0" }}>{n.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Modal: cierre del día ── */}
      {verCierre && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(20,28,38,0.55)" }} onClick={() => setVerCierre(false)}>
          <div className="rounded-t-2xl max-h-full overflow-y-auto w-full max-w-xl mx-auto" style={{ background: C.fondo }} onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b" style={{ background: C.bezel, borderColor: C.bezel2 }}>
              <span style={{ ...dsp, letterSpacing: "0.14em" }} className="uppercase font-bold" ><span style={{ color: "#fff" }}>Cierre del</span> <span style={{ color: C.ambar }}>día</span></span>
              <button onClick={() => setVerCierre(false)}><X size={20} style={{ color: "#8FA0B3" }} /></button>
            </div>
            <div className="p-4 pb-8 space-y-4">
              <div className="rounded-xl border px-3 py-2.5 flex justify-between items-center" style={{ borderColor: C.verde, background: C.verdeBg }}>
                <span className="text-sm" style={{ color: C.tinta }}>Completadas hoy</span>
                <span className="font-semibold" style={{ ...mono, color: C.verde }}>{der.hechasHoy.length}</span>
              </div>
              <div className="rounded-xl border px-3 py-2.5 flex justify-between items-center" style={{ borderColor: C.borde, background: C.panel }}>
                <span className="text-sm" style={{ color: C.tinta }}>Tiempo registrado</span>
                <span className="font-semibold" style={mono}>{fMin(der.minHoy)}{der.porCatHoy[0] ? ` · ${der.porCatHoy[0].id}` : ""}</span>
              </div>

              {(der.vencidas.length + der.deHoy.length) > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold" style={{ color: C.rojo }}>Sin terminar · {der.vencidas.length + der.deHoy.length}</span>
                    <button onClick={todasManana} className="text-xs px-2.5 py-1.5 rounded-lg font-semibold" style={{ background: C.tinta, color: "#fff" }}>Todas → mañana</button>
                  </div>
                  <div className="space-y-1.5">
                    {[...der.vencidas, ...der.deHoy].map((t) => (
                      <div key={t.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: C.borde, background: C.panel }}>
                        <span className="flex-1 truncate">{t.titulo}</span>
                        <button onClick={() => mananaT(t.id)} className="text-xs px-2 py-1 rounded-lg border shrink-0" style={{ borderColor: C.borde, color: C.dim }}>→ mañana</button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border px-3 py-3 text-sm text-center" style={{ borderColor: C.verde, background: C.verdeBg, color: C.verde }}>
                  Día en cero pendientes. Así se cierra un tablero.
                </div>
              )}

              {der.sinAccion.length > 0 && (
                <button onClick={() => { setVerCierre(false); setTab("pipeline"); setFiltroE("activas"); }} className="w-full rounded-xl border px-3 py-2.5 flex items-center gap-2 text-left" style={{ borderColor: C.ambar, background: C.ambarBg }}>
                  <AlertTriangle size={15} style={{ color: C.ambar }} className="shrink-0" />
                  <span className="flex-1 text-sm">{der.sinAccion.length} {der.sinAccion.length === 1 ? "oportunidad sin próxima acción" : "oportunidades sin próxima acción"}. Revísalas antes de cerrar.</span>
                  <ChevronRight size={15} style={{ color: C.dim }} />
                </button>
              )}

              <div className="text-xs text-center pt-1" style={{ color: C.dim }}>Nada se queda en la cabeza: todo está en el tablero. Hasta mañana.</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: copiar manual ── */}
      {textoManual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(20,28,38,0.55)" }} onClick={() => setTextoManual(null)}>
          <div className="rounded-2xl w-full max-w-md p-4" style={{ background: C.fondo }} onClick={(e) => e.stopPropagation()}>
            <div className="text-sm font-semibold mb-2">Selecciona y copia tu resumen</div>
            <textarea readOnly value={textoManual} rows={8} className="w-full rounded-lg p-3 text-xs" style={{ ...inp, ...mono }} onFocus={(e) => e.target.select()} />
            <button onClick={() => setTextoManual(null)} className="w-full mt-2 py-2 rounded-lg text-sm font-semibold" style={{ background: C.tinta, color: "#fff" }}>Cerrar</button>
          </div>
        </div>
      )}

      {verIntro && <PantallaInicio vencidas={der.vencidas} deHoy={der.deHoy} acciones={der.accionesHoy} totCotizado={der.totCotizado} numCotizado={der.numCotizado} tc={data.tipoCambio || 0} tcFecha={data.tipoCambioFecha} sesion={sesion} sync={sync} onCuenta={() => { cerrarIntro(false); setVerCuenta(true); }} onTC={setTC} onFetchTC={fetchTC} onEntrar={() => cerrarIntro(false)} onIr={(t) => { cerrarIntro(false); setTab(t); }} onManual={() => cerrarIntro(true)} />}
      {verAyuda && <ManualSheet onCerrar={() => setVerAyuda(false)} />}
      {verComision && (() => {
        const facturadas = data.pipeline.filter((o) => o.etapa === "facturado");
        const opp = facturadas.find((o) => o.id === comOppId);
        const base = opp ? (opp.monto || 0) : 0;
        const mg = comMargen === "" ? (opp && opp.margen != null ? opp.margen : 0) : Number(comMargen);
        const pct = comPct === "" ? 0 : Number(comPct);
        const utilidad = base * (mg / 100);
        const comision = utilidad * (pct / 100);
        const cerrarCom = () => { setVerComision(false); };
        return (
          <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(20,28,38,0.55)" }} onClick={cerrarCom}>
            <div className="rounded-t-2xl max-h-full overflow-y-auto w-full max-w-xl mx-auto" style={{ background: C.fondo }} onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b" style={{ background: C.bezel, borderColor: C.bezel2 }}>
                <span style={{ ...dsp, letterSpacing: "0.14em" }} className="uppercase font-bold flex items-center gap-2"><Percent size={16} style={{ color: C.ambar }} /><span style={{ color: "#fff" }}>Comisiones</span></span>
                <button onClick={cerrarCom}><X size={20} style={{ color: "#8FA0B3" }} /></button>
              </div>
              <div className="p-4 pb-8 space-y-3">
                <div className="text-xs" style={{ color: C.dim }}>Calcula tu comisión sobre oportunidades ya facturadas. Elige una, ajusta el margen y tu porcentaje de comisión.</div>
                {facturadas.length === 0 ? (
                  <div className="rounded-xl border px-3 py-4 text-center text-sm" style={{ borderColor: C.borde, background: C.panel, color: C.dim }}>Aún no hay oportunidades en etapa Facturado. Avanza una oportunidad a Facturado para calcular su comisión.</div>
                ) : (<>
                  <select value={comOppId} onChange={(e) => { setComOppId(e.target.value); const o = facturadas.find((x) => x.id === e.target.value); setComMargen(o && o.margen != null ? String(o.margen) : ""); setComPct(o && o.comisionPct != null && o.comisionPct !== "" ? String(o.comisionPct) : ""); }} className="w-full rounded-lg px-3 py-2.5 text-sm" style={inp}>
                    <option value="">Elige una oportunidad facturada…</option>
                    {facturadas.map((o) => <option key={o.id} value={o.id}>{o.cliente}{o.titulo ? " — " + o.titulo : ""} · {fMXN(o.monto)}</option>)}
                  </select>
                  {opp ? (<>
                    <div className="rounded-xl border p-3" style={{ borderColor: C.borde, background: C.panel }}>
                      <div className="flex justify-between text-sm"><span style={{ color: C.dim }}>Monto facturado</span><span className="font-semibold" style={mono}>{fMXN(base)}</span></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><div className="text-xs mb-1" style={{ color: C.dim }}>Margen (%)</div>
                        <input type="number" inputMode="decimal" value={comMargen} onChange={(e) => setComMargen(e.target.value)} placeholder="Ej. 25" className="w-full rounded-lg px-3 py-2.5 text-sm" style={{ ...inp, ...mono }} /></div>
                      <div><div className="text-xs mb-1" style={{ color: C.dim }}>Comisión (%)</div>
                        <input type="number" inputMode="decimal" value={comPct} onChange={(e) => setComPct(e.target.value)} placeholder="Ej. 10" className="w-full rounded-lg px-3 py-2.5 text-sm" style={{ ...inp, ...mono }} /></div>
                    </div>
                    <div className="rounded-xl border divide-y" style={{ borderColor: C.borde, background: C.panel }}>
                      <div className="flex justify-between px-3 py-2.5 text-sm"><span style={{ color: C.dim }}>Utilidad ({mg || 0}% del monto)</span><span className="font-semibold" style={mono}>{fMXN(utilidad)}</span></div>
                      <div className="flex justify-between px-3 py-3" style={{ background: C.verdeBg }}><span className="font-semibold" style={{ color: "#1F7A55" }}>Tu comisión ({pct || 0}%)</span><span className="text-lg font-bold" style={{ ...mono, color: "#1F7A55" }}>{fMXN(comision)}</span></div>
                    </div>
                    <div className="text-xs" style={{ color: C.dim }}>Cálculo: monto × margen = utilidad; utilidad × comisión = tu pago. El margen inicia con el de la oportunidad si lo capturaste.</div>
                  </>) : null}
                </>)}
              </div>
            </div>
          </div>
        );
      })()}

      {verSeguimiento && <SeguimientoSheet opps={data.pipeline} onCerrar={() => setVerSeguimiento(false)} />}
      {verCuenta && <CuentaSheet sesion={sesion} sync={sync} onSalir={cerrarSesion} onCerrar={() => setVerCuenta(false)} />}
      {verVisitas && <VisitasSheet visitas={data.visitas || []} opps={data.pipeline} onNueva={() => setVisitaEdit({})} onEditar={(v) => setVisitaEdit(v)} onCheckin={checkinVisita} onCerrar={() => setVerVisitas(false)} />}
      {visitaEdit !== null && <VisitaEditor visita={visitaEdit} opps={data.pipeline} onGuardar={guardarVisita} onEliminar={() => delVisita(visitaEdit.id)} onCheckin={obtenerUbicacion} onCerrar={() => setVisitaEdit(null)} />}
      {verAsis && <AsistenteSheet onCerrar={() => setVerAsis(false)} onAplicar={aplicarAsistente} />}

      {oppEdit !== null && (
        <OppEditor opp={oppEdit} onGuardar={guardarOpp} onEliminar={() => delOpp(oppEdit.id)} onCerrar={() => setOppEdit(null)} tc={data.tipoCambio || 0} clientes={data.clientes || []} />
      )}
      {cliEdit !== null && (
        <ClienteEditor cliente={cliEdit} contactos={data.contactos || []} actividades={data.actividades || []} opps={data.pipeline || []} onGuardar={guardarCliente} onEliminar={() => delCliente(cliEdit.id)} onCerrar={() => setCliEdit(null)} />
      )}
      {cotEdit !== null && (
        <CotizacionEditor cot={cotEdit} clientes={data.clientes || []} productos={data.productos || []} folioAuto={`COT-${String((data.cotizaciones || []).length + 1).padStart(4, "0")}`} onGuardar={guardarCotizacion} onEliminar={() => delCotizacion(cotEdit.id)} onCerrar={() => setCotEdit(null)} />
      )}
      {catOpen && (
        <CatalogoSheet productos={data.productos || []} onGuardarProd={guardarProducto} onEliminarProd={delProducto} onCerrar={() => setCatOpen(false)} />
      )}
    </div>
  );
}
