/** Error HTTP controlado: se traduce a una respuesta JSON con su código. */
export class HttpError extends Error {
  constructor(statusCode, message, extra = {}) {
    super(message)
    this.statusCode = statusCode
    this.extra = extra
  }
}

const CORS_HEADERS = () => ({
  'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
})

export function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS(),
    },
    body: JSON.stringify(body),
  }
}

/** Respuesta 204 para el preflight `OPTIONS`. */
export function noContentResponse() {
  return { statusCode: 204, headers: CORS_HEADERS(), body: '' }
}

/** Convierte cualquier excepción en respuesta HTTP (los errores no controlados son 500). */
export function errorResponse(err) {
  if (err instanceof HttpError) {
    return jsonResponse(err.statusCode, { error: err.message, ...err.extra })
  }
  console.error('Error no controlado:', err)
  return jsonResponse(500, { error: 'Error interno del servidor' })
}

/**
 * Parsea el body JSON del evento. Devuelve `{}` si viene vacío y lanza
 * `400 Bad Request` si el JSON es malformado o no es un objeto.
 */
export function parseBody(event) {
  if (!event.body) return {}
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body
  if (!raw.trim()) return {}

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new HttpError(400, 'El cuerpo de la petición no es un JSON válido')
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new HttpError(400, 'El cuerpo de la petición debe ser un objeto JSON')
  }
  return parsed
}

/** Lanza `422` con el mensaje dado (validaciones de negocio; nunca usar 420). */
export function invalid(message, extra) {
  return new HttpError(422, message, extra)
}

/** Normaliza el evento de API Gateway (REST v1 o HTTP API v2) a `{ method, path, query }`. */
export function normalizeEvent(event) {
  const method = (event.httpMethod || event.requestContext?.http?.method || 'GET').toUpperCase()
  let path = event.path || event.rawPath || '/'
  // Si el stage llega en la ruta (HTTP API / dominios custom) lo descartamos.
  path = path.replace(/^\/(prod|dev|stage)(?=\/api\/)/, '')
  if (path.length > 1) path = path.replace(/\/+$/, '')
  return { method, path, query: event.queryStringParameters || {} }
}

/**
 * Router mínimo con parámetros `:id`.
 *
 *   const router = createRouter()
 *   router.get('/api/protected/items/:id', async ({ params }) => ...)
 *   export const handler = router.handler
 *
 * Cada ruta recibe `{ event, params, query, body() }` y devuelve `{ status, body }`
 * (o una respuesta Lambda completa con `statusCode`).
 */
export function createRouter() {
  const routes = []

  const add = (methods, pattern, handler) => {
    const keys = []
    const regex = new RegExp(
      '^' + pattern.replace(/:([A-Za-z_]+)/g, (_, key) => {
        keys.push(key)
        return '([^/]+)'
      }) + '$',
    )
    routes.push({ methods, regex, keys, handler })
  }

  const router = {
    get: (p, h) => add(['GET'], p, h),
    post: (p, h) => add(['POST'], p, h),
    put: (p, h) => add(['PUT'], p, h),
    patch: (p, h) => add(['PATCH'], p, h),
    delete: (p, h) => add(['DELETE'], p, h),
    match: (methods, p, h) => add(methods, p, h),

    async dispatch(event) {
      const { method, path, query } = normalizeEvent(event)
      if (method === 'OPTIONS') return noContentResponse()

      let pathMatched = false
      for (const route of routes) {
        const m = route.regex.exec(path)
        if (!m) continue
        pathMatched = true
        if (!route.methods.includes(method)) continue

        const params = {}
        route.keys.forEach((key, i) => { params[key] = decodeURIComponent(m[i + 1]) })

        const result = await route.handler({ event, params, query, body: () => parseBody(event) })
        if (result && result.statusCode) return result
        return jsonResponse(result?.status ?? 200, result?.body ?? {})
      }
      throw new HttpError(pathMatched ? 405 : 404, pathMatched ? 'Método no permitido' : 'Ruta no encontrada')
    },

    /** Handler de Lambda con manejo uniforme de errores. */
    async handler(event) {
      try {
        return await router.dispatch(event)
      } catch (err) {
        return errorResponse(err)
      }
    },
  }
  return router
}
