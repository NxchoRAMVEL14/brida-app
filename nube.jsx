// ═══════════════════════════════════════════════════════════════════
//  BRIDA — capa de nube (empresarial, modelo normalizado por tablas)
//
//  Por FUERA expone la MISMA interfaz que tu app v2.9 ya usa
//  (sesionActual, alCambiarSesion, entrar, registrar, salir, leerNube,
//   subirNube, tieneDatos), así que app.jsx casi no cambia.
//  Por DENTRO ya no guarda un bloque JSON: reparte cada entidad a su
//  tabla (oportunidades, visitas, tareas, tiempo, metas, ajustes), con
//  seguridad por rol aplicada por el RLS de la base.
//
//  La clave publishable es pública por diseño (protegida por el RLS).
//  La clave secret JAMÁS va aquí.
// ═══════════════════════════════════════════════════════════════════
import { createClient } from "@supabase/supabase-js";

const SB_URL = "https://xnpammqhfohzrhzkbbwu.supabase.co";
const SB_KEY = "sb_publishable_VarAIQW2W5NJeIVdYrglJg_-N41z_NN";

export const sb = createClient(SB_URL, SB_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: "brida-auth" },
});

// ¿El estado tiene información real capturada? (igual que en tu v2.9)
export function tieneDatos(d) {
  if (!d) return false;
  const m = d.metas || {};
  return (
    (d.tareas || []).length || (d.pipeline || []).length || (d.tiempo || []).length ||
    (d.visitas || []).length || (d.mejoras || []).length ||
    (m.corto || []).length || (m.mediano || []).length || (m.largo || []).length
  ) > 0;
}

// ───────────────────────────── SESIÓN ────────────────────────────
export async function sesionActual() {
  const { data } = await sb.auth.getSession();
  return data.session || null;
}
export function alCambiarSesion(cb) {
  const { data } = sb.auth.onAuthStateChange((_evento, sesion) => cb(sesion));
  return () => data.subscription.unsubscribe();
}
export async function entrar(email, password) {
  const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
  return error ? { ok: false, msg: traducir(error.message) } : { ok: true };
}
// Registro DESHABILITADO: en la versión empresarial las cuentas las crea
// el administrador desde Supabase. Se conserva la función para no romper
// la pantalla de cuenta, pero siempre responde con aviso.
export async function registrar() {
  return { ok: false, msg: "El registro está deshabilitado. Pide a tu administrador que te dé de alta." };
}
export async function salir() {
  await sb.auth.signOut();
}

// Perfil del usuario (para saber su rol: vendedor / gerente / admin)
export async function miPerfil() {
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return null;
  const { data, error } = await sb.from("perfiles").select("*").eq("id", u.user.id).maybeSingle();
  if (error || !data) return { rol: "vendedor", nombre: (u.user.email || "").split("@")[0], email: u.user.email };
  return { ...data, email: u.user.email };
}

// Carga de EQUIPO (solo lectura). El RLS devuelve todas las filas si el
// usuario es gerente/admin, o solo las suyas si es vendedor. No escribe nada.
export async function cargarEquipo() {
  const q = (b) => b.then((r) => r).catch((e) => ({ error: { message: String((e && e.message) || e) } }));
  const [rop, rper] = await Promise.all([
    q(sb.from("oportunidades").select("*").eq("archivada", false)),
    q(sb.from("perfiles").select("id,nombre,rol,plaza")),
  ]);
  const perfiles = {};
  ((rper && rper.data) || []).forEach((p) => { perfiles[p.id] = p; });
  const opps = ((rop && rop.data) || []).map((r) => {
    const o = OPP.aApp(r);
    o.vendedorId = r.vendedor_id;
    o.vendedorNombre = (perfiles[r.vendedor_id] || {}).nombre || "Sin asignar";
    return o;
  });
  return { opps, perfiles: (rper && rper.data) || [] };
}

// ─────────────── traductor camelCase ↔ snake_case ────────────────
// Mapas explícitos (evita errores en campos como fechaOC). `nulls` = los
// campos numéricos/fecha cuyo "" del formulario se manda como null.
function traductor(mapa, nulls = []) {
  const inv = Object.fromEntries(Object.entries(mapa).map(([a, d]) => [d, a]));
  const nul = new Set(nulls);
  return {
    aFila(obj) {
      const o = {};
      for (const [a, d] of Object.entries(mapa)) {
        if (obj[a] === undefined) continue;
        o[d] = (nul.has(a) && (obj[a] === "" || obj[a] === undefined)) ? null : obj[a];
      }
      return o;
    },
    aApp(row) {
      const o = { id: row.id };
      for (const [d, a] of Object.entries(inv)) {
        if (row[d] !== undefined && row[d] !== null) o[a] = row[d];
      }
      return o;
    },
  };
}

