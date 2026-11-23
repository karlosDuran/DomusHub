// Seed idempotente de HomeOps en DynamoDB. Nunca sobrescribe registros existentes.
//
//   AWS_PROFILE=homeops AWS_REGION=us-east-1 SEED_ADMIN_EMAIL="tu-correo@ejemplo.com" npm run seed
//
// Variables opcionales: TABLE_USUARIOS, TABLE_PRODUCTOS, TABLE_COLUMNAS, TABLE_TAREAS.
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import { hashSecret } from '../shared/password.mjs'
import { calcularPorcentajeVisual } from '../lambdas/inventario/index.mjs'

const region = process.env.AWS_REGION || 'us-east-1'
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
  marshallOptions: { removeUndefinedValues: true },
})

const T = {
  usuarios: process.env.TABLE_USUARIOS || 'homeops-usuarios',
  productos: process.env.TABLE_PRODUCTOS || 'homeops-productos',
  columnas: process.env.TABLE_COLUMNAS || 'homeops-kanban-columnas',
  tareas: process.env.TABLE_TAREAS || 'homeops-tareas',
}

const ahora = new Date().toISOString()

/** Inserta solo si el id no existe. @returns {Promise<boolean>} true si lo creó. */
async function putIfAbsent(table, item, etiqueta) {
  try {
    await ddb.send(new PutCommand({
      TableName: table,
      Item: item,
      ConditionExpression: 'attribute_not_exists(id)',
    }))
    console.log(`  + ${etiqueta} creado`)
    return true
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      console.log(`  = ${etiqueta} ya existía (omitido)`)
      return false
    }
    throw err
  }
}

const producto = (id, nombre, categoria, actual, unidad, minimo, precio) => ({
  id,
  nombre,
  categoria,
  cantidad_actual: actual,
  unidad_medida: unidad,
  cantidad_minima: minimo,
  porcentaje_visual: calcularPorcentajeVisual(actual, minimo),
  precio_promedio: precio,
  actualizado_por: 'usr_admin',
  fecha_creacion: ahora,
})

async function main() {
  console.log(`Sembrando datos iniciales de HomeOps (región ${region})...`)

  console.log('Columnas Kanban:')
  for (const [id, nombre, posicion] of [
    ['col_1', 'Por hacer', 1],
    ['col_2', 'En progreso', 2],
    ['col_3', 'Completado', 3],
  ]) {
    await putIfAbsent(T.columnas, { id, nombre, posicion }, `columna "${nombre}"`)
  }

  console.log('Usuario administrador:')
  await putIfAbsent(T.usuarios, {
    id: 'usr_admin',
    nombre: 'admin',
    email: process.env.SEED_ADMIN_EMAIL || '',
    rol: 'admin',
    password_hash: hashSecret('admin123'),
    pin_hash: hashSecret('1234'),
    avatar_color: '#2a9d8f',
    fecha_creacion: ahora,
  }, 'usuario "admin" (contraseña temporal admin123, PIN 1234)')

  console.log('Productos de ejemplo:')
  for (const p of [
    producto('prod_leche', 'Leche Entera', 'Lácteos', 3, 'L', 1, 28),
    producto('prod_papel', 'Papel Higiénico', 'Limpieza', 8, 'rollo', 4, 6.5),
    producto('prod_arroz', 'Arroz', 'Despensa', 5, 'kg', 1, 32),
  ]) {
    await putIfAbsent(T.productos, p, `producto "${p.nombre}"`)
  }

  console.log('Tareas de ejemplo:')
  await putIfAbsent(T.tareas, {
    id: 'task_basura',
    titulo: 'Sacar la basura',
    descripcion: 'Turno semanal de recolección de basura',
    columna_id: 'col_1',
    asignado_a_user_id: 'usr_admin',
    prioridad: 'urgente',
    es_recurrente: 1,
    es_turno_basura: 1,
    fecha_vencimiento: null,
    ultima_alerta_fecha: null,
    fecha_creacion: ahora,
  }, 'tarea "Sacar la basura"')

  console.log('\n✅ Seed completado.')
  console.log('⚠️  Cambia la contraseña y el PIN del usuario admin después del primer acceso.')
}

main().catch((err) => {
  console.error('❌ Error en el seed:', err)
  process.exit(1)
})
