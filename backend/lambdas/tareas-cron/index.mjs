import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { ddb, tables, scanAll, buildUpdate } from '#shared/dynamoClient.mjs'
import { listarColumnasOrdenadas, registrarHistorial, evaluarAvisos } from '#shared/tareas.mjs'

/**
 * Lunes 00:01 — devuelve las tareas recurrentes a la primera columna ("Por hacer"),
 * limpia su anti-spam de avisos y deja constancia en el historial.
 * Reemplaza a `backend/cron/reiniciar_tareas.php`.
 */
export async function reiniciarRecurrentes() {
  const columnas = await listarColumnasOrdenadas()
  if (columnas.length === 0) throw new Error('No se encontró ninguna columna en el tablero Kanban.')
  const inicial = columnas[0]

  const recurrentes = (await scanAll({ TableName: tables.tareas }))
    .filter((t) => Number(t.es_recurrente) === 1)

  for (const tarea of recurrentes) {
    const upd = buildUpdate({ set: { columna_id: inicial.id }, remove: ['ultima_alerta_fecha'] })
    await ddb.send(new UpdateCommand({ TableName: tables.tareas, Key: { id: tarea.id }, ...upd }))
    await registrarHistorial({
      tarea_id: tarea.id,
      user_id: null,
      usuario_nombre: 'Sistema',
      accion: `Regeneración semanal automática (Reiniciada a columna "${inicial.nombre}")`,
    })
    console.log(`Tarea ${tarea.id} ("${tarea.titulo}") reiniciada.`)
  }
  return { action: 'reiniciar_recurrentes', reiniciadas: recurrentes.length }
}

/** Diario 08:00 — avisa por SNS de tareas que vencen hoy y turnos de basura. */
export async function recordatorioDiario() {
  const { enviados, tareas } = await evaluarAvisos()
  console.log(`Recordatorio diario: ${enviados} aviso(s) enviado(s).`)
  return { action: 'recordatorio_diario', avisos_enviados: enviados, tareas }
}

/** Invocada por EventBridge Scheduler con `{ "action": "<accion>" }`. */
export const handler = async (event = {}) => {
  switch (event.action) {
    case 'reiniciar_recurrentes':
      return reiniciarRecurrentes()
    case 'recordatorio_diario':
      return recordatorioDiario()
    default:
      throw new Error(`Acción no soportada: ${JSON.stringify(event.action)}`)
  }
}
