import { randomUUID } from 'node:crypto'
import { GetCommand, PutCommand, DeleteCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb'
import { ddb, tables, scanAll } from '#shared/dynamoClient.mjs'
import { authenticateRequest } from '#shared/jwt.mjs'
import { createRouter, HttpError, invalid } from '#shared/http.mjs'
import {
  PRIORIDADES, fechaLocalISO, listarColumnasOrdenadas, registrarHistorial,
  listarHistorialDeTarea, limpiarFechaRegistro, requiereAviso, avisarTarea, evaluarAvisos,
} from '#shared/tareas.mjs'

const flag = (v) => (v === 1 || v === true || v === '1' || v === 'true' ? 1 : 0)
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/

// ── Helpers ─────────────────────────────────────────────────────────────────

async function getTarea(id) {
  const { Item } = await ddb.send(new GetCommand({ TableName: tables.tareas, Key: { id } }))
  if (!Item) throw new HttpError(404, 'Tarea no encontrada.')
  return Item
}

async function getUsuario(id) {
  const { Item } = await ddb.send(new GetCommand({ TableName: tables.usuarios, Key: { id } }))
  return Item
}

/** Valores por defecto para tareas guardadas sin los campos nuevos. */
const normalizar = (t) => ({
  ...t,
  asignado_a_user_id: t.asignado_a_user_id ?? null,
  prioridad: t.prioridad || 'media',
  es_recurrente: Number(t.es_recurrente) === 1 ? 1 : 0,
  es_turno_basura: Number(t.es_turno_basura) === 1 ? 1 : 0,
  fecha_vencimiento: t.fecha_vencimiento ?? null,
})

const enriquecer = (t, columnas, usuarios) => ({
  ...normalizar(t),
  asignado_nombre: usuarios.get(t.asignado_a_user_id) ?? null,
  columna_nombre: columnas.get(t.columna_id) ?? null,
})

const mapaNombres = (items) => new Map(items.map((i) => [i.id, i.nombre]))

/**
 * Valida y normaliza los campos de una tarea. `base` aporta los valores existentes
 * (edición parcial) y los campos enviados con `undefined` se ignoran.
 */
async function validarTarea(data, base, columnas) {
  const m = { ...base, ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) }

  const titulo = typeof m.titulo === 'string' ? m.titulo.trim() : ''
  if (!titulo) throw invalid('El título de la tarea es obligatorio.')
  if (titulo.length > 120) throw invalid('El título no puede exceder 120 caracteres.')

  const columna_id = m.columna_id === undefined || m.columna_id === null ? '' : String(m.columna_id)
  if (!columna_id) throw invalid('El ID de columna es obligatorio.')
  if (!columnas.some((c) => c.id === columna_id)) throw invalid('La columna especificada no existe.')

  let asignado_a_user_id = null
  let asignado_nombre = null
  if (m.asignado_a_user_id !== undefined && m.asignado_a_user_id !== null && m.asignado_a_user_id !== '') {
    asignado_a_user_id = String(m.asignado_a_user_id)
    const user = await getUsuario(asignado_a_user_id)
    if (!user) throw invalid('El usuario asignado no existe.')
    asignado_nombre = user.nombre
  }

  const prioridad = m.prioridad ?? 'media'
  if (!PRIORIDADES.includes(prioridad)) {
    throw invalid(`La prioridad debe ser una de: ${PRIORIDADES.join(', ')}.`)
  }

  let fecha_vencimiento = null
  if (m.fecha_vencimiento) {
    fecha_vencimiento = String(m.fecha_vencimiento).trim().slice(0, 10)
    if (!FECHA_RE.test(fecha_vencimiento) || Number.isNaN(Date.parse(fecha_vencimiento))) {
      throw invalid('La fecha de vencimiento debe tener formato YYYY-MM-DD.')
    }
  }

  const descripcion = typeof m.descripcion === 'string' && m.descripcion.trim() ? m.descripcion.trim() : null
  if (descripcion && descripcion.length > 1000) throw invalid('La descripción no puede exceder 1000 caracteres.')

  return {
    campos: {
      titulo,
      descripcion,
      columna_id,
      asignado_a_user_id,
      prioridad,
      es_recurrente: flag(m.es_recurrente),
      es_turno_basura: flag(m.es_turno_basura),
      fecha_vencimiento,
    },
    asignado_nombre,
  }
}

const esColumnaFinal = (columnas, id) => columnas.length > 0 && columnas[columnas.length - 1].id === id

// ── Rutas ───────────────────────────────────────────────────────────────────

const router = createRouter()

// --- Columnas ---

router.get('/api/protected/kanban/columnas', async ({ event }) => {
  authenticateRequest(event)
  return { body: await listarColumnasOrdenadas() }
})

