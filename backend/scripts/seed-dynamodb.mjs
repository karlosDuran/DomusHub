// Seed idempotente de HomeOps en DynamoDB con 4 personas y datos de prueba completos.
// Nunca sobrescribe registros existentes.
//
//   AWS_PROFILE=homeops AWS_REGION=us-east-1 SEED_ADMIN_EMAIL="tu-correo@ejemplo.com" npm run seed
//
// Variables opcionales: TABLE_USUARIOS, TABLE_PRODUCTOS, TABLE_COLUMNAS, TABLE_TAREAS, TABLE_HISTORIAL.
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import { hashSecret } from '../shared/password.mjs'
import { calcularPorcentajeVisual } from '../lambdas/inventario/index.mjs'
import { fechaLocalISO } from '../shared/tareas.mjs'

const region = process.env.AWS_REGION || 'us-east-1'
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
  marshallOptions: { removeUndefinedValues: true },
})

const T = {
  usuarios: process.env.TABLE_USUARIOS || 'homeops-usuarios',
  productos: process.env.TABLE_PRODUCTOS || 'homeops-productos',
  columnas: process.env.TABLE_COLUMNAS || 'homeops-kanban-columnas',
  tareas: process.env.TABLE_TAREAS || 'homeops-tareas',
  historial: process.env.TABLE_HISTORIAL || 'homeops-tareas-historial',
}

const ahora = new Date().toISOString()
const hoy = fechaLocalISO()

