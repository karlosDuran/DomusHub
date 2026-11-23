import { randomUUID } from 'node:crypto'
import { GetCommand, PutCommand, DeleteCommand, UpdateCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb'
import { ddb, tables, scanAll, buildUpdate } from '#shared/dynamoClient.mjs'
import { authenticateRequest } from '#shared/jwt.mjs'
import { createRouter, HttpError, invalid } from '#shared/http.mjs'

export const CATEGORIAS = [
  'Despensa', 'Lácteos', 'Limpieza', 'Frutas y Verduras',
  'Carnes y Fríos', 'Higiene', 'Bebidas', 'Otros',
]

/**
 * Porcentaje visual alineado con el umbral de alerta crítica (y con DynamoDB Streams → SNS).
 * Corrige el backend PHP, que mostraba 100 % verde cuando `actual === mínima`.
 */
export function calcularPorcentajeVisual(cantidadActual, cantidadMinima) {
  if (cantidadActual <= 0) return 0
  if (cantidadMinima <= 0) return 100
  if (cantidadActual <= cantidadMinima) return 25 // Crítico (rojo) — coincide con alerta SNS
  if (cantidadActual <= cantidadMinima * 2) return 50 // Medio (amarillo)
  if (cantidadActual <= cantidadMinima * 3) return 75 // Bueno (verde)
  return 100 // Óptimo (verde)
}

const round3 = (n) => Math.round(n * 1000) / 1000
const round2 = (n) => Math.round(n * 100) / 100
const esCritico = (p) => Number(p.cantidad_actual) <= Number(p.cantidad_minima) || Number(p.porcentaje_visual) <= 25

/** Normaliza un producto leído de DynamoDB recalculando el porcentaje visual. */
const conPorcentaje = (p) => ({
  ...p,
  porcentaje_visual: calcularPorcentajeVisual(Number(p.cantidad_actual), Number(p.cantidad_minima)),
})

const byNombre = (a, b) => a.nombre.localeCompare(b.nombre, 'es')

// ── Validación ──────────────────────────────────────────────────────────────

function numero(valor, campo, errores, { min = 0, minExclusivo = false } = {}) {
  const n = typeof valor === 'string' && valor.trim() === '' ? NaN : Number(valor)
  if (!Number.isFinite(n) || (minExclusivo ? n <= min : n < min)) {
    errores.push(`"${campo}" debe ser un número ${minExclusivo ? 'mayor que' : 'mayor o igual a'} ${min}`)
    return 0
  }
  return n
}

/** Valida y normaliza los campos editables de un producto (`base` aporta los valores por defecto). */
function validarProducto(data, base = {}) {
  const errores = []
  const merged = { ...base, ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) }

  const nombre = typeof merged.nombre === 'string' ? merged.nombre.trim() : ''
  if (!nombre) errores.push('El nombre es obligatorio')
  if (nombre.length > 80) errores.push('El nombre no puede exceder 80 caracteres')

  const categoria = merged.categoria ?? 'Despensa'
  if (!CATEGORIAS.includes(categoria)) errores.push(`La categoría debe ser una de: ${CATEGORIAS.join(', ')}`)

  const cantidad_actual = numero(merged.cantidad_actual ?? 0, 'cantidad_actual', errores)
  const cantidad_minima = numero(merged.cantidad_minima ?? 1, 'cantidad_minima', errores)
  const precio_promedio = numero(merged.precio_promedio ?? 0, 'precio_promedio', errores)
  const unidad_medida = String(merged.unidad_medida ?? 'unidad').trim() || 'unidad'

  if (errores.length) throw invalid(errores[0], { errors: errores })

  return {
    nombre,
    categoria,
    cantidad_actual: round3(cantidad_actual),
    unidad_medida,
    cantidad_minima: round3(cantidad_minima),
    precio_promedio: round2(precio_promedio),
    porcentaje_visual: calcularPorcentajeVisual(cantidad_actual, cantidad_minima),
  }
}

async function getProducto(id) {
  const { Item } = await ddb.send(new GetCommand({ TableName: tables.productos, Key: { id } }))
  return Item
}