const OPP = traductor(
  {
    cliente: "cliente", clienteId: "cliente_id", titulo: "titulo", etapa: "etapa", monto: "monto", moneda: "moneda",
    montoOrig: "monto_orig", margen: "margen", marca: "marca", plaza: "plaza", vendedor: "vendedor",
    comisionPct: "comision_pct", comisionPagada: "comision_pagada",
    numCotizacion: "num_cotizacion", ocCliente: "oc_cliente", numPedido: "num_pedido", numFactura: "num_factura",
    fechaCotizacion: "fecha_cotizacion", fechaOC: "fecha_oc", fechaPedido: "fecha_pedido", fechaFactura: "fecha_factura",
    proximaAccion: "proxima_accion", fechaAccion: "fecha_accion", notas: "notas",
  },
  ["monto", "montoOrig", "margen", "comisionPct",
   "fechaCotizacion", "fechaOC", "fechaPedido", "fechaFactura", "fechaAccion"]
);
const TAREA = traductor(
  {
    titulo: "titulo", fecha: "fecha", horaInicio: "hora_inicio", horaFin: "hora_fin",
    fechaFin: "fecha_fin", prioridad: "prioridad", cliente: "cliente",
    comentarios: "comentarios", hecha: "hecha",
  },
  ["fechaFin"]
);
const TIEMPO = traductor(
  { fecha: "fecha", categoria: "categoria", cliente: "cliente", minutos: "minutos" }
);
const CLIENTE = traductor(
  { nombre: "nombre", tipo: "tipo", giro: "giro", plaza: "plaza", rfc: "rfc",
    direccion: "direccion", estado: "estado", notas: "notas" }
);
const CONTACTO = traductor(
  { clienteId: "cliente_id", nombre: "nombre", puesto: "puesto", telefono: "telefono",
    correo: "correo", whatsapp: "whatsapp", rolDecision: "rol_decision", notas: "notas" }
);
const ACTIVIDAD = traductor(
  { clienteId: "cliente_id", oportunidadId: "oportunidad_id", tipo: "tipo",
    fecha: "fecha", nota: "nota", resultado: "resultado" }
);
const PRODUCTO = traductor(
  { codigo: "codigo", descripcion: "descripcion", marca: "marca", unidad: "unidad",
    precio: "precio", moneda: "moneda", margen: "margen", datasheet: "datasheet" },
  ["precio", "margen"]
);
const COTIZACION = traductor(
  { cliente: "cliente", clienteId: "cliente_id", oportunidadId: "oportunidad_id",
    representante: "representante", domicilio: "domicilio", cotizador: "cotizador",
    folio: "folio", fecha: "fecha", estado: "estado", moneda: "moneda",
    iva: "iva", notas: "notas", partidas: "partidas" }
);

function visitaAFila(v) {
  const f = {
    cliente: v.cliente ?? "", fecha: v.fecha, hora: v.hora ?? "",
    fecha_fin: v.fechaFin || null, hora_fin: v.horaFin ?? "",
    resultado: v.resultado ?? "pendiente", notas: v.notas ?? "",
    oportunidad_id: v.oppId || null,
  };
  if (v.checkin) {
    f.checkin_lat = v.checkin.lat; f.checkin_lng = v.checkin.lng;
    f.checkin_precision = v.checkin.precision; f.checkin_hora = v.checkin.hora;
  }
  return f;
}
function visitaAApp(r) {
  const v = {
    id: r.id, cliente: r.cliente || "", fecha: r.fecha, hora: r.hora || "",
    fechaFin: r.fecha_fin || "", horaFin: r.hora_fin || "",
    resultado: r.resultado || "pendiente", notas: r.notas || "", oppId: r.oportunidad_id || "",
  };
  if (r.checkin_lat != null) {
    v.checkin = { lat: r.checkin_lat, lng: r.checkin_lng, precision: r.checkin_precision, hora: r.checkin_hora };
  }
  return v;
}

// ───────── util: qué ids del usuario ya existen en una tabla ──────
async function idsDe(tabla, ownerCol, uid, extra) {
  let q = sb.from(tabla).select("id").eq(ownerCol, uid);
  if (extra) q = extra(q);
  const { data, error } = await q;
  if (error) throw error;
  return data.map((r) => r.id);
}