/** Inserta solo si el id no existe. @returns {Promise<boolean>} true si lo creó. */
async function putIfAbsent(table, item, etiqueta, keyExpr = 'attribute_not_exists(id)') {
  try {
    await ddb.send(new PutCommand({
      TableName: table,
      Item: item,
      ConditionExpression: keyExpr,
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

const producto = (id, nombre, categoria, actual, unidad, minimo, precio, actualizadoPor = 'usr_admin') => ({
  id,
  nombre,
  categoria,
  cantidad_actual: actual,
  unidad_medida: unidad,
  cantidad_minima: minimo,
  porcentaje_visual: calcularPorcentajeVisual(actual, minimo),
  precio_promedio: precio,
  actualizado_por: actualizadoPor,
  fecha_creacion: ahora,
})

export const SEED_DATA = {
  columnas: [
    { id: 'col_1', nombre: 'Por hacer', posicion: 1 },
    { id: 'col_2', nombre: 'En progreso', posicion: 2 },
    { id: 'col_3', nombre: 'Completado', posicion: 3 },
  ],
  usuarios: [
    {
      id: 'usr_admin',
      nombre: 'Fernando',
      email: process.env.SEED_ADMIN_EMAIL || 'fernando@familia.mx',
      rol: 'admin',
      password_hash: hashSecret('admin123'),
      pin_hash: hashSecret('1234'),
      avatar_color: '#2a9d8f',
      fecha_creacion: ahora,
    },
    {
      id: 'usr_elena',
      nombre: 'Elena',
      email: 'elena@familia.mx',
      rol: 'admin',
      password_hash: hashSecret('elena123'),
      pin_hash: hashSecret('2345'),
      avatar_color: '#e76f51',
      fecha_creacion: ahora,
    },
    {
      id: 'usr_sofia',
      nombre: 'Sofía',
      email: 'sofia@familia.mx',
      rol: 'miembro',
      password_hash: hashSecret('sofia123'),
      pin_hash: hashSecret('3456'),
      avatar_color: '#f4a261',
      fecha_creacion: ahora,
    },
    {
      id: 'usr_mateo',
      nombre: 'Mateo',
      email: 'mateo@familia.mx',
      rol: 'miembro',
      password_hash: hashSecret('mateo123'),
      pin_hash: hashSecret('4567'),
      avatar_color: '#457b9d',
      fecha_creacion: ahora,
    },
  ],
  productos: [
    producto('prod_leche', 'Leche Entera', 'Lácteos', 1, 'L', 2, 28.5, 'usr_elena'),
    producto('prod_cafe', 'Café de Grano', 'Despensa', 1, 'kg', 1, 240, 'usr_admin'),
    producto('prod_pollo', 'Pechuga de Pollo', 'Carnes y Fríos', 1, 'kg', 2, 145, 'usr_elena'),
    producto('prod_papel', 'Papel Higiénico', 'Limpieza', 8, 'rollo', 4, 6.5, 'usr_sofia'),
    producto('prod_arroz', 'Arroz Super Extra', 'Despensa', 5, 'kg', 1, 32, 'usr_admin'),
    producto('prod_aguacate', 'Aguacate Hass', 'Frutas y Verduras', 4, 'kg', 1, 68, 'usr_mateo'),
    producto('prod_detergente', 'Detergente Líquido', 'Limpieza', 3, 'L', 1, 115, 'usr_sofia'),
    producto('prod_shampoo', 'Shampoo Familiar', 'Higiene', 2, 'L', 1, 89, 'usr_mateo'),
  ],
  tareas: [
    {
      id: 'task_basura',
      titulo: 'Sacar la basura orgánica e inorgánica',
      descripcion: 'Turno semanal de recolección de basura antes de las 8:00 AM',
      columna_id: 'col_1',
      asignado_a_user_id: 'usr_admin',
      prioridad: 'urgente',
      es_recurrente: 1,
      es_turno_basura: 1,
      fecha_vencimiento: hoy,
      ultima_alerta_fecha: null,
      fecha_creacion: ahora,
    },
    {
      id: 'task_menu',
      titulo: 'Preparar menú semanal y lista del súper',
      descripcion: 'Revisar insumos críticos en Modo Súper y planear comidas',
      columna_id: 'col_1',
      asignado_a_user_id: 'usr_elena',
      prioridad: 'alta',
      es_recurrente: 1,
      es_turno_basura: 0,
      fecha_vencimiento: hoy,
      ultima_alerta_fecha: null,
      fecha_creacion: ahora,
    },
    {
      id: 'task_reciclaje',
      titulo: 'Separar reciclaje y lavar contenedores',
      descripcion: 'Separar cartón, vidrio y plástico en los botes del patio',
      columna_id: 'col_1',
      asignado_a_user_id: 'usr_mateo',
      prioridad: 'urgente',
      es_recurrente: 1,
      es_turno_basura: 1,
      fecha_vencimiento: null,
      ultima_alerta_fecha: null,
      fecha_creacion: ahora,
    },
    {
      id: 'task_jardin',
      titulo: 'Podar jardín y regar plantas de la terraza',
      descripcion: 'Regar macetas y recoger hojas secas del patio trasero',
      columna_id: 'col_2',
      asignado_a_user_id: 'usr_sofia',
      prioridad: 'media',
      es_recurrente: 1,
      es_turno_basura: 0,
      fecha_vencimiento: null,
      ultima_alerta_fecha: null,
      fecha_creacion: ahora,
    },
    {
      id: 'task_alacena',
      titulo: 'Organizar frascos y limpiar alacena',
      descripcion: 'Verificar fechas de caducidad de especias y cereales',
      columna_id: 'col_2',
      asignado_a_user_id: 'usr_elena',
      prioridad: 'media',
      es_recurrente: 0,
      es_turno_basura: 0,
      fecha_vencimiento: null,
      ultima_alerta_fecha: null,
      fecha_creacion: ahora,
    },
    {
      id: 'task_recibos',
      titulo: 'Pagar recibos de luz e internet',
      descripcion: 'Verificar cargo mensual domiciliado y archivar comprobantes',
      columna_id: 'col_3',
      asignado_a_user_id: 'usr_admin',
      prioridad: 'alta',
      es_recurrente: 0,
      es_turno_basura: 0,
      fecha_vencimiento: hoy,
      ultima_alerta_fecha: null,
      fecha_creacion: ahora,
    },
  ],
  historial: [
    {
      tarea_id: 'task_basura',
      fecha_registro: `${ahora}#001seed`,
      id: 'hist_seed_01',
      user_id: 'usr_admin',
      usuario_nombre: 'Fernando',
      accion: 'Tarea creada',
    },
    {
      tarea_id: 'task_menu',
      fecha_registro: `${ahora}#002seed`,
      id: 'hist_seed_02',
      user_id: 'usr_elena',
      usuario_nombre: 'Elena',
      accion: 'Tarea creada',
    },
    {
      tarea_id: 'task_reciclaje',
      fecha_registro: `${ahora}#003seed`,
      id: 'hist_seed_03',
      user_id: 'usr_admin',
      usuario_nombre: 'Fernando',
      accion: 'Tarea creada y asignada a Mateo',
    },
    {
      tarea_id: 'task_jardin',
      fecha_registro: `${ahora}#004seed`,
      id: 'hist_seed_04',
      user_id: 'usr_sofia',
      usuario_nombre: 'Sofía',
      accion: 'Movido de "Por hacer" a "En progreso"',
    },
    {
      tarea_id: 'task_alacena',
      fecha_registro: `${ahora}#005seed`,
      id: 'hist_seed_05',
      user_id: 'usr_elena',
      usuario_nombre: 'Elena',
      accion: 'Movido de "Por hacer" a "En progreso"',
    },
    {
      tarea_id: 'task_recibos',
      fecha_registro: `${ahora}#006seed`,
      id: 'hist_seed_06',
      user_id: 'usr_admin',
      usuario_nombre: 'Fernando',
      accion: 'Movido de "En progreso" a "Completado"',
    },
  ],
}

async function main() {
  console.log(`Sembrando datos iniciales de HomeOps (región ${region})...`)

  console.log('Columnas Kanban:')
  for (const col of SEED_DATA.columnas) {
    await putIfAbsent(T.columnas, col, `columna "${col.nombre}"`)
  }

  console.log('Integrantes familiares (4 personas):')
  for (const u of SEED_DATA.usuarios) {
    await putIfAbsent(T.usuarios, u, `integrante "${u.nombre}" (${u.rol})`)
  }

  console.log('Productos de ejemplo (8 insumos):')
  for (const p of SEED_DATA.productos) {
    await putIfAbsent(T.productos, p, `producto "${p.nombre}"`)
  }

  console.log('Tareas de ejemplo (6 tareas):')
  for (const t of SEED_DATA.tareas) {
    await putIfAbsent(T.tareas, t, `tarea "${t.titulo}"`)
  }

  console.log('Historial inicial de tareas:')
  for (const h of SEED_DATA.historial) {
    await putIfAbsent(
      T.historial,
      h,
      `historial "${h.accion}" (${h.tarea_id})`,
      'attribute_not_exists(tarea_id) AND attribute_not_exists(fecha_registro)',
    )
  }

  console.log('\n✅ Seed completado con 4 personas, 8 productos y 6 tareas.')
  console.log('⚠️  Cambia las contraseñas y PINs de prueba después del primer acceso en producción.')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('❌ Error en el seed:', err)
    process.exit(1)
  })
}