const isConditionFailure = (err) =>
  err?.name === 'ConditionalCheckFailedException' || err?.name === 'TransactionCanceledException'

// ── Rutas ───────────────────────────────────────────────────────────────────

const router = createRouter()

router.get('/api/protected/inventario/critico', async ({ event }) => {
  authenticateRequest(event)
  const productos = (await scanAll({ TableName: tables.productos })).map(conPorcentaje)
  const data = productos.filter(esCritico).sort(byNombre)
  return { body: { data, total: data.length } }
})

router.get('/api/protected/inventario', async ({ event, query }) => {
  authenticateRequest(event)
  let productos = (await scanAll({ TableName: tables.productos })).map(conPorcentaje)
  if (query.categoria) productos = productos.filter((p) => (p.categoria || 'Despensa') === query.categoria)
  const data = productos.sort(byNombre)
  return { body: { data, total: data.length } }
})

router.post('/api/protected/inventario', async ({ event, body }) => {
  const claims = authenticateRequest(event)
  const producto = {
    id: `prod_${randomUUID().slice(0, 8)}`,
    ...validarProducto(body()),
    actualizado_por: claims.sub,
    fecha_creacion: new Date().toISOString(),
  }
  await ddb.send(new PutCommand({
    TableName: tables.productos,
    Item: producto,
    ConditionExpression: 'attribute_not_exists(id)',
  }))
  return { status: 201, body: producto }
})

router.put('/api/protected/inventario/:id', async ({ event, params, body }) => {
  const claims = authenticateRequest(event)
  const actual = await getProducto(params.id)
  if (!actual) throw new HttpError(404, 'Producto no encontrado')

  const producto = {
    ...actual,
    ...validarProducto(body(), actual),
    actualizado_por: claims.sub,
  }
  await ddb.send(new PutCommand({
    TableName: tables.productos,
    Item: producto,
    ConditionExpression: 'attribute_exists(id)',
  }))
  return { body: producto }
})

router.patch('/api/protected/inventario/:id/stock', async ({ event, params, body }) => {
  const claims = authenticateRequest(event)
  const data = body()
  const tieneDelta = data.delta !== undefined
  const tieneCantidad = data.cantidad_actual !== undefined
  if (tieneDelta === tieneCantidad) {
    throw invalid('Envía "delta" o "cantidad_actual" (solo uno de los dos)')
  }

  const valor = Number(tieneDelta ? data.delta : data.cantidad_actual)
  if (!Number.isFinite(valor) || (tieneDelta ? false : valor < 0)) {
    throw invalid(tieneDelta ? '"delta" debe ser numérico' : '"cantidad_actual" debe ser un número mayor o igual a 0')
  }

  // Concurrencia optimista: dos descuentos simultáneos no deben pisarse.
  for (let intento = 0; intento < 3; intento++) {
    const actual = await getProducto(params.id)
    if (!actual) throw new HttpError(404, 'Producto no encontrado')

    const anterior = Number(actual.cantidad_actual)
    const nueva = round3(Math.max(0, tieneDelta ? anterior + valor : valor))
    const cambios = {
      cantidad_actual: nueva,
      porcentaje_visual: calcularPorcentajeVisual(nueva, Number(actual.cantidad_minima)),
      actualizado_por: claims.sub,
      fecha_actualizacion: new Date().toISOString(),
    }

    const upd = buildUpdate({ set: cambios })
    try {
      // Esta escritura dispara DynamoDB Streams → homeops-stock-alerts → SNS.
      await ddb.send(new UpdateCommand({
        TableName: tables.productos,
        Key: { id: params.id },
        UpdateExpression: upd.UpdateExpression,
        ConditionExpression: '#ca = :old',
        ExpressionAttributeNames: { ...upd.ExpressionAttributeNames, '#ca': 'cantidad_actual' },
        ExpressionAttributeValues: { ...upd.ExpressionAttributeValues, ':old': actual.cantidad_actual },
      }))
      return { body: { ...actual, ...cambios } }
    } catch (err) {
      if (!isConditionFailure(err)) throw err
    }
  }
  throw new HttpError(409, 'El producto fue modificado por otra persona, intenta de nuevo')
})