// ═══════════════════════ LECTURA (nube → bloque) ═════════════════
// Devuelve { data: <bloque como lo espera la app>, actualizado }.
export async function leerNube(uid) {
  const q = (b) => b.then((r) => r).catch((e) => ({ error: { message: String((e && e.message) || e) } }));
  const [ropp, rvis, rtar, rtie, rmet, rcli, rcon, ract, rprod, rcot, raju] = await Promise.all([
    q(sb.from("oportunidades").select("*").eq("vendedor_id", uid).eq("archivada", false).order("actualizada", { ascending: false })),
    q(sb.from("visitas").select("*").eq("vendedor_id", uid).order("fecha", { ascending: false })),
    q(sb.from("tareas").select("*").eq("user_id", uid).order("fecha", { ascending: true })),
    q(sb.from("tiempo").select("*").eq("user_id", uid).order("fecha", { ascending: false })),
    q(sb.from("metas").select("*").eq("user_id", uid).order("creada", { ascending: true })),
    q(sb.from("clientes").select("*").eq("vendedor_id", uid).order("actualizada", { ascending: false })),
    q(sb.from("contactos").select("*").eq("vendedor_id", uid).order("creada", { ascending: true })),
    q(sb.from("actividades").select("*").eq("vendedor_id", uid).order("fecha", { ascending: false })),
    q(sb.from("productos").select("*").eq("vendedor_id", uid).order("descripcion", { ascending: true })),
    q(sb.from("cotizaciones").select("*").eq("vendedor_id", uid).order("actualizada", { ascending: false })),
    q(sb.from("ajustes").select("*").eq("user_id", uid).maybeSingle()),
  ]);
  [["oportunidades", ropp], ["visitas", rvis], ["tareas", rtar], ["tiempo", rtie], ["metas", rmet], ["clientes", rcli], ["contactos", rcon], ["actividades", ract], ["productos", rprod], ["cotizaciones", rcot], ["ajustes", raju]]
    .forEach(([n, r]) => { if (r && r.error) console.warn("Brida · no se pudo leer '" + n + "' (¿falta correr su migración SQL?):", r.error.message); });
  const D = (r) => (r && !r.error && Array.isArray(r.data)) ? r.data : [];

  const metas = { corto: [], mediano: [], largo: [] };
  for (const row of D(rmet)) {
    const m = { id: row.id, texto: row.texto, hecha: row.hecha, inicio: "", fin: "" };
    (metas[row.horizonte] || metas.corto).push(m);
  }
  const aj = (raju && !raju.error && raju.data) ? raju.data : {};
  const actualizado = aj.actualizado || "";

  const data = {
    pipeline: D(ropp).map(OPP.aApp),
    visitas: D(rvis).map(visitaAApp),
    tareas: D(rtar).map(TAREA.aApp),
    tiempo: D(rtie).map(TIEMPO.aApp),
    metas,
    clientes: D(rcli).map(CLIENTE.aApp),
    contactos: D(rcon).map(CONTACTO.aApp),
    actividades: D(ract).map(ACTIVIDAD.aApp),
    productos: D(rprod).map(PRODUCTO.aApp),
    cotizaciones: D(rcot).map(COTIZACION.aApp),
    mejoras: aj.mejoras || [],
    timer: aj.timer || null,
    tipoCambio: aj.tipo_cambio ?? 17,
    tipoCambioFecha: aj.tipo_cambio_fecha || "",
    __actualizado: actualizado,
  };
  return { data, actualizado };
}

