import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb'

const client = new DynamoDBClient({})

/** Singleton de DynamoDBDocumentClient reutilizado entre invocaciones (warm start). */
export const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
})

/** Nombres de tablas (configurables por variables de entorno de cada Lambda). */
export const tables = {
  get usuarios() { return process.env.TABLE_USUARIOS || 'homeops-usuarios' },
  get productos() { return process.env.TABLE_PRODUCTOS || 'homeops-productos' },
  get columnas() { return process.env.TABLE_COLUMNAS || 'homeops-kanban-columnas' },
  get tareas() { return process.env.TABLE_TAREAS || 'homeops-tareas' },
  get historial() { return process.env.TABLE_HISTORIAL || 'homeops-tareas-historial' },
}

/** Scan paginado: las tablas de un hogar son diminutas, así que se lee completa. */
export async function scanAll(params) {
  const items = []
  let ExclusiveStartKey
  do {
    const res = await ddb.send(new ScanCommand({ ...params, ExclusiveStartKey }))
    items.push(...(res.Items || []))
    ExclusiveStartKey = res.LastEvaluatedKey
  } while (ExclusiveStartKey)
  return items
}

/**
 * Construye los parámetros de un UpdateItem a partir de un objeto de cambios.
 * - `set`: atributos a escribir (los valores `undefined` se ignoran).
 * - `remove`: atributos a eliminar.
 */
export function buildUpdate({ set = {}, remove = [] }) {
  const names = {}
  const values = {}
  const setParts = []
  const removeParts = []
  let i = 0

  for (const [key, value] of Object.entries(set)) {
    if (value === undefined) continue
    names[`#n${i}`] = key
    values[`:v${i}`] = value
    setParts.push(`#n${i} = :v${i}`)
    i++
  }
  for (const key of remove) {
    names[`#n${i}`] = key
    removeParts.push(`#n${i}`)
    i++
  }

  const clauses = []
  if (setParts.length) clauses.push(`SET ${setParts.join(', ')}`)
  if (removeParts.length) clauses.push(`REMOVE ${removeParts.join(', ')}`)

  return {
    UpdateExpression: clauses.join(' '),
    ExpressionAttributeNames: names,
    ...(Object.keys(values).length ? { ExpressionAttributeValues: values } : {}),
  }
}
