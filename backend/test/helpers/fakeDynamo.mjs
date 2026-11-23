// DynamoDB en memoria para pruebas: reemplaza `ddb.send` y emula los comandos usados por las Lambdas.
import { ddb } from '../../shared/dynamoClient.mjs'

const KEYS = {
  'homeops-usuarios': ['id'],
  'homeops-productos': ['id'],
  'homeops-kanban-columnas': ['id'],
  'homeops-tareas': ['id'],
  'homeops-tareas-historial': ['tarea_id', 'fecha_registro'],
}

const clone = (o) => (o === undefined ? undefined : structuredClone(o))

function condError(name = 'ConditionalCheckFailedException') {
  const e = new Error(name)
  e.name = name
  return e
}

export function installFakeDynamo(seed = {}) {
  const db = {}
  for (const table of Object.keys(KEYS)) db[table] = new Map()
  const keyOf = (table, item) => KEYS[table].map((k) => item[k]).join('|')

  for (const [table, items] of Object.entries(seed)) {
    for (const item of items) db[table].set(keyOf(table, item), clone(item))
  }

  function checkCondition(cmd, existing) {
    const cond = cmd.ConditionExpression
    if (!cond) return
    if (cond.includes('attribute_not_exists') && existing) throw condError()
    if (cond.includes('attribute_exists') && !cond.includes('attribute_not_exists') && !existing) throw condError()
    const eq = /(#\w+) = (:\w+)/.exec(cond)
    if (eq) {
      const attr = cmd.ExpressionAttributeNames[eq[1]]
      if (!existing || existing[attr] !== cmd.ExpressionAttributeValues[eq[2]]) throw condError()
    }
  }

  function applyUpdate(cmd, base) {
    const item = base ? clone(base) : { ...cmd.Key }
    const expr = cmd.UpdateExpression
    const setMatch = /SET (.*?)(?: REMOVE |$)/.exec(expr)
    if (setMatch) {
      for (const part of setMatch[1].split(', ')) {
        const [n, v] = part.split(' = ')
        item[(cmd.ExpressionAttributeNames?.[n] ?? n)] = clone(cmd.ExpressionAttributeValues[v])
      }
    }
    const rmMatch = /REMOVE (.*)$/.exec(expr)
    if (rmMatch) {
      for (const n of rmMatch[1].split(', ')) delete item[(cmd.ExpressionAttributeNames?.[n] ?? n)]
    }
    return item
  }

  function doUpdate(cmd) {
    const k = keyOf(cmd.TableName, cmd.Key)
    const existing = db[cmd.TableName].get(k)
    checkCondition(cmd, existing)
    db[cmd.TableName].set(k, applyUpdate(cmd, existing))
  }

  const original = ddb.send.bind(ddb)
  ddb.send = async (command) => {
    const cmd = command.input
    const type = command.constructor.name
    switch (type) {
      case 'GetCommand':
        return { Item: clone(db[cmd.TableName].get(keyOf(cmd.TableName, cmd.Key))) }
      case 'PutCommand': {
        const k = keyOf(cmd.TableName, cmd.Item)
        checkCondition(cmd, db[cmd.TableName].get(k))
        db[cmd.TableName].set(k, clone(cmd.Item))
        return {}
      }
      case 'DeleteCommand':
        db[cmd.TableName].delete(keyOf(cmd.TableName, cmd.Key))
        return {}
      case 'UpdateCommand':
        doUpdate(cmd)
        return {}
      case 'ScanCommand':
        return { Items: [...db[cmd.TableName].values()].map(clone) }
      case 'QueryCommand': {
        const [attrName] = /^(\w+) = /.exec(cmd.KeyConditionExpression)
          ? [/^(\w+) = /.exec(cmd.KeyConditionExpression)[1]]
          : [null]
        const value = Object.values(cmd.ExpressionAttributeValues)[0]
        let items = [...db[cmd.TableName].values()].filter((i) => i[attrName] === value)
        const sortKey = KEYS[cmd.TableName][1]
        if (sortKey) {
          items.sort((a, b) => String(a[sortKey]).localeCompare(String(b[sortKey])))
          if (cmd.ScanIndexForward === false) items.reverse()
        }
        return { Items: items.map(clone) }
      }
      case 'TransactWriteCommand': {
        const snapshot = Object.fromEntries(Object.entries(db).map(([t, m]) => [t, new Map(m)]))
        try {
          for (const op of cmd.TransactItems) {
            if (op.Update) doUpdate(op.Update)
            else if (op.Put) await ddb.send({ constructor: { name: 'PutCommand' }, input: op.Put })
          }
        } catch (err) {
          for (const t of Object.keys(db)) db[t] = snapshot[t]
          throw condError('TransactionCanceledException')
        }
        return {}
      }
      case 'BatchWriteCommand':
        for (const [table, reqs] of Object.entries(cmd.RequestItems)) {
          for (const r of reqs) {
            if (r.DeleteRequest) db[table].delete(keyOf(table, r.DeleteRequest.Key))
            if (r.PutRequest) db[table].set(keyOf(table, r.PutRequest.Item), clone(r.PutRequest.Item))
          }
        }
        return {}
      default:
        throw new Error(`FakeDynamo: comando no soportado ${type}`)
    }
  }

  return { db, restore: () => { ddb.send = original }, list: (t) => [...db[t].values()] }
}

/** Construye un evento estilo API Gateway REST (proxy). */
export function apiEvent(method, path, { body, token, query } = {}) {
  return {
    httpMethod: method,
    path,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    queryStringParameters: query || null,
    body: body === undefined ? null : JSON.stringify(body),
  }
}