router.post('/api/protected/kanban/columnas', async ({ event, body }) => {
  authenticateRequest(event)
  const data = body()

  const nombre = typeof data.nombre === 'string' ? data.nombre.trim() : ''
  if (!nombre) throw invalid('El nombre de la columna es obligatorio.')
  if (data.posicion === undefined || data.posicion === null || data.posicion === '' || !Number.isFinite(Number(data.posicion))) {
    throw invalid('La posición de la columna es obligatoria y debe ser numérica.')
  }
  const posicion = Math.trunc(Number(data.posicion))

  const columnas = await listarColumnasOrdenadas()
  if (columnas.some((c) => Number(c.posicion) === posicion)) {
    throw invalid('Ya existe una columna en esta posición.')
  }

  const columna = { id: `col_${randomUUID().slice(0, 8)}`, nombre, posicion }
  await ddb.send(new PutCommand({
    TableName: tables.columnas,
    Item: columna,
    ConditionExpression: 'attribute_not_exists(id)',
  }))
  return { status: 201, body: columna }
})

router.delete('/api/protected/kanban/columnas/:id', async ({ event, params }) => {
  authenticateRequest(event)
  const columnas = await listarColumnasOrdenadas()
  if (!columnas.some((c) => c.id === params.id)) throw new HttpError(404, 'Columna no encontrada.')

  // Igual que el ON DELETE CASCADE del esquema SQL original: se eliminan sus tareas.
  const tareas = (await scanAll({ TableName: tables.tareas })).filter((t) => t.columna_id === params.id)
  for (const t of tareas) await eliminarTareaYHistorial(t.id)

  await ddb.send(new DeleteCommand({ TableName: tables.columnas, Key: { id: params.id } }))
  return { body: { message: 'Columna eliminada correctamente.' } }
})

// --- Tareas ---

async function eliminarTareaYHistorial(tareaId) {
  const historial = await listarHistorialDeTarea(tareaId)
  for (let i = 0; i < historial.length; i += 25) {
    await ddb.send(new BatchWriteCommand({
      RequestItems: {
        [tables.historial]: historial.slice(i, i + 25).map((h) => ({
          DeleteRequest: { Key: { tarea_id: h.tarea_id, fecha_registro: h.fecha_registro } },
        })),
      },
    }))
  }
  await ddb.send(new DeleteCommand({ TableName: tables.tareas, Key: { id: tareaId } }))
}

router.get('/api/protected/kanban/tareas', async ({ event, query }) => {
  authenticateRequest(event)
  const [tareas, columnas, usuarios] = await Promise.all([
    scanAll({ TableName: tables.tareas }),
    scanAll({ TableName: tables.columnas }),
    scanAll({ TableName: tables.usuarios }),
  ])
  const cols = mapaNombres(columnas)
  const users = mapaNombres(usuarios)

  let resultado = tareas
  if (query.columna_id) resultado = resultado.filter((t) => t.columna_id === String(query.columna_id))
  if (query.user_id) resultado = resultado.filter((t) => t.asignado_a_user_id === String(query.user_id))

  resultado = resultado
    .map((t) => enriquecer(t, cols, users))
    .sort((a, b) => String(b.fecha_creacion || '').localeCompare(String(a.fecha_creacion || '')))
  return { body: resultado }
})

router.post('/api/protected/kanban/tareas', async ({ event, body }) => {
  const claims = authenticateRequest(event)
  const columnas = await listarColumnasOrdenadas()
  const { campos, asignado_nombre } = await validarTarea(body(), {}, columnas)

  const tarea = {
    id: `task_${randomUUID().slice(0, 8)}`,
    ...campos,
    ultima_alerta_fecha: null,
    fecha_creacion: new Date().toISOString(),
  }
  await ddb.send(new PutCommand({
    TableName: tables.tareas,
    Item: tarea,
    ConditionExpression: 'attribute_not_exists(id)',
  }))
  await registrarHistorial({ tarea_id: tarea.id, user_id: claims.sub, usuario_nombre: claims.nombre, accion: 'Tarea creada' })

  // Flujo 3: tarea urgente o turno de basura → aviso inmediato por SNS.
  const columnaNombre = columnas.find((c) => c.id === tarea.columna_id)?.nombre
  if (requiereAviso(tarea) && !esColumnaFinal(columnas, tarea.columna_id)) {
    const hoy = fechaLocalISO()
    const enviado = await avisarTarea(tarea, {
      motivo: 'Se te asignó una tarea importante',
      columnaNombre,
      responsableNombre: asignado_nombre,
      hoy,
    })
    if (enviado) tarea.ultima_alerta_fecha = hoy
  }

  return {
    status: 201,
    body: { ...normalizar(tarea), asignado_nombre, columna_nombre: columnaNombre ?? null },
  }
})

