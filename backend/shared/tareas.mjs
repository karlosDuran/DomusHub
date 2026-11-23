import { randomUUID } from 'node:crypto'
import { PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { ddb, tables, scanAll } from './dynamoClient.mjs'
import { publishNotification } from './snsClient.mjs'

export const PRIORIDADES = ['baja', 'media', 'alta', 'urgente']

/** Fecha local (YYYY-MM-DD) respetando la variable de entorno `TZ` de la Lambda. */
export function fechaLocalISO(date = new Date()) {
  return date.toLocaleDateString('en-CA')
}

/** Columnas del tablero ordenadas por `posicion` ascendente. */
export async function listarColumnasOrdenadas() {
  const columnas = await scanAll({ TableName: tables.columnas })
  return columnas.sort((a, b) => Number(a.posicion) - Number(b.posicion))
}

/**
 * Inserta un evento en `homeops-tareas-historial`.
 * El Sort Key lleva un sufijo único (`#abc123`) para que dos eventos en el mismo
 * milisegundo no se sobrescriban; `limpiarFechaRegistro` lo retira para mostrarlo.
 */
let secuencia = 0

export async function registrarHistorial({ tarea_id, user_id = null, usuario_nombre = null, accion }) {
  const ahora = new Date().toISOString()
  // Contador (orden dentro de la misma instancia) + azar (unicidad entre instancias).
  const sufijo = `${(secuencia++ % 46656).toString(36).padStart(3, '0')}${randomUUID().slice(0, 3)}`
  await ddb.send(new PutCommand({
    TableName: tables.historial,
    Item: {
      tarea_id,
      fecha_registro: `${ahora}#${sufijo}`,
      id: `hist_${randomUUID().slice(0, 8)}`,
      user_id,
      usuario_nombre,
      accion,
    },
  }))
}

export const limpiarFechaRegistro = (fecha) => String(fecha).split('#')[0]

/** Todos los eventos de historial de una tarea, del más reciente al más antiguo. */
export async function listarHistorialDeTarea(tareaId) {
  const items = []
  let ExclusiveStartKey
  do {
    const res = await ddb.send(new QueryCommand({
      TableName: tables.historial,
      KeyConditionExpression: 'tarea_id = :tid',
      ExpressionAttributeValues: { ':tid': tareaId },
      ScanIndexForward: false,
      ExclusiveStartKey,
    }))
    items.push(...(res.Items || []))
    ExclusiveStartKey = res.LastEvaluatedKey
  } while (ExclusiveStartKey)
  return items
}

/** ¿Esta tarea debe notificar por SNS al crearse o reasignarse? */
export const requiereAviso = (tarea) =>
  tarea.prioridad === 'urgente' || Number(tarea.es_turno_basura) === 1

/**
 * Publica el aviso de una tarea en `homeops-avisos-tareas`.
 * El atributo `destinatario` (id del responsable o `familia`) lo usan las Filter Policies.
 * Si se publica, marca `ultima_alerta_fecha = hoy` (anti-spam diario).
 * @returns {Promise<boolean>}
 */
export async function avisarTarea(tarea, { motivo, columnaNombre, responsableNombre, hoy = fechaLocalISO() }) {
  const esBasura = Number(tarea.es_turno_basura) === 1
  const asunto = esBasura
    ? `[HomeOps Tareas] Turno de basura: ${tarea.titulo}`
    : tarea.prioridad === 'urgente'
      ? `[HomeOps Tareas] Tarea urgente: ${tarea.titulo}`
      : `[HomeOps Tareas] Recordatorio: ${tarea.titulo}`

  const lineas = [
    `${esBasura ? '🗑️ Turno de basura' : 'Tarea'}: ${tarea.titulo}`,
    motivo ? `Motivo: ${motivo}` : null,
    `Responsable: ${responsableNombre || 'Toda la familia'}`,
    `Prioridad: ${tarea.prioridad || 'media'}`,
    tarea.fecha_vencimiento ? `Vence: ${tarea.fecha_vencimiento}` : null,
    columnaNombre ? `Estado: ${columnaNombre}` : null,
    '',
    'Revisa el tablero Kanban en HomeOps.',
  ].filter((l) => l !== null)

  const enviado = await publishNotification({
    topicArn: process.env.SNS_TAREAS_TOPIC_ARN,
    subject: asunto,
    message: lineas.join('\n'),
    destinatario: tarea.asignado_a_user_id || 'familia',
  })

  if (enviado) {
    await ddb.send(new UpdateCommand({
      TableName: tables.tareas,
      Key: { id: tarea.id },
      UpdateExpression: 'SET ultima_alerta_fecha = :hoy',
      ExpressionAttributeValues: { ':hoy': hoy },
    }))
  }
  return enviado
}

/**
 * Recorre las tareas activas (fuera de la última columna, "Completado") y avisa de:
 *  - las que vencen hoy o ya vencieron (`fecha_vencimiento <= hoy`);
 *  - los turnos de basura sin fecha límite (turno vigente de hoy).
 * Anti-spam: no vuelve a avisar una tarea con `ultima_alerta_fecha === hoy`.
 */
export async function evaluarAvisos({ hoy = fechaLocalISO() } = {}) {
  const columnas = await listarColumnasOrdenadas()
  if (columnas.length === 0) return { enviados: 0, tareas: [] }
  const finalId = columnas[columnas.length - 1].id
  const nombresColumna = new Map(columnas.map((c) => [c.id, c.nombre]))

  const usuarios = await scanAll({ TableName: tables.usuarios, ProjectionExpression: 'id, nombre' })
  const nombresUsuario = new Map(usuarios.map((u) => [u.id, u.nombre]))

  const tareas = await scanAll({ TableName: tables.tareas })
  const enviadas = []

  for (const tarea of tareas) {
    if (tarea.columna_id === finalId || tarea.ultima_alerta_fecha === hoy) continue

    const vence = Boolean(tarea.fecha_vencimiento) && tarea.fecha_vencimiento <= hoy
    const basuraDeHoy = Number(tarea.es_turno_basura) === 1 && !tarea.fecha_vencimiento
    if (!vence && !basuraDeHoy) continue

    const motivo = vence
      ? (tarea.fecha_vencimiento < hoy ? 'La tarea está vencida' : 'La tarea vence hoy')
      : 'Te toca sacar la basura hoy'

    const enviado = await avisarTarea(tarea, {
      motivo,
      columnaNombre: nombresColumna.get(tarea.columna_id),
      responsableNombre: nombresUsuario.get(tarea.asignado_a_user_id),
      hoy,
    })
    if (enviado) {
      enviadas.push({ id: tarea.id, titulo: tarea.titulo, destinatario: tarea.asignado_a_user_id || 'familia' })
    }
  }
  return { enviados: enviadas.length, tareas: enviadas }
}
