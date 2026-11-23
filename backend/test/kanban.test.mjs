import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { installFakeDynamo, apiEvent } from './helpers/fakeDynamo.mjs'
import { signJwt } from '#shared/jwt.mjs'
import { sns } from '#shared/snsClient.mjs'
import { fechaLocalISO } from '#shared/tareas.mjs'
import { handler } from '../lambdas/kanban/index.mjs'

process.env.JWT_SECRET = 'test-secret'
process.env.SNS_TAREAS_TOPIC_ARN = 'arn:aws:sns:us-east-1:123456789012:homeops-avisos-tareas'
const token = signJwt({ sub: 'usr_admin', nombre: 'admin', rol: 'admin' })

let fake
let published
const originalSnsSend = sns.send.bind(sns)

const call = async (method, path, opts = {}) => {
  const res = await handler(apiEvent(method, path, { token, ...opts }))
  return { status: res.statusCode, body: res.body ? JSON.parse(res.body) : null }
}

beforeEach(() => {
  published = []
  sns.send = async (cmd) => { published.push(cmd.input); return {} }
  fake = installFakeDynamo({
    'homeops-usuarios': [
      { id: 'usr_admin', nombre: 'admin', rol: 'admin' },
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

const crear = (body) => call('POST', '/api/protected/kanban/tareas', { body })

test('columnas ordenadas, creación con posición única y borrado en cascada', async () => {
  const lista = await call('GET', '/api/protected/kanban/columnas')
  assert.deepEqual(lista.body.map((c) => c.nombre), ['Por hacer', 'En progreso', 'Completado'])

  assert.equal((await call('POST', '/api/protected/kanban/columnas', { body: { nombre: 'Dup', posicion: 2 } })).status, 422)
  assert.equal((await call('POST', '/api/protected/kanban/columnas', { body: { posicion: 9 } })).status, 422)
  assert.equal((await call('POST', '/api/protected/kanban/columnas', { body: { nombre: 'X' } })).status, 422)
  const nueva = await call('POST', '/api/protected/kanban/columnas', { body: { nombre: 'Revisión', posicion: 4 } })
  assert.equal(nueva.status, 201)
  assert.match(nueva.body.id, /^col_/)

  const t = await crear({ titulo: 'En revisión', columna_id: nueva.body.id })
  assert.equal((await call('DELETE', `/api/protected/kanban/columnas/${nueva.body.id}`)).status, 200)
  assert.equal(fake.list('homeops-tareas').length, 0, 'las tareas de la columna se eliminan')
  assert.equal(fake.list('homeops-tareas-historial').filter((h) => h.tarea_id === t.body.id).length, 0)
  assert.equal((await call('DELETE', '/api/protected/kanban/columnas/nope')).status, 404)
})

test('crear tarea valida campos, registra historial y enriquece la respuesta', async () => {
  assert.equal((await crear({ columna_id: 'col_1' })).status, 422)
  assert.equal((await crear({ titulo: 'X' })).status, 422)
  assert.equal((await crear({ titulo: 'X', columna_id: 'nope' })).status, 422)
  assert.equal((await crear({ titulo: 'X', columna_id: 'col_1', asignado_a_user_id: 'nope' })).status, 422)
  assert.equal((await crear({ titulo: 'X', columna_id: 'col_1', prioridad: 'critica' })).status, 422)
  assert.equal((await crear({ titulo: 'X', columna_id: 'col_1', fecha_vencimiento: '31/12/2026' })).status, 422)

  const res = await crear({ titulo: 'Lavar platos', columna_id: 'col_1', asignado_a_user_id: 'usr_ana', es_recurrente: 1, fecha_vencimiento: '2026-12-01' })
  assert.equal(res.status, 201)
  assert.match(res.body.id, /^task_/)
  assert.equal(res.body.prioridad, 'media')
  assert.equal(res.body.asignado_nombre, 'Ana')
  assert.equal(res.body.columna_nombre, 'Por hacer')
  assert.equal(res.body.es_recurrente, 1)
  assert.equal(published.length, 0, 'prioridad media no notifica')

  const hist = await call('GET', `/api/protected/kanban/tareas/${res.body.id}/historial`)
  assert.equal(hist.body.length, 1)
  assert.equal(hist.body[0].accion, 'Tarea creada')
  assert.equal(hist.body[0].usuario_nombre, 'admin')
  assert.ok(!hist.body[0].fecha_registro.includes('#'))
})

test('tarea urgente o de basura notifica por SNS con destinatario', async () => {
  const urgente = await crear({ titulo: 'Llamar plomero', columna_id: 'col_1', prioridad: 'urgente', asignado_a_user_id: 'usr_ana' })
  assert.equal(published.length, 1)
  assert.equal(published[0].TopicArn, process.env.SNS_TAREAS_TOPIC_ARN)
  assert.equal(published[0].MessageAttributes.destinatario.StringValue, 'usr_ana')
  assert.equal(urgente.body.ultima_alerta_fecha, fechaLocalISO())

  await crear({ titulo: 'Sacar la basura', columna_id: 'col_1', es_turno_basura: 1 })
  assert.equal(published.length, 2)
  assert.equal(published[1].MessageAttributes.destinatario.StringValue, 'familia')
  assert.match(published[1].Subject, /^[\x20-\x7E]+$/, 'Subject solo ASCII')

  // en la última columna no se avisa
  await crear({ titulo: 'Ya hecha', columna_id: 'col_3', prioridad: 'urgente' })
  assert.equal(published.length, 2)
})

test('el título con acentos no rompe el Subject de SNS', async () => {
  await crear({ titulo: 'Comprar piñata y café', columna_id: 'col_1', prioridad: 'urgente' })
  assert.match(published[0].Subject, /^[\x20-\x7E]+$/)
  assert.ok(published[0].Message.includes('piñata'))
})

test('editar: avisa al pasar a urgente o al reasignar, no en ediciones neutras', async () => {
  const t = (await crear({ titulo: 'Pintar', columna_id: 'col_1' })).body
  const put = (body) => call('PUT', `/api/protected/kanban/tareas/${t.id}`, { body })

  const neutro = await put({ descripcion: 'detalle' })
  assert.equal(neutro.status, 200)
  assert.equal(neutro.body.titulo, 'Pintar', 'edición parcial conserva el resto')
  assert.equal(published.length, 0)

  await put({ prioridad: 'urgente' })
  assert.equal(published.length, 1)
  await put({ descripcion: 'otra' })
  assert.equal(published.length, 1, 'sin cambio relevante no vuelve a avisar')
  await put({ asignado_a_user_id: 'usr_ana' })
  assert.equal(published.length, 2)
  assert.equal(published[1].MessageAttributes.destinatario.StringValue, 'usr_ana')

  assert.equal((await put({ titulo: '  ' })).status, 422)
  assert.equal((await call('PUT', '/api/protected/kanban/tareas/nope', { body: { titulo: 'x' } })).status, 404)

  const hist = await call('GET', `/api/protected/kanban/tareas/${t.id}/historial`)
  assert.equal(hist.body.filter((h) => h.accion === 'Tarea modificada').length, 4) // 5 PUT, el inválido (título vacío) no deja historial
})

test('mover registra historial y devuelve columnas', async () => {
  const t = (await crear({ titulo: 'Barrer', columna_id: 'col_1' })).body
  const res = await call('PATCH', `/api/protected/kanban/tareas/${t.id}/mover`, { body: { columna_id: 'col_2' } })
  assert.equal(res.status, 200)
  assert.equal(res.body.columna_anterior, 'Por hacer')
  assert.equal(res.body.columna_nueva, 'En progreso')
  assert.equal(res.body.tarea.columna_id, 'col_2')
  assert.equal(res.body.tarea.columna_nombre, 'En progreso')

  const mismo = await call('PUT', `/api/protected/kanban/tareas/${t.id}/mover`, { body: { columna_id: 'col_2' } })
  assert.equal(mismo.body.message, 'La tarea ya se encuentra en esa columna.')

  const hist = await call('GET', `/api/protected/kanban/tareas/${t.id}/historial`)
  assert.equal(hist.body[0].accion, 'Movido de "Por hacer" a "En progreso"', 'más reciente primero')
  assert.equal(hist.body.length, 2)

  assert.equal((await call('PUT', `/api/protected/kanban/tareas/${t.id}/mover`, { body: {} })).status, 422)
  assert.equal((await call('PUT', `/api/protected/kanban/tareas/${t.id}/mover`, { body: { columna_id: 'x' } })).status, 422)
  assert.equal((await call('PUT', '/api/protected/kanban/tareas/nope/mover', { body: { columna_id: 'col_1' } })).status, 404)
})

test('listar tareas enriquece, ordena por fecha desc y filtra', async () => {
  const a = (await crear({ titulo: 'A', columna_id: 'col_1', asignado_a_user_id: 'usr_ana' })).body
  await new Promise((r) => setTimeout(r, 5))
  const b = (await crear({ titulo: 'B', columna_id: 'col_2' })).body

  const todas = await call('GET', '/api/protected/kanban/tareas')
  assert.deepEqual(todas.body.map((t) => t.id), [b.id, a.id])
  assert.equal(todas.body[1].asignado_nombre, 'Ana')
  assert.equal(todas.body[0].asignado_nombre, null)

  const deAna = await call('GET', '/api/protected/kanban/tareas', { query: { user_id: 'usr_ana' } })
  assert.deepEqual(deAna.body.map((t) => t.id), [a.id])
  const col2 = await call('GET', '/api/protected/kanban/tareas', { query: { columna_id: 'col_2' } })
  assert.deepEqual(col2.body.map((t) => t.id), [b.id])
})

test('eliminar tarea borra su historial', async () => {
  const t = (await crear({ titulo: 'Borrar', columna_id: 'col_1' })).body
  await call('PUT', `/api/protected/kanban/tareas/${t.id}/mover`, { body: { columna_id: 'col_2' } })
  assert.equal(fake.list('homeops-tareas-historial').length, 2)
  assert.equal((await call('DELETE', `/api/protected/kanban/tareas/${t.id}`)).status, 200)
  assert.equal(fake.list('homeops-tareas-historial').length, 0)
  assert.equal(fake.list('homeops-tareas').length, 0)
  assert.equal((await call('GET', `/api/protected/kanban/tareas/${t.id}/historial`)).status, 404)
})

test('evaluar-avisos: vencidas y basura, con anti-spam diario y sin completadas', async () => {
  const hoy = fechaLocalISO()
  const ayer = fechaLocalISO(new Date(Date.now() - 86400000))
  const manana = fechaLocalISO(new Date(Date.now() + 86400000))

  await crear({ titulo: 'Vence hoy', columna_id: 'col_1', fecha_vencimiento: hoy, asignado_a_user_id: 'usr_ana' })
  await crear({ titulo: 'Vencida', columna_id: 'col_2', fecha_vencimiento: ayer })
  await crear({ titulo: 'Futura', columna_id: 'col_1', fecha_vencimiento: manana })
  await crear({ titulo: 'Hecha vencida', columna_id: 'col_3', fecha_vencimiento: ayer })
  await crear({ titulo: 'Basura pendiente', columna_id: 'col_1', es_turno_basura: 1 }) // ya avisó al crear
  published.length = 0

  const first = await call('POST', '/api/protected/kanban/evaluar-avisos')
  assert.equal(first.status, 200)
  assert.deepEqual(first.body.tareas.map((t) => t.titulo).sort(), ['Vence hoy', 'Vencida'])
  assert.equal(published.length, 2)

  const second = await call('POST', '/api/protected/kanban/evaluar-avisos')
  assert.equal(second.body.avisos_enviados, 0, 'anti-spam: no repite el mismo día')
  assert.equal(published.length, 2)
})
