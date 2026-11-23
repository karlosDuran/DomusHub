import { randomUUID } from 'node:crypto'
import { GetCommand, PutCommand, DeleteCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { ddb, tables, scanAll } from '#shared/dynamoClient.mjs'
import { hashSecret, verifySecret } from '#shared/password.mjs'
import { signJwt, authenticateRequest, requireAdmin } from '#shared/jwt.mjs'
import { createRouter, HttpError, invalid } from '#shared/http.mjs'

const ROLES = ['admin', 'miembro']
const AVATAR_COLORS = ['#e76f51', '#2a9d8f', '#e9c46a', '#457b9d', '#8e6bbf', '#f4a261', '#6a994e']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const COLOR_RE = /^#[0-9a-fA-F]{6}$/
const PIN_RE = /^\d{4}$/

const PIN_MAX_INTENTOS = 5
const PIN_BLOQUEO_MS = 5 * 60 * 1000

// Hash de relleno para igualar el tiempo de respuesta cuando el usuario no existe.
const DUMMY_HASH = hashSecret('homeops-dummy')

/** Proyección segura para el selector de perfiles (sin hashes ni email). */
const toPerfil = (u) => ({
  id: u.id,
  nombre: u.nombre,
  rol: u.rol,
  avatar_color: u.avatar_color,
  tiene_pin: Boolean(u.pin_hash),
})

/** Proyección para usuarios autenticados (incluye email para las alertas SNS). */
const toUsuario = (u) => ({ ...toPerfil(u), email: u.email || '' })

const byNombre = (a, b) => a.nombre.localeCompare(b.nombre, 'es')

async function getUsuarioById(id) {
  const { Item } = await ddb.send(new GetCommand({ TableName: tables.usuarios, Key: { id } }))
  return Item
}

async function getUsuarioByNombre(nombre) {
  const { Items } = await ddb.send(new QueryCommand({
    TableName: tables.usuarios,
    IndexName: 'nombre-index',
    KeyConditionExpression: 'nombre = :nombre',
    ExpressionAttributeValues: { ':nombre': nombre },
    Limit: 1,
  }))
  return Items?.[0]
}

function emitirToken(user) {
  const token = signJwt({ sub: user.id, nombre: user.nombre, rol: user.rol })
  return { token, user: { id: user.id, nombre: user.nombre, rol: user.rol, avatar_color: user.avatar_color } }
}

// ── Validación ──────────────────────────────────────────────────────────────

function textoRequerido(valor, campo, max = 40) {
  const v = typeof valor === 'string' ? valor.trim() : ''
  if (!v) throw invalid(`El campo "${campo}" es obligatorio`)
  if (v.length > max) throw invalid(`El campo "${campo}" no puede exceder ${max} caracteres`)
  return v
}

function validarEmail(email) {
  const v = typeof email === 'string' ? email.trim() : ''
  if (v && !EMAIL_RE.test(v)) throw invalid('El correo electrónico no es válido')
  return v
}

function validarRol(rol) {
  if (!ROLES.includes(rol)) throw invalid(`El rol debe ser uno de: ${ROLES.join(', ')}`)
  return rol
}

function validarPassword(password) {
  if (typeof password !== 'string' || password.length < 6) {
    throw invalid('La contraseña debe tener al menos 6 caracteres')
  }
  return password
}

function validarPin(pin) {
  if (!PIN_RE.test(String(pin))) throw invalid('El PIN debe tener exactamente 4 dígitos')
  return String(pin)
}

function validarColor(color) {
  if (!COLOR_RE.test(String(color))) throw invalid('El color del avatar debe ser un hex como #2a9d8f')
  return String(color)
}

async function asegurarNombreUnico(nombre, exceptoId) {
  const existente = await getUsuarioByNombre(nombre)
  if (existente && existente.id !== exceptoId) {
    throw new HttpError(409, `Ya existe un integrante llamado "${nombre}"`)
  }
}

// ── Rutas públicas ──────────────────────────────────────────────────────────

const router = createRouter()

router.get('/api/auth/perfiles', async () => {
  const usuarios = await scanAll({ TableName: tables.usuarios })
  return { body: usuarios.map(toPerfil).sort(byNombre) }
})

router.post('/api/auth/login', async ({ body }) => {
  const { nombre, password } = body()
  if (!nombre || !password || typeof nombre !== 'string' || typeof password !== 'string') {
    throw new HttpError(400, 'Nombre y contraseña son requeridos')
  }

  const user = await getUsuarioByNombre(nombre.trim())
  const ok = verifySecret(password, user?.password_hash ?? DUMMY_HASH)
  if (!user || !ok) throw new HttpError(401, 'Credenciales inválidas')

  return { body: emitirToken(user) }
})

router.post('/api/auth/login-pin', async ({ body }) => {
  const { user_id, pin } = body()
  if (!user_id || typeof user_id !== 'string' || pin === undefined || pin === null) {
    throw new HttpError(400, 'user_id y pin son requeridos')
  }

  const user = await getUsuarioById(user_id)
  if (!user || !user.pin_hash) {
    verifySecret(String(pin), DUMMY_HASH)
    throw new HttpError(401, 'Credenciales inválidas')
  }

  // Un PIN de 4 dígitos solo tiene 10 000 combinaciones: se bloquea tras varios fallos.
  if (user.pin_bloqueado_hasta && Date.parse(user.pin_bloqueado_hasta) > Date.now()) {
    throw new HttpError(429, 'Demasiados intentos fallidos. Intenta de nuevo en unos minutos')
  }

  if (!PIN_RE.test(String(pin)) || !verifySecret(String(pin), user.pin_hash)) {
    const intentos = (user.pin_intentos || 0) + 1
    const bloquear = intentos >= PIN_MAX_INTENTOS
    await ddb.send(new UpdateCommand({
      TableName: tables.usuarios,
      Key: { id: user.id },
      UpdateExpression: 'SET pin_intentos = :i, pin_bloqueado_hasta = :b',
      ExpressionAttributeValues: {
        ':i': bloquear ? 0 : intentos,
        ':b': bloquear ? new Date(Date.now() + PIN_BLOQUEO_MS).toISOString() : null,
      },
    }))
    throw new HttpError(401, 'PIN incorrecto')
  }

  if (user.pin_intentos) {
    await ddb.send(new UpdateCommand({
      TableName: tables.usuarios,
      Key: { id: user.id },
      UpdateExpression: 'SET pin_intentos = :i, pin_bloqueado_hasta = :b',
      ExpressionAttributeValues: { ':i': 0, ':b': null },
    }))
  }
  return { body: emitirToken(user) }
})

// ── Rutas protegidas ────────────────────────────────────────────────────────

router.get('/api/protected/health', async ({ event }) => {
  const claims = authenticateRequest(event)
  return { body: { status: 'ok', user_id: claims.sub, timestamp: new Date().toISOString() } }
})

router.get('/api/protected/usuarios', async ({ event }) => {
  authenticateRequest(event)
  const usuarios = await scanAll({ TableName: tables.usuarios })
  return { body: usuarios.map(toUsuario).sort(byNombre) }
})

router.post('/api/protected/usuarios', async ({ event, body }) => {
  requireAdmin(authenticateRequest(event))
  const data = body()

  const nombre = textoRequerido(data.nombre, 'nombre')
  const email = validarEmail(data.email)
  const rol = validarRol(data.rol ?? 'miembro')
  const password = validarPassword(data.password)
  const pin = data.pin ? validarPin(data.pin) : null
  const avatar_color = data.avatar_color
    ? validarColor(data.avatar_color)
    : AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]

  await asegurarNombreUnico(nombre)

  const user = {
    id: `usr_${randomUUID().slice(0, 8)}`,
    nombre,
    email,
    rol,
    password_hash: hashSecret(password),
    pin_hash: pin ? hashSecret(pin) : null,
    avatar_color,
    fecha_creacion: new Date().toISOString(),
  }
  await ddb.send(new PutCommand({
    TableName: tables.usuarios,
    Item: user,
    ConditionExpression: 'attribute_not_exists(id)',
  }))
  return { status: 201, body: toUsuario(user) }
})

