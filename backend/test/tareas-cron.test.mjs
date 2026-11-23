import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { installFakeDynamo, apiEvent } from './helpers/fakeDynamo.mjs'
import { signJwt } from '#shared/jwt.mjs'
import { sns } from '#shared/snsClient.mjs'
import { fechaLocalISO } from '#shared/tareas.mjs'
import { handler } from '../lambdas/kanban/index.mjs'
import { handler as cronHandler } from '../lambdas/tareas-cron/index.mjs'

process.env.JWT_SECRET = 'test-secret'
process.env.SNS_TAREAS_TOPIC_ARN = 'arn:aws:sns:us-east-1:123456789012:homeops-avisos-tareas'
const token = signJwt({ sub: 'usr_admin', nombre: 'admin', rol: 'admin' })

let fake
let published
const originalSnsSend = sns.send.bind(sns)

beforeEach(() => {
  published = []
  sns.send = async (cmd) => { published.push(cmd.input); return {} }
  fake = installFakeDynamo({
    'homeops-usuarios': [
      { id: 'usr_ana', nombre: 'Ana', rol: 'miembro' },
    ],
    'homeops-kanban-columnas': [
      { id: 'col_1', nombre: 'Por hacer', posicion: 1 },
      { id: 'col_2', nombre: 'En progreso', posicion: 2 },
      { id: 'col_3', nombre: 'Completado', posicion: 3 },
    ],
  })
})
afterEach(() => { fake.restore(); sns.send = originalSnsSend })

// La API de Kanban se usa solo para sembrar tareas de prueba.
const crear = async (body) => {
  const res = await handler(apiEvent('POST', '/api/protected/kanban/tareas', { token, body }))
  return { body: JSON.parse(res.body) }
}

test('cron: reinicia recurrentes a la primera columna y avisa vencimientos', async () => {
  const rec = (await crear({ titulo: 'Semanal', columna_id: 'col_3', es_recurrente: 1, asignado_a_user_id: 'usr_ana', prioridad: 'alta' })).body
  const unica = (await crear({ titulo: 'Única', columna_id: 'col_3' })).body

  const res = await cronHandler({ action: 'reiniciar_recurrentes' })
  assert.equal(res.reiniciadas, 1)
  const tareas = fake.list('homeops-tareas')
  assert.equal(tareas.find((t) => t.id === rec.id).columna_id, 'col_1')
  assert.equal(tareas.find((t) => t.id === rec.id).asignado_a_user_id, 'usr_ana', 'conserva responsable')
  assert.equal(tareas.find((t) => t.id === unica.id).columna_id, 'col_3')
  const hist = fake.list('homeops-tareas-historial').filter((h) => h.tarea_id === rec.id)
  assert.ok(hist.some((h) => h.accion === 'Regeneración semanal automática (Reiniciada a columna "Por hacer")'))

  await crear({ titulo: 'Vence hoy', columna_id: 'col_1', fecha_vencimiento: fechaLocalISO() })
  const daily = await cronHandler({ action: 'recordatorio_diario' })
  assert.equal(daily.avisos_enviados, 1)

  await assert.rejects(() => cronHandler({ action: 'otra' }), /Acción no soportada/)
})
