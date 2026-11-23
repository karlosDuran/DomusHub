import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const KEY_LENGTH = 64

/**
 * Hash seguro con scrypt + salt aleatorio de 16 bytes.
 * Sirve tanto para contraseñas como para PIN de 4 dígitos.
 * Formato almacenado: `scrypt$<salt hex>$<hash hex>`.
 */
export function hashSecret(plain) {
  const salt = randomBytes(16)
  const hash = scryptSync(String(plain), salt, KEY_LENGTH)
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`
}

/** Verifica `plain` contra un hash generado por `hashSecret` (comparación en tiempo constante). */
export function verifySecret(plain, stored) {
  if (typeof stored !== 'string') return false
  const [scheme, saltHex, hashHex] = stored.split('$')
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false

  const expected = Buffer.from(hashHex, 'hex')
  const actual = scryptSync(String(plain), Buffer.from(saltHex, 'hex'), expected.length)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}