router.put('/api/protected/usuarios/:id', async ({ event, params, body }) => {
  const claims = authenticateRequest(event)
  requireAdmin(claims)
  const data = body()

  const actual = await getUsuarioById(params.id)
  if (!actual) throw new HttpError(404, 'Integrante no encontrado')

  const nuevo = { ...actual }
  if (data.nombre !== undefined) nuevo.nombre = textoRequerido(data.nombre, 'nombre')
  if (data.email !== undefined) nuevo.email = validarEmail(data.email)
  if (data.rol !== undefined) nuevo.rol = validarRol(data.rol)
  if (data.avatar_color !== undefined) nuevo.avatar_color = validarColor(data.avatar_color)
  if (data.password) nuevo.password_hash = hashSecret(validarPassword(data.password))
  if (data.pin !== undefined) {
    // pin vacío/null → eliminar PIN; de lo contrario debe tener 4 dígitos
    nuevo.pin_hash = data.pin === null || data.pin === '' ? null : hashSecret(validarPin(data.pin))
    nuevo.pin_intentos = 0
    nuevo.pin_bloqueado_hasta = null
  }

  if (actual.id === claims.sub && nuevo.rol !== 'admin') {
    throw invalid('No puedes quitarte a ti mismo el rol de administrador')
  }
  if (nuevo.nombre !== actual.nombre) await asegurarNombreUnico(nuevo.nombre, actual.id)

  await ddb.send(new PutCommand({
    TableName: tables.usuarios,
    Item: nuevo,
    ConditionExpression: 'attribute_exists(id)',
  }))
  return { body: toUsuario(nuevo) }
})

router.delete('/api/protected/usuarios/:id', async ({ event, params }) => {
  const claims = authenticateRequest(event)
  requireAdmin(claims)

  if (params.id === claims.sub) throw new HttpError(400, 'No puedes eliminar tu propio usuario')
  const actual = await getUsuarioById(params.id)
  if (!actual) throw new HttpError(404, 'Integrante no encontrado')

  await ddb.send(new DeleteCommand({ TableName: tables.usuarios, Key: { id: params.id } }))
  return { body: { message: 'Integrante eliminado correctamente' } }
})

export const handler = router.handler