// ═══════════════════════ ESCRITURA (bloque → nube) ═══════════════
// Reparte el bloque completo a las tablas: inserta/actualiza por id y
// elimina (o archiva) lo que ya no está. No manda el dueño: la base lo
// pone solo (default auth.uid()) al crear, y no lo cambia al actualizar.
export async function subirNube(uid, estado) {
  const fallos = [];
  const up = async (tabla, filas) => {
    if (!filas.length) return;
    const { error } = await sb.from(tabla).upsert(filas, { onConflict: "id" });
    if (error) throw error;
  };
  const paso = async (nombre, fn) => {
    try { await fn(); }
    catch (e) { fallos.push(nombre); console.warn("Brida \u00b7 no se pudo guardar '" + nombre + "' (\u00bffalta correr su migraci\u00f3n SQL?):", (e && e.message) || e); }
  };

  await paso("oportunidades", async () => {
    const opps = estado.pipeline || [];
    await up("oportunidades", opps.map((o) => ({ ...OPP.aFila(o), id: o.id })));
    const vivos = new Set(opps.map((o) => o.id));
    const existentes = await idsDe("oportunidades", "vendedor_id", uid, (q) => q.eq("archivada", false));
    const aArchivar = existentes.filter((id) => !vivos.has(id));
    if (aArchivar.length) { const { error } = await sb.from("oportunidades").update({ archivada: true }).in("id", aArchivar); if (error) throw error; }
  });
  await paso("visitas", async () => {
    const vis = estado.visitas || [];
    await up("visitas", vis.map((v) => ({ ...visitaAFila(v), id: v.id })));
    await borrarFaltantes("visitas", "vendedor_id", uid, vis.map((v) => v.id));
  });
  await paso("tareas", async () => {
    const tar = estado.tareas || [];
    await up("tareas", tar.map((t) => ({ ...TAREA.aFila(t), id: t.id })));
    await borrarFaltantes("tareas", "user_id", uid, tar.map((t) => t.id));
  });
  await paso("tiempo", async () => {
    const tie = estado.tiempo || [];
    await up("tiempo", tie.map((r) => ({ ...TIEMPO.aFila(r), id: r.id })));
    await borrarFaltantes("tiempo", "user_id", uid, tie.map((r) => r.id));
  });
  await paso("metas", async () => {
    const metasObj = estado.metas || {};
    const filasMetas = [];
    for (const h of ["corto", "mediano", "largo"]) for (const m of metasObj[h] || []) filasMetas.push({ id: m.id, horizonte: h, texto: m.texto, hecha: !!m.hecha });
    await up("metas", filasMetas);
    await borrarFaltantes("metas", "user_id", uid, filasMetas.map((m) => m.id));
  });
  await paso("clientes", async () => {
    const clis = estado.clientes || [];
    await up("clientes", clis.map((c) => ({ ...CLIENTE.aFila(c), id: c.id })));
    await borrarFaltantes("clientes", "vendedor_id", uid, clis.map((c) => c.id));
  });
  await paso("contactos", async () => {
    const cons = estado.contactos || [];
    await up("contactos", cons.map((c) => ({ ...CONTACTO.aFila(c), id: c.id })));
    await borrarFaltantes("contactos", "vendedor_id", uid, cons.map((c) => c.id));
  });
  await paso("actividades", async () => {
    const acts = estado.actividades || [];
    await up("actividades", acts.map((a) => ({ ...ACTIVIDAD.aFila(a), id: a.id })));
    await borrarFaltantes("actividades", "vendedor_id", uid, acts.map((a) => a.id));
  });
  await paso("productos", async () => {
    const prods = estado.productos || [];
    await up("productos", prods.map((p) => ({ ...PRODUCTO.aFila(p), id: p.id })));
    await borrarFaltantes("productos", "vendedor_id", uid, prods.map((p) => p.id));
  });
  await paso("cotizaciones", async () => {
    const cots = estado.cotizaciones || [];
    await up("cotizaciones", cots.map((c) => ({ ...COTIZACION.aFila(c), id: c.id })));
    await borrarFaltantes("cotizaciones", "vendedor_id", uid, cots.map((c) => c.id));
  });
  await paso("ajustes", async () => {
    const { error } = await sb.from("ajustes").upsert({
      user_id: uid, timer: estado.timer ?? null, tipo_cambio: estado.tipoCambio ?? 17,
      tipo_cambio_fecha: estado.tipoCambioFecha || null, mejoras: estado.mejoras || [],
      actualizado: estado.__actualizado || new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (error) throw error;
  });

  if (fallos.length) {
    const e = new Error("Sincronizaci\u00f3n parcial. Revisa migraciones de: " + fallos.join(", "));
    e.parcial = true;
    throw e;
  }
}

async function borrarFaltantes(tabla, ownerCol, uid, idsVivos) {
  const vivos = new Set(idsVivos);
  const existentes = await idsDe(tabla, ownerCol, uid);
  const aBorrar = existentes.filter((id) => !vivos.has(id));
  if (aBorrar.length) {
    const { error } = await sb.from(tabla).delete().in("id", aBorrar);
    if (error) throw error;
  }
}

// ─────────────────── traducción de errores de auth ───────────────
function traducir(msg) {
  const m = (msg || "").toLowerCase();
  if (m.includes("invalid login")) return "Correo o contraseña incorrectos.";
  if (m.includes("email not confirmed")) return "Falta confirmar el correo. Revisa tu bandeja o pide al administrador que confirme tu cuenta.";
  if (m.includes("unable to validate email") || m.includes("invalid email")) return "Correo no válido.";
  if (m.includes("network") || m.includes("failed to fetch")) return "Sin conexión. Revisa tu internet e inténtalo de nuevo.";
  return msg || "Ocurrió un error. Inténtalo de nuevo.";
}
