import { createHmac, timingSafeEqual } from 'node:crypto'
import { HttpError } from './http.mjs'

const b64url = (input) => Buffer.from(input).toString('base64url')

function getSecret() {
  const secret = process.env.JWT_SECRET
  // Corrección respecto al backend PHP: jamás usar una clave por defecto hardcodeada.
  if (!secret) throw new HttpError(500, 'JWT_SECRET no está configurado en el servidor')
  return secret
}

function sign(data, secret) {
  return createHmac('sha256', secret).update(data).digest()
}

/** Firma un JWT HS256. `expiresIn` en segundos (por defecto `JWT_EXPIRATION` o 3600). */
export function signJwt(payload, { expiresIn } = {}) {
  const secret = getSecret()
  const ttl = expiresIn ?? (Number(process.env.JWT_EXPIRATION) || 3600)
  const iat = Math.floor(Date.now() / 1000)
  const body = { iss: 'homeops', ...payload, iat, exp: iat + ttl }

  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const data = `${header}.${b64url(JSON.stringify(body))}`
  return `${data}.${sign(data, secret).toString('base64url')}`
}

/** Verifica firma y expiración. Lanza `HttpError(401)` si el token no es válido. */
export function verifyJwt(token) {
  const secret = getSecret()
  const parts = String(token).split('.')
  if (parts.length !== 3) throw new HttpError(401, 'Token inválido')

  const [header, payload, signature] = parts
  const expected = sign(`${header}.${payload}`, secret)
  const received = Buffer.from(signature, 'base64url')
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    throw new HttpError(401, 'Token inválido')
  }

  let claims
  let head
  try {
    head = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'))
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    throw new HttpError(401, 'Token inválido')
  }
  if (head.alg !== 'HS256') throw new HttpError(401, 'Token inválido')
  if (typeof claims.exp !== 'number' || claims.exp <= Math.floor(Date.now() / 1000)) {
    throw new HttpError(401, 'Token expirado')
  }
  return claims
}

/**
 * Autentica la petición leyendo `Authorization: Bearer <token>` (insensible a mayúsculas).
 * @returns {object} claims `{ sub, nombre, rol, ... }`
 */
export function authenticateRequest(event) {
  const headers = event.headers || {}
  const header = headers.authorization || headers.Authorization
    || Object.entries(headers).find(([k]) => k.toLowerCase() === 'authorization')?.[1]
  const match = /^Bearer\s+(.+)$/i.exec(header || '')
  if (!match) throw new HttpError(401, 'Token de autorización requerido')
  return verifyJwt(match[1])
}

/** Exige rol `admin` en los claims. */
export function requireAdmin(claims) {
  if (claims.rol !== 'admin') throw new HttpError(403, 'Se requiere rol de administrador')
}