router.put('/api/protected/kanban/tareas/:id', async ({ event, params, body }) => {
  const claims = authenticateRequest(event)
  const actual = normalizar(await getTarea(params.id))
  const columnas = await listarColumnasOrdenadas()
  const { campos, asignado_nombre } = await validarTarea(body(), actual, columnas)

  const tarea = { ...actual, ...campos }
  await ddb.send(new PutCommand({
    TableName: tables.tareas,
    Item: tarea,
    ConditionExpression: 'attribute_exists(id)',
  }))
  await registrarHistorial({ tarea_id: tarea.id, user_id: claims.sub, usuario_nombre: claims.nombre, accion: 'Tarea modificada' })

  // Aviso si pasa a urgente/basura, o si cambia de responsable siendo urgente/basura.
  const columnaNombre = columnas.find((c) => c.id === tarea.columna_id)?.nombre
  const pasoAUrgente = requiereAviso(tarea) && !requiereAviso(actual)
  const cambioResponsable = requiereAviso(tarea) && tarea.asignado_a_user_id !== actual.asignado_a_user_id
  if ((pasoAUrgente || cambioResponsable) && !esColumnaFinal(columnas, tarea.columna_id)) {
    const hoy = fechaLocalISO()
    const enviado = await avisarTarea(tarea, {
      motivo: pasoAUrgente ? 'La tarea ahora es importante' : 'Se te reasignó una tarea importante',
      columnaNombre,
      responsableNombre: asignado_nombre,
      hoy,
    })
    if (enviado) tarea.ultima_alerta_fecha = hoy
  }

  return { body: { ...tarea, asignado_nombre, columna_nombre: columnaNombre ?? null } }
})

router.match(['PUT', 'PATCH'], '/api/protected/kanban/tareas/:id/mover', async ({ event, params, body }) => {
  const claims = authenticateRequest(event)
  const { columna_id } = body()
  if (columna_id === undefined || columna_id === null || columna_id === '') {
    throw invalid('El columna_id es obligatorio.')
  }
  const destinoId = String(columna_id)

  const tarea = await getTarea(params.id)
  const columnas = await listarColumnasOrdenadas()
  const destino = columnas.find((c) => c.id === destinoId)
  if (!destino) throw invalid('La columna de destino no existe.')
  const origen = columnas.find((c) => c.id === tarea.columna_id)

  const base = {
    columna_anterior: origen?.nombre ?? null,
    columna_nueva: destino.nombre,
  }

  if (tarea.columna_id === destinoId) {
    return { body: { message: 'La tarea ya se encuentra en esa columna.', ...base, tarea: normalizar(tarea) } }
  }

  const movida = { ...tarea, columna_id: destinoId }
  await ddb.send(new PutCommand({
    TableName: tables.tareas,
    Item: movida,
    ConditionExpression: 'attribute_exists(id)',
  }))
  await registrarHistorial({
    tarea_id: tarea.id,
    user_id: claims.sub,
    usuario_nombre: claims.nombre,
    accion: `Movido de "${base.columna_anterior ?? 'Desconocida'}" a "${destino.nombre}"`,
  })

  const usuario = tarea.asignado_a_user_id ? await getUsuario(tarea.asignado_a_user_id) : null
  return {
    body: {
      message: 'Tarea movida con éxito.',
      ...base,
      tarea: {
        ...normalizar(movida),
        asignado_nombre: usuario?.nombre ?? null,
        columna_nombre: destino.nombre,
      },
    },
  }
})

router.delete('/api/protected/kanban/tareas/:id', async ({ event, params }) => {
  authenticateRequest(event)
  await getTarea(params.id)
  await eliminarTareaYHistorial(params.id)
  return { body: { message: 'Tarea eliminada correctamente.' } }
})

router.get('/api/protected/kanban/tareas/:id/historial', async ({ event, params }) => {
  authenticateRequest(event)
  await getTarea(params.id)
  const historial = await listarHistorialDeTarea(params.id)
  return {
    body: historial.map((h) => ({
      id: h.id,
      accion: h.accion,
      fecha_registro: limpiarFechaRegistro(h.fecha_registro),
      usuario_nombre: h.usuario_nombre ?? null,
    })),
  }
})

router.post('/api/protected/kanban/evaluar-avisos', async ({ event }) => {
  authenticateRequest(event)
  const { enviados, tareas } = await evaluarAvisos()
  return {
    body: {
      message: enviados > 0
        ? `Se enviaron ${enviados} aviso(s) por correo.`
        : 'No hay avisos pendientes para hoy.',
      avisos_enviados: enviados,
      tareas,
    },
  }
})

export const handler = router.handler
