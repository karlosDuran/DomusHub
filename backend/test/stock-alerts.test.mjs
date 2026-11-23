import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { sns } from '#shared/snsClient.mjs'
import { construirAlerta, handler } from '../lambdas/stock-alerts/index.mjs'

const rec = (eventName, nuevo, viejo) => ({
  eventName,
  dynamodb: {
    NewImage: nuevo && {
      nombre: { S: 'Leche Entera' }, categoria: { S: 'Lácteos' }, unidad_medida: { S: 'L' },
      cantidad_actual: { N: String(nuevo[0]) }, cantidad_minima: { N: String(nuevo[1]) },
    },
    OldImage: viejo && {
      nombre: { S: 'Leche Entera' },
      cantidad_actual: { N: String(viejo[0]) }, cantidad_minima: { N: String(viejo[1]) },
    },
  },
})

test('alerta cuando el stock baja al mínimo o por debajo', () => {
  const a = construirAlerta(rec('MODIFY', [1, 1], [2, 1]))
  assert.ok(a)
  assert.match(a.message, /^Atención: Queda solo 1 L de Leche Entera/)
  assert.ok(a.message.includes('Categoría: Lácteos'))
})

test('mensaje de agotado cuando llega a 0', () => {
  const a = construirAlerta(rec('MODIFY', [0, 1], [1, 1]))
  assert.match(a.message, /^¡Se agotó Leche Entera! \(0 L\)/)
})

test('no alerta si sigue arriba del mínimo, si sube, o si no cambia', () => {
  assert.equal(construirAlerta(rec('MODIFY', [3, 1], [4, 1])), null)
  assert.equal(construirAlerta(rec('MODIFY', [2, 1], [1, 1])), null, 'reponer stock no alerta')
  assert.equal(construirAlerta(rec('MODIFY', [1, 1], [1, 1])), null, 'sin cambio de cantidad')
  assert.equal(construirAlerta({ eventName: 'REMOVE', dynamodb: {} }), null)
})

test('alerta al subir el mínimo por encima del stock (cruce de umbral)', () => {
  assert.ok(construirAlerta(rec('MODIFY', [2, 3], [2, 1])))
})

test('INSERT crítico alerta; INSERT normal no', () => {
  assert.ok(construirAlerta(rec('INSERT', [0, 1])))
  assert.equal(construirAlerta(rec('INSERT', [5, 1])), null)
})

let published
const originalSend = sns.send.bind(sns)
beforeEach(() => {
  published = []
  sns.send = async (cmd) => { published.push(cmd.input); return {} }
  process.env.SNS_DESPENSA_TOPIC_ARN = 'arn:aws:sns:us-east-1:123456789012:homeops-alertas-despensa'
})
afterEach(() => { sns.send = originalSend })

test('handler publica en SNS Despensa solo los registros críticos (Subject ASCII)', async () => {
  const res = await handler({ Records: [rec('MODIFY', [1, 1], [2, 1]), rec('MODIFY', [5, 1], [6, 1])] })
  assert.equal(res.statusCode, 200)
  assert.equal(published.length, 1)
  assert.equal(published[0].TopicArn, process.env.SNS_DESPENSA_TOPIC_ARN)
  assert.match(published[0].Subject, /^[\x20-\x7E]+$/)
  assert.equal(published[0].Subject, '[HomeOps Alerta Super] Stock bajo: Leche Entera')
})
