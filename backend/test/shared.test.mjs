import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hashSecret, verifySecret } from '#shared/password.mjs'
import { signJwt, verifyJwt, authenticateRequest } from '#shared/jwt.mjs'
import { parseBody, jsonResponse, createRouter, HttpError } from '#shared/http.mjs'
import { buildUpdate } from '#shared/dynamoClient.mjs'

process.env.JWT_SECRET = 'test-secret'

test('password: hash y verificación (contraseña y PIN)', () => {
  const h = hashSecret('admin123')
  assert.match(h, /^scrypt\$[0-9a-f]{32}\$[0-9a-f]+$/)
  assert.ok(verifySecret('admin123', h))
  assert.ok(!verifySecret('otra', h))
  assert.notEqual(hashSecret('1234'), hashSecret('1234'), 'cada hash usa salt distinto')
  assert.ok(!verifySecret('1234', undefined))
})

test('jwt: firma, verificación, expiración y manipulación', () => {
  const token = signJwt({ sub: 'usr_1', nombre: 'ana', rol: 'admin' })
  const claims = verifyJwt(token)
  assert.equal(claims.sub, 'usr_1')
  assert.equal(claims.rol, 'admin')

  const expired = signJwt({ sub: 'x' }, { expiresIn: -10 })
  assert.throws(() => verifyJwt(expired), { statusCode: 401, message: 'Token expirado' })

  const [h, , s] = token.split('.')
  const forged = `${h}.${Buffer.from(JSON.stringify({ sub: 'x', rol: 'admin', exp: 9999999999 })).toString('base64url')}.${s}`
  assert.throws(() => verifyJwt(forged), { statusCode: 401 })
})

test('jwt: sin JWT_SECRET falla con 500 (nunca clave por defecto)', () => {
  const prev = process.env.JWT_SECRET
  delete process.env.JWT_SECRET
  assert.throws(() => signJwt({ sub: 'x' }), { statusCode: 500 })
  process.env.JWT_SECRET = prev
})

test('jwt: authenticateRequest acepta header en cualquier capitalización', () => {
  const token = signJwt({ sub: 'u' })
  assert.equal(authenticateRequest({ headers: { authorization: `Bearer ${token}` } }).sub, 'u')
  assert.equal(authenticateRequest({ headers: { Authorization: `bearer ${token}` } }).sub, 'u')
  assert.equal(authenticateRequest({ headers: { AUTHORIZATION: `Bearer ${token}` } }).sub, 'u')
  assert.throws(() => authenticateRequest({ headers: {} }), { statusCode: 401 })
})

test('http: parseBody valida JSON', () => {
  assert.deepEqual(parseBody({ body: null }), {})
  assert.deepEqual(parseBody({ body: '{"a":1}' }), { a: 1 })
  assert.deepEqual(parseBody({ body: Buffer.from('{"a":2}').toString('base64'), isBase64Encoded: true }), { a: 2 })
  assert.throws(() => parseBody({ body: '{malo' }), { statusCode: 400 })
  assert.throws(() => parseBody({ body: '[1]' }), { statusCode: 400 })
})

test('http: jsonResponse incluye CORS', () => {
  const r = jsonResponse(201, { ok: true })
  assert.equal(r.statusCode, 201)
  assert.equal(r.headers['Access-Control-Allow-Origin'], '*')
  assert.equal(r.headers['Access-Control-Allow-Headers'], 'Content-Type,Authorization')
  assert.deepEqual(JSON.parse(r.body), { ok: true })
})

test('http: router resuelve parámetros, 204 en OPTIONS, 404 y 405', async () => {
  const router = createRouter()
  router.get('/api/x/critico', async () => ({ body: { r: 'critico' } }))
  router.get('/api/x/:id', async ({ params }) => ({ body: { id: params.id } }))
  router.post('/api/x/:id', async ({ body }) => ({ status: 201, body: body() }))

  const ev = (httpMethod, path, body) => ({ httpMethod, path, body: body ? JSON.stringify(body) : null })
  assert.deepEqual(JSON.parse((await router.handler(ev('GET', '/api/x/critico'))).body), { r: 'critico' })
  assert.deepEqual(JSON.parse((await router.handler(ev('GET', '/api/x/abc/'))).body), { id: 'abc' })
  assert.equal((await router.handler(ev('POST', '/api/x/1', { a: 1 }))).statusCode, 201)
  assert.equal((await router.handler(ev('OPTIONS', '/api/x/1'))).statusCode, 204)
  assert.equal((await router.handler(ev('DELETE', '/api/x/1'))).statusCode, 405)
  assert.equal((await router.handler(ev('GET', '/api/nada'))).statusCode, 404)
  assert.equal((await router.handler(ev('POST', '/api/x/1', null))).statusCode, 201)
  assert.equal((await router.handler({ httpMethod: 'POST', path: '/api/x/1', body: '{x' })).statusCode, 400)
  assert.equal((await router.handler(ev('GET', '/prod/api/x/zz'))).statusCode, 200)
})

test('dynamoClient: buildUpdate genera SET y REMOVE', () => {
  const u = buildUpdate({ set: { a: 1, b: undefined, c: 'x' }, remove: ['d'] })
  assert.equal(u.UpdateExpression, 'SET #n0 = :v0, #n1 = :v1 REMOVE #n2')
  assert.deepEqual(u.ExpressionAttributeValues, { ':v0': 1, ':v1': 'x' })
  assert.deepEqual(u.ExpressionAttributeNames, { '#n0': 'a', '#n1': 'c', '#n2': 'd' })
})

test('HttpError conserva código', () => {
  assert.equal(new HttpError(422, 'x').statusCode, 422)
})