router.delete('/api/protected/inventario/:id', async ({ event, params }) => {
  authenticateRequest(event)
  if (!(await getProducto(params.id))) throw new HttpError(404, 'Producto no encontrado')
  await ddb.send(new DeleteCommand({ TableName: tables.productos, Key: { id: params.id } }))
  return { body: { message: 'Producto eliminado correctamente' } }
})

router.post('/api/protected/compras/registrar', async ({ event, body }) => {
  const claims = authenticateRequest(event)
  const { items } = body()
  if (!Array.isArray(items) || items.length === 0) {
    throw invalid('El campo "items" es obligatorio y debe ser un array')
  }

  // 1. Validar estructura de cada item
  for (const item of items) {
    if (!item?.id_producto || item.precio_pagado === undefined || item.cantidad_comprada === undefined) {
      throw invalid('Cada item debe contener "id_producto", "precio_pagado" y "cantidad_comprada"')
    }
    const precio = Number(item.precio_pagado)
    const cantidad = Number(item.cantidad_comprada)
    if (!Number.isFinite(precio) || precio < 0 || !Number.isFinite(cantidad) || cantidad <= 0) {
      throw invalid('Valores de precio o cantidad inválidos')
    }
  }

  // 2. Cargar y validar que existan todos los productos (una sola vez por producto)
  const ids = [...new Set(items.map((i) => String(i.id_producto)))]
  if (ids.length > 100) throw invalid('Máximo 100 productos distintos por compra')
  const cargados = await Promise.all(ids.map(getProducto))
  const productos = new Map()
  ids.forEach((id, i) => {
    if (!cargados[i]) throw new HttpError(404, `Producto con ID ${id} no encontrado`)
    productos.set(id, {
      original: cargados[i],
      cantidad: Number(cargados[i].cantidad_actual),
      precio: Number(cargados[i].precio_promedio) || 0,
    })
  })

  // 3. Aplicar compras en memoria (soporta el mismo producto repetido en la lista)
  for (const item of items) {
    const p = productos.get(String(item.id_producto))
    const pagado = Number(item.precio_pagado)
    p.cantidad = round3(p.cantidad + Number(item.cantidad_comprada))
    // Corrección: promedio móvil en lugar de sobrescribir con el último precio.
    p.precio = p.precio > 0 ? round2((p.precio + pagado) / 2) : round2(pagado)
  }

  // 4. Escritura atómica: todo o nada
  const ahora = new Date().toISOString()
  const transactItems = []
  const itemsActualizados = []
  for (const [id, p] of productos) {
    const porcentaje = calcularPorcentajeVisual(p.cantidad, Number(p.original.cantidad_minima))
    const upd = buildUpdate({
      set: {
        cantidad_actual: p.cantidad,
        porcentaje_visual: porcentaje,
        precio_promedio: p.precio,
        actualizado_por: claims.sub,
        fecha_actualizacion: ahora,
      },
    })
    transactItems.push({
      Update: {
        TableName: tables.productos,
        Key: { id },
        UpdateExpression: upd.UpdateExpression,
        ConditionExpression: '#ca = :old',
        ExpressionAttributeNames: { ...upd.ExpressionAttributeNames, '#ca': 'cantidad_actual' },
        ExpressionAttributeValues: { ...upd.ExpressionAttributeValues, ':old': p.original.cantidad_actual },
      },
    })
    itemsActualizados.push({
      id,
      cantidad_anterior: p.original.cantidad_actual,
      nueva_cantidad: p.cantidad,
      nuevo_precio_promedio: p.precio,
      porcentaje_visual: porcentaje,
    })
  }

  try {
    await ddb.send(new TransactWriteCommand({ TransactItems: transactItems }))
  } catch (err) {
    if (isConditionFailure(err)) {
      throw new HttpError(409, 'El inventario cambió mientras registrabas la compra, intenta de nuevo')
    }
    throw err
  }

  return {
    body: {
      message: 'Compra registrada y stock actualizado con éxito.',
      items_actualizados: itemsActualizados,
    },
  }
})

export const handler = router.handler
