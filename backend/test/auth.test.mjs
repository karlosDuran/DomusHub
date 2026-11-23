import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { installFakeDynamo, apiEvent } from './helpers/fakeDynamo.mjs'
import { hashSecret } from '#shared/password.mjs'
import { handler } from '../lambdas/auth/index.mjs'

process.env.JWT_SECRET = 'test-secret'

let fake
const call = async (method, path, opts) => {
  const res = await handler(apiEvent(method, path, opts))
  return { status: res.statusCode, body: res.body ? JSON.parse(res.body) : null }
}

beforeEach(() => {
  fake = installFakeDynamo({
    'homeops-usuarios': [
      { id: 'usr_admin', nombre: 'admin', email: 'a@x.com', rol: 'admin', password_hash: hashSecret('admin123'), pin_hash: hashSecret('1234'), avatar_color: '#2a9d8f' },
      { id: 'usr_ana', nombre: 'Ana', email: 'ana@x.com', rol: 'miembro', password_hash: hashSecret('secreto1'), pin_hash: null, avatar_color: '#e76f51' },
    ],
  })
})
afterEach(() => fake.restore())

const loginAdmin = async () => (await call('POST', '/api/auth/login', { body: { nombre: 'admin', password: 'admin123' } })).body.token

test('GET /perfiles es público y no filtra hashes ni emails', async () => {
  const { status, body } = await call('GET', '/api/auth/perfiles')
  assert.equal(status, 200)
  assert.equal(body.length, 2)
  assert.deepEqual(Object.keys(body[0]).sort(), ['avatar_color', 'id', 'nombre', 'rol', 'tiene_pin'])
  assert.equal(body.find((p) => p.id === 'usr_admin').tiene_pin, true)
  assert.equal(body.find((p) => p.id === 'usr_ana').tiene_pin, false)
})

test('login con contraseña', async () => {
  const ok = await call('POST', '/api/auth/login', { body: { nombre: 'admin', password: 'admin123' } })
  assert.equal(ok.status, 200)
  assert.ok(ok.body.token)
  assert.equal(ok.body.user.id, 'usr_admin')

  assert.equal((await call('POST', '/api/auth/login', { body: { nombre: 'admin', password: 'mal' } })).status, 401)
  assert.equal((await call('POST', '/api/auth/login', { body: { nombre: 'nadie', password: 'x' } })).status, 401)
  assert.equal((await call('POST', '/api/auth/login', { body: { nombre: 'admin' } })).status, 400)
})

test('login con PIN y bloqueo tras 5 fallos', async () => {
  const ok = await call('POST', '/api/auth/login-pin', { body: { user_id: 'usr_admin', pin: '1234' } })
  assert.equal(ok.status, 200)
  assert.ok(ok.body.token)

  assert.equal((await call('POST', '/api/auth/login-pin', { body: { user_id: 'usr_ana', pin: '1234' } })).status, 401)

  for (let i = 0; i < 5; i++) {
    assert.equal((await call('POST', '/api/auth/login-pin', { body: { user_id: 'usr_admin', pin: '0000' } })).status, 401)
  }
  // ahora está bloqueado incluso con el PIN correcto
  assert.equal((await call('POST', '/api/auth/login-pin', { body: { user_id: 'usr_admin', pin: '1234' } })).status, 429)
})

test('rutas protegidas exigen JWT', async () => {
  assert.equal((await call('GET', '/api/protected/health')).status, 401)
  const token = await loginAdmin()
  const health = await call('GET', '/api/protected/health', { token })
  assert.equal(health.status, 200)
  assert.equal(health.body.user_id, 'usr_admin')
})

test('CRUD de usuarios solo para admin', async () => {
  const token = await loginAdmin()

  const lista = await call('GET', '/api/protected/usuarios', { token })
  assert.equal(lista.body.find((u) => u.id === 'usr_ana').email, 'ana@x.com')

  const creado = await call('POST', '/api/protected/usuarios', {
    token, body: { nombre: 'Luis', email: 'luis@x.com', rol: 'miembro', password: 'abcdef', pin: '4321' },
  })
  assert.equal(creado.status, 201)
  assert.equal(creado.body.tiene_pin, true)
  assert.ok(!('password_hash' in creado.body))

  assert.equal((await call('POST', '/api/protected/usuarios', { token, body: { nombre: 'Luis', password: 'abcdef' } })).status, 409)
  assert.equal((await call('POST', '/api/protected/usuarios', { token, body: { nombre: 'Z', password: '123' } })).status, 422)
  assert.equal((await call('POST', '/api/protected/usuarios', { token, body: { nombre: 'Z', password: 'abcdef', pin: '12' } })).status, 422)
  assert.equal((await call('POST', '/api/protected/usuarios', { token, body: { nombre: 'Z', password: 'abcdef', email: 'malo' } })).status, 422)

  // el nuevo usuario puede entrar con su PIN
  const pinLogin = await call('POST', '/api/auth/login-pin', { body: { user_id: creado.body.id, pin: '4321' } })
  assert.equal(pinLogin.status, 200)

  const upd = await call('PUT', `/api/protected/usuarios/${creado.body.id}`, { token, body: { email: 'nuevo@x.com', pin: '' } })
  assert.equal(upd.status, 200)
  assert.equal(upd.body.email, 'nuevo@x.com')
  assert.equal(upd.body.tiene_pin, false)

  // un miembro no puede administrar
  const tokenAna = (await call('POST', '/api/auth/login', { body: { nombre: 'Ana', password: 'secreto1' } })).body.token
  assert.equal((await call('POST', '/api/protected/usuarios', { token: tokenAna, body: { nombre: 'X', password: 'abcdef' } })).status, 403)

  // no puede eliminarse a sí mismo ni quitarse el rol admin
  assert.equal((await call('DELETE', '/api/protected/usuarios/usr_admin', { token })).status, 400)
  assert.equal((await call('PUT', '/api/protected/usuarios/usr_admin', { token, body: { rol: 'miembro' } })).status, 422)

  assert.equal((await call('DELETE', `/api/protected/usuarios/${creado.body.id}`, { token })).status, 200)
  assert.equal((await call('DELETE', `/api/protected/usuarios/${creado.body.id}`, { token })).status, 404)
})

test('OPTIONS devuelve 204 con CORS', async () => {
  const res = await handler(apiEvent('OPTIONS', '/api/auth/login'))
  assert.equal(res.statusCode, 204)
  assert.ok(res.headers['Access-Control-Allow-Methods'].includes('PATCH'))
})
