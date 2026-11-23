import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { installFakeDynamo, apiEvent } from './helpers/fakeDynamo.mjs'
import { signJwt } from '#shared/jwt.mjs'
import { handler, calcularPorcentajeVisual } from '../lambdas/inventario/index.mjs'

process.env.JWT_SECRET = 'test-secret'
const token = signJwt({ sub: 'usr_admin', nombre: 'admin', rol: 'admin' })

let fake
const call = async (method, path, opts = {}) => {
  const res = await handler(apiEvent(method, path, { token, ...opts }))
  return { status: res.statusCode, body: res.body ? JSON.parse(res.body) : null }
}

beforeEach(() => {
  fake = installFakeDynamo({
    'homeops-productos': [
      { id: 'prod_leche', nombre: 'Leche', categoria: 'Lácteos', cantidad_actual: 1, unidad_medida: 'L', cantidad_minima: 1, porcentaje_visual: 100, precio_promedio: 20 },
      { id: 'prod_arroz', nombre: 'Arroz', categoria: 'Despensa', cantidad_actual: 5, unidad_medida: 'kg', cantidad_minima: 1, porcentaje_visual: 100, precio_promedio: 0 },
    ],
  })
})
afterEach(() => fake.restore())

test('calcularPorcentajeVisual alinea el umbral crítico', () => {
  assert.equal(calcularPorcentajeVisual(0, 1), 0)
  assert.equal(calcularPorcentajeVisual(1, 1), 25, 'actual === mínima es crítico, no 100 %')
  assert.equal(calcularPorcentajeVisual(1.5, 1), 50)
  assert.equal(calcularPorcentajeVisual(2, 1), 50)
  assert.equal(calcularPorcentajeVisual(3, 1), 75)
  assert.equal(calcularPorcentajeVisual(4, 1), 100)
  assert.equal(calcularPorcentajeVisual(5, 0), 100)
})

test('requiere JWT', async () => {
  const res = await handler(apiEvent('GET', '/api/protected/inventario'))
  assert.equal(res.statusCode, 401)
})

test('GET inventario ordena, filtra por categoría y corrige porcentaje', async () => {
  const all = await call('GET', '/api/protected/inventario')
  assert.equal(all.body.total, 2)
  assert.deepEqual(all.body.data.map((p) => p.nombre), ['Arroz', 'Leche'])
  assert.equal(all.body.data.find((p) => p.id === 'prod_leche').porcentaje_visual, 25)

  const lacteos = await call('GET', '/api/protected/inventario', { query: { categoria: 'Lácteos' } })
  assert.deepEqual(lacteos.body.data.map((p) => p.id), ['prod_leche'])
})

test('GET critico incluye actual === mínima', async () => {
  const res = await call('GET', '/api/protected/inventario/critico')
  assert.deepEqual(res.body.data.map((p) => p.id), ['prod_leche'])
  assert.equal(res.body.total, 1)
})

test('POST crea producto con id prod_, categoría por defecto y validación 422', async () => {
  const ok = await call('POST', '/api/protected/inventario', { body: { nombre: 'Jabón', cantidad_actual: 4, cantidad_minima: 2, unidad_medida: 'pza' } })
  assert.equal(ok.status, 201)
  assert.match(ok.body.id, /^prod_[0-9a-f]{8}$/)
  assert.equal(ok.body.categoria, 'Despensa')
  assert.equal(ok.body.porcentaje_visual, 50)
  assert.equal(ok.body.actualizado_por, 'usr_admin')

  const sinNombre = await call('POST', '/api/protected/inventario', { body: { cantidad_actual: 1 } })
  assert.equal(sinNombre.status, 422)
  assert.ok(Array.isArray(sinNombre.body.errors))
  assert.equal((await call('POST', '/api/protected/inventario', { body: { nombre: 'X', cantidad_actual: -1 } })).status, 422)
  assert.equal((await call('POST', '/api/protected/inventario', { body: { nombre: 'X', cantidad_actual: '' } })).status, 422)
  assert.equal((await call('POST', '/api/protected/inventario', { body: { nombre: 'X', categoria: 'Inventada' } })).status, 422)
})

test('PUT actualiza y recalcula porcentaje', async () => {
  const res = await call('PUT', '/api/protected/inventario/prod_arroz', { body: { nombre: 'Arroz', cantidad_actual: 1, cantidad_minima: 2 } })
  assert.equal(res.status, 200)
  assert.equal(res.body.porcentaje_visual, 25)
  assert.equal(res.body.unidad_medida, 'kg', 'conserva campos no enviados')
  assert.equal((await call('PUT', '/api/protected/inventario/nope', { body: { nombre: 'X' } })).status, 404)
})

