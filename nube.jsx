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
  const [ropp, rvis, rtar, rtie, rmet, rcli, rcon, ract, raju] = await Promise.all([
    sb.from("oportunidades").select("*").eq("archivada", false).order("actualizada", { ascending: false }),
    sb.from("visitas").select("*").order("fecha", { ascending: false }),
    sb.from("tareas").select("*").order("fecha", { ascending: true }),
    sb.from("tiempo").select("*").order("fecha", { ascending: false }),
    sb.from("metas").select("*").order("creada", { ascending: true }),
    sb.from("clientes").select("*").order("actualizada", { ascending: false }),
    sb.from("contactos").select("*").order("creada", { ascending: true }),
    sb.from("actividades").select("*").order("fecha", { ascending: false }),
    sb.from("ajustes").select("*").eq("user_id", uid).maybeSingle(),
  ]);
  for (const r of [ropp, rvis, rtar, rtie, rmet, rcli, rcon, ract]) if (r.error) throw r.error;
  if (raju.error) throw raju.error;

  const metas = { corto: [], mediano: [], largo: [] };
  for (const row of rmet.data) {
    const m = { id: row.id, texto: row.texto, hecha: row.hecha, inicio: "", fin: "" };
    (metas[row.horizonte] || metas.corto).push(m);
  }
  const aj = raju.data || {};
  const actualizado = aj.actualizado || "";

  const data = {
    pipeline: ropp.data.map(OPP.aApp),
    visitas: rvis.data.map(visitaAApp),
    tareas: rtar.data.map(TAREA.aApp),
    tiempo: rtie.data.map(TIEMPO.aApp),
    metas,
    clientes: rcli.data.map(CLIENTE.aApp),
    contactos: rcon.data.map(CONTACTO.aApp),
    actividades: ract.data.map(ACTIVIDAD.aApp),
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
  // — OPORTUNIDADES: upsert + archivar las que faltan —
  const opps = estado.pipeline || [];
  if (opps.length) {
    const filas = opps.map((o) => ({ ...OPP.aFila(o), id: o.id }));
    const { error } = await sb.from("oportunidades").upsert(filas, { onConflict: "id" });
    if (error) throw error;
  }
  {
    const vivos = new Set(opps.map((o) => o.id));
    const existentes = await idsDe("oportunidades", "vendedor_id", uid, (q) => q.eq("archivada", false));
    const aArchivar = existentes.filter((id) => !vivos.has(id));
    if (aArchivar.length) {
      const { error } = await sb.from("oportunidades").update({ archivada: true }).in("id", aArchivar);
      if (error) throw error;
    }
  }

  // — VISITAS: upsert + borrar las que faltan —
  const vis = estado.visitas || [];
  if (vis.length) {
    const filas = vis.map((v) => ({ ...visitaAFila(v), id: v.id }));
    const { error } = await sb.from("visitas").upsert(filas, { onConflict: "id" });
    if (error) throw error;
  }
  await borrarFaltantes("visitas", "vendedor_id", uid, vis.map((v) => v.id));

  // — TAREAS —
  const tar = estado.tareas || [];
  if (tar.length) {
    const filas = tar.map((t) => ({ ...TAREA.aFila(t), id: t.id }));
    const { error } = await sb.from("tareas").upsert(filas, { onConflict: "id" });
    if (error) throw error;
  }
  await borrarFaltantes("tareas", "user_id", uid, tar.map((t) => t.id));

  // — TIEMPO —
  const tie = estado.tiempo || [];
  if (tie.length) {
    const filas = tie.map((r) => ({ ...TIEMPO.aFila(r), id: r.id }));
    const { error } = await sb.from("tiempo").upsert(filas, { onConflict: "id" });
    if (error) throw error;
  }
  await borrarFaltantes("tiempo", "user_id", uid, tie.map((r) => r.id));

  // — METAS (aplanar corto/mediano/largo con su horizonte) —
  const metasObj = estado.metas || {};
  const filasMetas = [];
  for (const h of ["corto", "mediano", "largo"]) {
    for (const m of metasObj[h] || []) filasMetas.push({ id: m.id, horizonte: h, texto: m.texto, hecha: !!m.hecha });
  }
  if (filasMetas.length) {
    const { error } = await sb.from("metas").upsert(filasMetas, { onConflict: "id" });
    if (error) throw error;
  }
  await borrarFaltantes("metas", "user_id", uid, filasMetas.map((m) => m.id));

  // — CLIENTES (upsert + borrar faltantes) —
  const clis = estado.clientes || [];
  if (clis.length) {
    const filas = clis.map((c) => ({ ...CLIENTE.aFila(c), id: c.id }));
    const { error } = await sb.from("clientes").upsert(filas, { onConflict: "id" });
    if (error) throw error;
  }
  await borrarFaltantes("clientes", "vendedor_id", uid, clis.map((c) => c.id));

  // — CONTACTOS (después de clientes por la relación cliente_id) —
  const cons = estado.contactos || [];
  if (cons.length) {
    const filas = cons.map((c) => ({ ...CONTACTO.aFila(c), id: c.id }));
    const { error } = await sb.from("contactos").upsert(filas, { onConflict: "id" });
    if (error) throw error;
  }
  await borrarFaltantes("contactos", "vendedor_id", uid, cons.map((c) => c.id));

  // — ACTIVIDADES (bitácora) —
  const acts = estado.actividades || [];
  if (acts.length) {
    const filas = acts.map((a) => ({ ...ACTIVIDAD.aFila(a), id: a.id }));
    const { error } = await sb.from("actividades").upsert(filas, { onConflict: "id" });
    if (error) throw error;
  }
  await borrarFaltantes("actividades", "vendedor_id", uid, acts.map((a) => a.id));

  // — AJUSTES (cronómetro, tipo de cambio, ideas de mejora) —
  const { error: eaj } = await sb.from("ajustes").upsert({
    user_id: uid,
    timer: estado.timer ?? null,
    tipo_cambio: estado.tipoCambio ?? 17,
    tipo_cambio_fecha: estado.tipoCambioFecha || null,
    mejoras: estado.mejoras || [],
    actualizado: estado.__actualizado || new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (eaj) throw eaj;
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
