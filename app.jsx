import { useState, useEffect, useMemo, useRef } from "react";
import {
  ListTodo, Timer, Briefcase, Target, FileDown, Plus, Play, Square,
  Circle, CheckCircle2, ChevronDown, ChevronRight, AlertTriangle, X,
  Trash2, Flag, Copy, Check, Zap, ArrowRight, Search, Link2, CalendarDays, Lightbulb, Download, Upload, Mic, Sparkles, CalendarPlus, Share2, HelpCircle, BookOpen, MessageSquare, Percent, User, MapPin, Camera, Navigation, Cloud, CloudOff, LogOut, Send, Building2, Users, FileText, Package, BarChart3
} from "lucide-react";
import { entrar, registrar, salir, sesionActual, alCambiarSesion, leerNube, subirNube, tieneDatos, miPerfil, cargarEquipo } from "./nube.jsx";
const nfEnteros = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
import { ILUSTRACIONES } from "./ilustraciones.jsx";
import { exportarXLSX, exportarCotizacionXLSX } from "./xlsx.jsx";

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
const PROB_ETAPA = { visita: 0.10, cotizado: 0.30, porcerrar: 0.60, oc: 0.90, pedido: 0.95, facturado: 1, perdido: 0 };
function totalesCot(cot) {
  const sub = (cot.partidas || []).reduce((s, p) => s + (Number(p.cantidad) || 0) * (Number(p.precio) || 0) * (1 - (Number(p.descuento) || 0) / 100), 0);
  const iva = cot.iva !== false ? sub * 0.16 : 0;
  return { sub, iva, total: sub + iva };
}
const LOGO_ELEKTRON = "data:image/png;base64,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";
const FIRMA_ELEKTRON = "data:image/png;base64,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";
function escHtml(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function numeroALetras(num) {
  const n = Math.floor(Math.abs(num || 0));
  const cents = Math.round((Math.abs(num || 0) - n) * 100);
  const uni = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE", "DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISÉIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE", "VEINTE"];
  const dec = ["", "", "", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
  const cen = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];
  const centenas = (x) => {
    if (x === 0) return "";
    if (x === 100) return "CIEN";
    let s = "";
    const c = Math.floor(x / 100), dd = x % 100, d = Math.floor(dd / 10), u = x % 10;
    if (c) s += cen[c] + " ";
    if (dd <= 20) s += uni[dd];
    else if (dd < 30) s += "VEINTI" + uni[u];
    else { s += dec[d]; if (u) s += " Y " + uni[u]; }
    return s.trim();
  };
  const grupos = (x) => {
    if (x === 0) return "CERO";
    const millon = Math.floor(x / 1000000), mil = Math.floor((x % 1000000) / 1000), resto = x % 1000;
    let s = "";
    if (millon) s += (millon === 1 ? "UN MILLÓN" : centenas(millon) + " MILLONES") + " ";
    if (mil) s += (mil === 1 ? "MIL" : centenas(mil) + " MIL") + " ";
    if (resto) s += centenas(resto);
    return s.trim();
  };
  return `${grupos(n) || "CERO"} PESOS, ${String(cents).padStart(2, "0")}/100`;
}
function pdfCotizacion(cot) {
  const parts = cot.partidas || [];
  const sub = parts.reduce((s, p) => s + (Number(p.cantidad) || 0) * (Number(p.precio) || 0) * (1 - (Number(p.descuento) || 0) / 100), 0);
  const mon = cot.moneda === "USD" ? "USD" : "MXN";
  const dsBtn = (url) => url ? `<a href="${escHtml(url)}" target="_blank" style="display:inline-block;background:#C00C0F;color:#fff;font-weight:800;font-size:11px;padding:3px 10px;border-radius:3px;text-decoration:none">DS</a>` : "";
  const filas = parts.map((p, i) => {
    const imp = (Number(p.cantidad) || 0) * (Number(p.precio) || 0) * (1 - (Number(p.descuento) || 0) / 100);
    const t = p.tiempo ? `Partida ${i + 1} - Tiempo estimado: ${escHtml(p.tiempo)}` : `Partida ${i + 1}`;
    return `<tr>
      <td class="c">${i + 1}</td>
      <td class="c">${Number(p.cantidad) || 0}</td>
      <td class="desc">${escHtml(p.descripcion)}<div class="sub">${t}</div><div class="pm">PRECIO EN ${mon}</div></td>
      <td class="r">${fMXN(Number(p.precio) || 0)}</td>
      <td class="r">${fMXN(imp)}</td>
      <td class="c">${dsBtn(p.datasheet)}</td>
    </tr>`;
  }).join("");
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cotización ${escHtml(cot.folio || "")}</title>
<style>
*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#000;margin:0;padding:26px 30px;font-size:11px}
.logo{height:52px}
.tit{text-align:center;font-weight:700;font-size:13px;margin:8px 0}
.campos{width:100%;font-size:11px}.campos td{padding:2px 4px;vertical-align:top}
.lbl{font-weight:700;width:90px}.folio{text-align:right;font-weight:700;font-size:12px}
.fecha{text-align:right;color:#000}
.intro{margin:10px 0 4px}.introb{font-weight:700}
table.items{width:100%;border-collapse:collapse;margin-top:6px}
table.items th{border:1px solid #000;background:#fff;font-size:10px;padding:3px;text-align:center;font-weight:700}
table.items td{border:1px solid #000;padding:4px 5px;font-size:10px;vertical-align:top}
td.c{text-align:center}td.r{text-align:right}td.desc .sub{margin-top:2px}td.desc .pm{margin-top:6px;font-size:9px}
tr.total td{font-weight:700;font-size:11px;padding:6px 5px}
h3{font-size:11px;margin:14px 0 3px;font-weight:700}
.cond{font-size:10px;line-height:1.45;white-space:pre-wrap}.u{text-decoration:underline;font-weight:700}
.firmabox{border:1px solid #000;margin-top:16px;padding:8px;text-align:center}
.firmabox b{font-size:11px}.firma{height:46px;margin:2px 0}.linea{border-top:1px solid #000;width:220px;margin:0 auto}
.pie{text-align:center;font-size:9px;color:#000;margin-top:18px;line-height:1.5}
.fo{border:1px solid #000;display:inline-block;font-size:8px;padding:2px 8px;float:right}
@media print{body{padding:14mm 12mm}@page{margin:0}}
</style></head><body>
<div><img src="${LOGO_ELEKTRON}" class="logo" alt="Elektron"/></div>
<div class="tit">Cotización Técnica -Económica</div>
<table class="campos"><tbody>
  <tr><td class="lbl">Razón Social:</td><td><b>${escHtml(cot.cliente || "")}</b></td><td class="folio">${escHtml(cot.folio || "")}</td></tr>
  <tr><td class="lbl">Representante:</td><td>${escHtml(cot.representante || "")}</td><td class="fecha">Fecha de elaboración:</td></tr>
  <tr><td class="lbl">Domicilio:</td><td>${escHtml(cot.domicilio || "")}</td><td class="fecha">${escHtml(cot.fecha || "")}</td></tr>
  <tr><td class="lbl">Cotizador:</td><td>${escHtml(cot.cotizador || "")}</td><td></td></tr>
</tbody></table>
<div class="intro"><b>Estimados Clientes y Amigos:</b><br>Sometemos a sus finas atenciones nuestra oferta en precio y tiempo de entrega del siguiente material y equipo:</div>
<table class="items">
  <thead><tr><th style="width:32px">Part.</th><th style="width:36px">Cant.</th><th>Descripción</th><th style="width:80px">P.U.</th><th style="width:80px">TOTAL</th><th style="width:54px">DataSheet</th></tr></thead>
  <tbody>
    ${filas || '<tr><td colspan="6" class="c" style="padding:14px;color:#777">Sin partidas</td></tr>'}
    <tr class="total"><td colspan="3">${numeroALetras(sub)} ${mon} + IVA</td><td class="r">TOTAL</td><td class="r">${fMXN(sub)}</td><td></td></tr>
  </tbody>
</table>
<h3>Condiciones Generales:</h3>
<div class="cond">El cliente deberá pagar el 50 % de anticipo (referirse a política de anticipos).
El saldo deberá liquidarse contra aviso de disponibilidad, si no cuenta con línea de crédito.</div>
<h3>Notas de Escalación:</h3>
<div class="cond"><span class="u">Esta cotización no incluye el 16 % de IVA</span>, el cual se cargará al momento de la facturación de los eventos de anticipo y finiquito.
Los precios presentados están sujetos a cambio sin previo aviso, debido a que están basados en la paridad peso/dólar y serán ajustados al tipo de cambio vigente.

Esta cotización no incluye servicio de configuración y puesta en marcha a menos que se indique, en caso de requerir este servicio solicitar su cotización por separado.

DESVIACIONES Y/O ACLARACIONES
El equipo cotizado es de acuerdo a nuestra mejor interpretación, basada en la información recibida, por lo que será obligación del cliente el revisar y aprobar dicha cotización, en el entendido que si existiera alguna omisión o diferencia de acuerdo a sus necesidades se requerirá de una nueva cotización.
Los tiempos de entrega del equipo indicados en esta cotización serán a partir de recibir el anticipo correspondiente.

CANCELACIONES
Elektron del Bajío no acepta la cancelación de pedidos de equipos y/o servicios de Ingeniería y proyectos, ya que su diseño y fabricación se basa en especificaciones que satisfacen las necesidades particulares de un cliente. En caso de que esto ocurriera, el cargo se determinará por los gastos realizados e insumos comprados específicamente para ese pedido y dependiendo de la etapa en que se encuentre con base en los siguientes porcentajes:
• 10% Cuando se haya recibido el pedido del Cliente
• 35% Cuando se encuentre en la etapa de ingeniería
• 50 al 75% Cuando se encuentre en la etapa de compra de materiales y/o ensamble
• 100% Cuando esté terminada la orden

N O T A S:
1. Tiempo de entrega:
A) Cuando no se requiere planos para aprobación. El tiempo de entrega para el equipo cotizado, será contado a partir de la fecha de recibir su orden con toda la información de especificaciones técnicas del equipo, así como su anticipo correspondiente.
B) Cuando se requieran planos para aprobación. El tiempo de entrega será contado a partir de la fecha de recibir los planos 100% aprobados, previo envío de su orden, con toda la información necesaria y su anticipo correspondiente.
Los tiempos de entrega indicados corresponden a la mejor estimación que podemos dar en el momento de emitir esta cotización.
Se debe considerar de 3 a 5 días hábiles adicionales para entrega en Sitio.
Se consideran los días hábiles presentados de lunes a viernes siempre y cuando no sean feriados.
C) Los tiempos de entrega descritos en esta cotización son salvo previa venta y pueden variar sin previo aviso.
2. Es necesario que revisen nuestra oferta ya que se realiza de acuerdo con nuestra interpretación, en caso de existir algún cambio o comentario, favor de comunicarlo a nuestro Vendedor.
3. Nos reservamos el derecho de corregir cualquier error de índole técnico comercial que pudiera presentarse en esta cotización.
4. Si nos vemos favorecidos con su amable pedido, favor de indicar el número completo de esta cotización y colocarlo a nombre de Elektron del Bajío, S.A. de C.V., en el entendido de que el equipo cotizado cumple con sus requerimientos.
5. Se anexan condiciones generales de venta.
6. Elektron del Bajío, S.A. de C.V. no acepta multas o penalizaciones de ninguna especie.
7. La validez de este formato aplica solo para diseños de Ingeniería y Proyectos.

Sin más por el momento quedamos al pendiente de sus comentarios</div>
<div class="firmabox">
  <b>ATENTAMENTE</b><br><b>ELEKTRON DEL BAJIO SA DE CV</b>
  <div><img src="${FIRMA_ELEKTRON}" class="firma" alt="firma"/></div>
  <div class="linea"></div>
  Reviso y Verifico<br>Cotizador de ingeniería y proyectos, automatización y control<br><b>Ing. Saúl Velázquez</b>
</div>
<div class="pie">Elektron del Bajío, S.A. de C.V<br>Blvd. Adolfo López Mateos No. 1115 Ote. Col. Coecillo. León, Gto.<br>Tel. 477 7 19 78 00<br>www.elektron.com.mx<span class="fo">FO-IPE-01 Versión 02</span></div>
</body></html>`;
  const w = window.open("", "_blank");
  if (!w) { alert("Permite las ventanas emergentes (pop-ups) para generar el PDF."); return; }
  w.document.write(html); w.document.close(); w.focus();
  setTimeout(() => { try { w.print(); } catch (e) {} }, 600);
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
  const [d, setD] = useState({ codigo: prod.codigo || "", descripcion: prod.descripcion || "", marca: prod.marca || "", unidad: prod.unidad || "pza", precio: prod.precio ?? "", moneda: prod.moneda || "MXN", datasheet: prod.datasheet || "" });
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
      <input value={d.datasheet} onChange={(e) => setD({ ...d, datasheet: e.target.value })} placeholder="Link de datasheet (URL de la hoja de datos)" className="w-full rounded-lg px-3 py-2.5 text-sm" style={inp} />
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
    representante: cot.representante || "", domicilio: cot.domicilio || "", cotizador: cot.cotizador || "",
    folio: cot.folio || folioAuto || "", fecha: cot.fecha || hoy(),
    estado: cot.estado || "borrador", moneda: cot.moneda || "MXN",
    iva: cot.iva !== false, notas: cot.notas || "",
  });
  const [parts, setParts] = useState(() => (cot.partidas || []).map((p) => ({ ...p, id: p.id || uid() })));
  const [pickProd, setPickProd] = useState(false);
  const setP = (i, campos) => setParts(parts.map((p, j) => j === i ? { ...p, ...campos } : p));
  const delP = (i) => setParts(parts.filter((_, j) => j !== i));
  const addLibre = () => setParts([...parts, { id: uid(), descripcion: "", cantidad: "1", precio: "", descuento: "" }]);
  const addProd = (p) => { setParts([...parts, { id: uid(), descripcion: p.descripcion, codigo: p.codigo || "", cantidad: "1", precio: p.precio ?? "", descuento: "", datasheet: p.datasheet || "" }]); setPickProd(false); };
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
          <input value={d.representante} onChange={(e) => setD({ ...d, representante: e.target.value })} placeholder="Representante (contacto del cliente)" className="w-full rounded-lg px-3 py-2.5 text-sm" style={inp} />
          <input value={d.domicilio} onChange={(e) => setD({ ...d, domicilio: e.target.value })} placeholder="Domicilio del cliente" className="w-full rounded-lg px-3 py-2.5 text-sm" style={inp} />
          <input value={d.cotizador} onChange={(e) => setD({ ...d, cotizador: e.target.value })} placeholder="Cotizador (tú)" className="w-full rounded-lg px-3 py-2.5 text-sm" style={inp} />
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
                  <div className="grid grid-cols-2 gap-1.5">
                    <input value={p.tiempo || ""} onChange={(e) => setP(i, { tiempo: e.target.value })} placeholder="Tiempo estim. (26-34 días)" className="rounded-lg px-2 py-1.5 text-xs" style={inp} />
                    <input value={p.datasheet || ""} onChange={(e) => setP(i, { datasheet: e.target.value })} placeholder="Link datasheet (DS)" className="rounded-lg px-2 py-1.5 text-xs" style={inp} />
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
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => pdfCotizacion({ ...cot, ...d, partidas: parts })} className="py-2.5 rounded-xl border font-semibold flex items-center justify-center gap-1.5" style={{ borderColor: C.borde, color: C.tinta, background: "#fff" }}><FileDown size={16} /> PDF</button>
            <button onClick={() => exportarCotizacionXLSX({ ...cot, ...d, partidas: parts }, numeroALetras(sub), `Cotizacion_${(d.folio || "brida").replace(/[^\w-]/g, "")}.xlsx`)} className="py-2.5 rounded-xl border font-semibold flex items-center justify-center gap-1.5" style={{ borderColor: C.borde, color: C.tinta, background: "#fff" }}><Download size={16} /> Excel</button>
          </div>
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

/* ── Análisis y pronóstico ────────────────────────────────────────── */
function AnalisisSheet({ pipeline, onCerrar }) {
  const activas = pipeline.filter((o) => !["facturado", "perdido"].includes(o.etapa));
  const facturado = pipeline.filter((o) => o.etapa === "facturado");
  const perdido = pipeline.filter((o) => o.etapa === "perdido");
  const totActivo = activas.reduce((s, o) => s + (o.monto || 0), 0);
  const totFacturado = facturado.reduce((s, o) => s + (o.monto || 0), 0);
  const totPerdido = perdido.reduce((s, o) => s + (o.monto || 0), 0);
  const pronostico = activas.reduce((s, o) => s + (o.monto || 0) * (PROB_ETAPA[o.etapa] || 0), 0);
  const cerradas = facturado.length + perdido.length;
  const winRate = cerradas ? Math.round((facturado.length / cerradas) * 100) : 0;
  const embudo = ETAPAS.filter((e) => ["visita", "cotizado", "porcerrar", "oc", "pedido", "facturado"].includes(e.id))
    .map((e) => { const ops = pipeline.filter((o) => o.etapa === e.id); return { ...e, n: ops.length, monto: ops.reduce((s, o) => s + (o.monto || 0), 0) }; });
  const maxN = Math.max(1, ...embudo.map((e) => e.n));
  const Tarjeta = ({ label, valor, sub, color }) => (
    <div className="rounded-xl border p-3 flex-1" style={{ borderColor: C.borde, background: "#fff" }}>
      <div className="text-xs uppercase font-semibold" style={{ ...dsp, color: C.dim, letterSpacing: "0.08em" }}>{label}</div>
      <div className="text-lg font-bold" style={{ ...mono, color: color || C.tinta }}>{valor}</div>
      {sub ? <div className="text-xs" style={{ color: C.dim }}>{sub}</div> : null}
    </div>
  );
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(20,28,38,0.55)" }} onClick={onCerrar}>
      <div className="rounded-t-2xl max-h-full overflow-y-auto w-full max-w-xl mx-auto" style={{ background: C.fondo }} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b" style={{ background: C.fondo, borderColor: C.borde }}>
          <div style={{ ...dsp, letterSpacing: "0.1em" }} className="uppercase font-semibold flex items-center gap-1.5"><BarChart3 size={16} /> Análisis y pronóstico</div>
          <button onClick={onCerrar}><X size={20} style={{ color: C.dim }} /></button>
        </div>
        <div className="p-4 space-y-3 pb-8">
          <div className="flex gap-2">
            <Tarjeta label="Pipeline activo" valor={fMXN(totActivo)} sub={`${activas.length} oportunidad${activas.length === 1 ? "" : "es"}`} color={C.azul} />
            <Tarjeta label="Pronóstico ponderado" valor={fMXN(pronostico)} sub="por probabilidad" color={C.ambar} />
          </div>
          <div className="flex gap-2">
            <Tarjeta label="Ganado (facturado)" valor={fMXN(totFacturado)} sub={`${facturado.length} cierre${facturado.length === 1 ? "" : "s"}`} color={C.verde} />
            <Tarjeta label="Tasa de cierre" valor={winRate + "%"} sub={`${facturado.length} de ${cerradas || 0} cerradas`} color={winRate >= 50 ? C.verde : C.rojo} />
          </div>
          {/* Embudo */}
          <div className="rounded-xl border p-3" style={{ borderColor: C.borde, background: "#fff" }}>
            <div className="text-xs uppercase font-semibold mb-2" style={{ ...dsp, color: C.dim, letterSpacing: "0.1em" }}>Embudo de conversión</div>
            <div className="space-y-2">
              {embudo.map((e) => (
                <div key={e.id}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span style={{ color: C.tinta }}>{e.label}</span>
                    <span style={{ ...mono, color: C.dim }}>{e.n} · {fMXN(e.monto)}</span>
                  </div>
                  <div className="h-3 rounded-full overflow-hidden" style={{ background: C.fondo }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.max(4, (e.n / maxN) * 100)}%`, background: e.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Ganado / Perdido */}
          <div className="rounded-xl border p-3" style={{ borderColor: C.borde, background: "#fff" }}>
            <div className="text-xs uppercase font-semibold mb-2" style={{ ...dsp, color: C.dim, letterSpacing: "0.1em" }}>Ganado vs Perdido</div>
            <div className="flex gap-3 text-sm">
              <div className="flex-1">
                <div style={{ color: C.verde }} className="font-semibold">Ganado: {facturado.length}</div>
                <div style={{ ...mono, color: C.dim }} className="text-xs">{fMXN(totFacturado)}</div>
              </div>
              <div className="flex-1">
                <div style={{ color: C.rojo }} className="font-semibold">Perdido: {perdido.length}</div>
                <div style={{ ...mono, color: C.dim }} className="text-xs">{fMXN(totPerdido)}</div>
              </div>
            </div>
          </div>
          <div className="text-xs" style={{ color: C.dim }}>
            El pronóstico pondera cada oportunidad activa por su probabilidad de cierre según la etapa (visita 10%, cotizado 30%, por cerrar 60%, OC 90%, pedido 95%). Es lo que puedes esperar cerrar con la cartera actual.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Tablero de Gerente (cartera del equipo, solo lectura) ────────── */
function TableroGerente({ onCerrar }) {
  const [datos, setDatos] = useState(null);
  const [err, setErr] = useState(false);
  useEffect(() => { cargarEquipo().then(setDatos).catch(() => setErr(true)); }, []);
  const Marco = ({ children }) => (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(20,28,38,0.55)" }} onClick={onCerrar}>
      <div className="rounded-t-2xl max-h-full overflow-y-auto w-full max-w-xl mx-auto" style={{ background: C.fondo }} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b" style={{ background: C.fondo, borderColor: C.borde }}>
          <div style={{ ...dsp, letterSpacing: "0.1em" }} className="uppercase font-semibold flex items-center gap-1.5"><Users size={16} /> Tablero de gerente</div>
          <button onClick={onCerrar}><X size={20} style={{ color: C.dim }} /></button>
        </div>
        <div className="p-4 space-y-3 pb-8">{children}</div>
      </div>
    </div>
  );
  if (err) return <Marco><div className="text-sm text-center py-8" style={{ color: C.rojo }}>No se pudo cargar la cartera del equipo. Revisa tu conexión.</div></Marco>;
  if (!datos) return <Marco><div className="text-sm text-center py-8" style={{ color: C.dim }}>Cargando cartera del equipo…</div></Marco>;

  const opps = datos.opps || [];
  const activas = opps.filter((o) => !["facturado", "perdido"].includes(o.etapa));
  const facturado = opps.filter((o) => o.etapa === "facturado");
  const totActivo = activas.reduce((s, o) => s + (o.monto || 0), 0);
  const totFacturado = facturado.reduce((s, o) => s + (o.monto || 0), 0);
  const pronostico = activas.reduce((s, o) => s + (o.monto || 0) * (PROB_ETAPA[o.etapa] || 0), 0);
  const porVend = {};
  opps.forEach((o) => {
    const k = o.vendedorNombre || "Sin asignar";
    if (!porVend[k]) porVend[k] = { nombre: k, activo: 0, ganado: 0, nActivas: 0, nGanadas: 0 };
    if (o.etapa === "facturado") { porVend[k].ganado += o.monto || 0; porVend[k].nGanadas++; }
    else if (o.etapa !== "perdido") { porVend[k].activo += o.monto || 0; porVend[k].nActivas++; }
  });
  const ranking = Object.values(porVend).sort((a, b) => (b.activo + b.ganado) - (a.activo + a.ganado));
  const embudo = ETAPAS.filter((e) => ["visita", "cotizado", "porcerrar", "oc", "pedido", "facturado"].includes(e.id))
    .map((e) => { const os = opps.filter((o) => o.etapa === e.id); return { ...e, n: os.length, monto: os.reduce((s, o) => s + (o.monto || 0), 0) }; });
  const maxN = Math.max(1, ...embudo.map((e) => e.n));
  const maxVend = Math.max(1, ...ranking.map((v) => v.activo + v.ganado));

  return (
    <Marco>
      <div className="flex gap-2">
        <div className="rounded-xl border p-3 flex-1" style={{ borderColor: C.borde, background: "#fff" }}>
          <div className="text-xs uppercase font-semibold" style={{ ...dsp, color: C.dim }}>Pipeline del equipo</div>
          <div className="text-lg font-bold" style={{ ...mono, color: C.azul }}>{fMXN(totActivo)}</div>
          <div className="text-xs" style={{ color: C.dim }}>{activas.length} activas · {ranking.length} vendedor{ranking.length === 1 ? "" : "es"}</div>
        </div>
        <div className="rounded-xl border p-3 flex-1" style={{ borderColor: C.borde, background: "#fff" }}>
          <div className="text-xs uppercase font-semibold" style={{ ...dsp, color: C.dim }}>Pronóstico</div>
          <div className="text-lg font-bold" style={{ ...mono, color: C.ambar }}>{fMXN(pronostico)}</div>
          <div className="text-xs" style={{ color: C.dim }}>Facturado: {fMXN(totFacturado)}</div>
        </div>
      </div>
      <div className="rounded-xl border p-3" style={{ borderColor: C.borde, background: "#fff" }}>
        <div className="text-xs uppercase font-semibold mb-2" style={{ ...dsp, color: C.dim, letterSpacing: "0.1em" }}>Ranking de vendedores</div>
        <div className="space-y-2">
          {ranking.map((v, i) => (
            <div key={v.nombre}>
              <div className="flex justify-between text-sm mb-0.5">
                <span style={{ color: C.tinta }} className="font-semibold truncate">{i + 1}. {v.nombre}</span>
                <span style={{ ...mono, color: C.dim }}>{fMXN(v.activo + v.ganado)}</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden flex" style={{ background: C.fondo }}>
                <div className="h-full" style={{ width: `${(v.activo / maxVend) * 100}%`, background: C.azul }} />
                <div className="h-full" style={{ width: `${(v.ganado / maxVend) * 100}%`, background: C.verde }} />
              </div>
              <div className="text-xs mt-0.5" style={{ color: C.dim }}>Activo {fMXN(v.activo)} ({v.nActivas}) · Ganado {fMXN(v.ganado)} ({v.nGanadas})</div>
            </div>
          ))}
          {ranking.length === 0 ? <div className="text-xs" style={{ color: C.dim }}>Sin oportunidades en el equipo todavía.</div> : null}
        </div>
      </div>
      <div className="rounded-xl border p-3" style={{ borderColor: C.borde, background: "#fff" }}>
        <div className="text-xs uppercase font-semibold mb-2" style={{ ...dsp, color: C.dim, letterSpacing: "0.1em" }}>Embudo del equipo</div>
        <div className="space-y-2">
          {embudo.map((e) => (
            <div key={e.id}>
              <div className="flex justify-between text-xs mb-0.5"><span style={{ color: C.tinta }}>{e.label}</span><span style={{ ...mono, color: C.dim }}>{e.n} · {fMXN(e.monto)}</span></div>
              <div className="h-3 rounded-full overflow-hidden" style={{ background: C.fondo }}><div className="h-full rounded-full" style={{ width: `${Math.max(4, (e.n / maxN) * 100)}%`, background: e.color }} /></div>
            </div>
          ))}
        </div>
      </div>
      <div className="text-xs" style={{ color: C.dim }}>Vista de solo lectura de la cartera de todo el equipo (barras: azul = activo, verde = ganado). Cada vendedor edita la suya desde su sesión.</div>
    </Marco>
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
  const [analisisOpen, setAnalisisOpen] = useState(false);
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
  const [rol, setRol] = useState(null);
  const [gerenteOpen, setGerenteOpen] = useState(false);
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
  useEffect(() => {
    if (sesion) miPerfil().then((p) => setRol((p && p.rol) || "vendedor")).catch(() => setRol("vendedor"));
    else setRol(null);
  }, [sesion]);

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
            <button onClick={() => setAnalisisOpen(true)} className="w-full mb-3 py-2.5 rounded-xl border font-semibold flex items-center justify-center gap-1.5" style={{ borderColor: C.borde, color: C.tinta, background: "#fff" }}>
              <BarChart3 size={16} /> Análisis y pronóstico
            </button>
            {(rol === "gerente" || rol === "admin") && (
              <button onClick={() => setGerenteOpen(true)} className="w-full mb-3 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-1.5" style={{ background: C.tinta, color: "#fff" }}>
                <Users size={16} /> Tablero de gerente
              </button>
            )}
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
      {analisisOpen && (
        <AnalisisSheet pipeline={data.pipeline || []} onCerrar={() => setAnalisisOpen(false)} />
      )}
      {gerenteOpen && (
        <TableroGerente onCerrar={() => setGerenteOpen(false)} />
      )}
    </div>
  );
}