test('PATCH stock con delta y cantidad absoluta, mínimo 0', async () => {
  const dec = await call('PATCH', '/api/protected/inventario/prod_arroz/stock', { body: { delta: -1 } })
  assert.equal(dec.body.cantidad_actual, 4)
  assert.equal(dec.body.actualizado_por, 'usr_admin')
  assert.equal(fake.list('homeops-productos').find((p) => p.id === 'prod_arroz').cantidad_actual, 4)

  const abs = await call('PATCH', '/api/protected/inventario/prod_arroz/stock', { body: { cantidad_actual: 1 } })
  assert.equal(abs.body.cantidad_actual, 1)
  assert.equal(abs.body.porcentaje_visual, 25)

  const zero = await call('PATCH', '/api/protected/inventario/prod_arroz/stock', { body: { delta: -10 } })
  assert.equal(zero.body.cantidad_actual, 0)
  assert.equal(zero.body.porcentaje_visual, 0)

  assert.equal((await call('PATCH', '/api/protected/inventario/prod_arroz/stock', { body: {} })).status, 422)
  assert.equal((await call('PATCH', '/api/protected/inventario/prod_arroz/stock', { body: { delta: 'x' } })).status, 422)
  assert.equal((await call('PATCH', '/api/protected/inventario/nope/stock', { body: { delta: 1 } })).status, 404)
})

test('DELETE elimina producto', async () => {
  assert.equal((await call('DELETE', '/api/protected/inventario/prod_arroz')).status, 200)
  assert.equal((await call('DELETE', '/api/protected/inventario/prod_arroz')).status, 404)
})

test('compras/registrar suma stock, promedia precio y recalcula porcentaje', async () => {
  const res = await call('POST', '/api/protected/compras/registrar', {
    body: { items: [
      { id_producto: 'prod_leche', precio_pagado: 30, cantidad_comprada: 2 },
      { id_producto: 'prod_arroz', precio_pagado: 25.5, cantidad_comprada: 1 },
    ] },
  })
  assert.equal(res.status, 200)
  const leche = fake.list('homeops-productos').find((p) => p.id === 'prod_leche')
  assert.equal(leche.cantidad_actual, 3)
  assert.equal(leche.precio_promedio, 25, '(20 + 30) / 2')
  assert.equal(leche.porcentaje_visual, 75)
  const arroz = fake.list('homeops-productos').find((p) => p.id === 'prod_arroz')
  assert.equal(arroz.cantidad_actual, 6)
  assert.equal(arroz.precio_promedio, 25.5, 'sin promedio previo usa el precio pagado')
  assert.equal(res.body.items_actualizados.length, 2)
})

test('compras/registrar acepta el mismo producto repetido y es atómico ante errores', async () => {
  const rep = await call('POST', '/api/protected/compras/registrar', {
    body: { items: [
      { id_producto: 'prod_arroz', precio_pagado: 10, cantidad_comprada: 1 },
      { id_producto: 'prod_arroz', precio_pagado: 20, cantidad_comprada: 1 },
    ] },
  })
  assert.equal(rep.status, 200)
  assert.equal(fake.list('homeops-productos').find((p) => p.id === 'prod_arroz').cantidad_actual, 7)

  const antes = JSON.stringify(fake.list('homeops-productos'))
  const bad = await call('POST', '/api/protected/compras/registrar', {
    body: { items: [
      { id_producto: 'prod_leche', precio_pagado: 30, cantidad_comprada: 2 },
      { id_producto: 'no_existe', precio_pagado: 1, cantidad_comprada: 1 },
    ] },
  })
  assert.equal(bad.status, 404)
  assert.equal(JSON.stringify(fake.list('homeops-productos')), antes, 'no modifica nada si falla uno')

  assert.equal((await call('POST', '/api/protected/compras/registrar', { body: { items: [] } })).status, 422)
  assert.equal((await call('POST', '/api/protected/compras/registrar', { body: { items: [{ id_producto: 'prod_leche', precio_pagado: -1, cantidad_comprada: 1 }] } })).status, 422)
  assert.equal((await call('POST', '/api/protected/compras/registrar', { body: { items: [{ id_producto: 'prod_leche', precio_pagado: 1, cantidad_comprada: 0 }] } })).status, 422)
  assert.equal((await call('POST', '/api/protected/compras/registrar', { body: { items: [{ precio_pagado: 1, cantidad_comprada: 1 }] } })).status, 422)
})
