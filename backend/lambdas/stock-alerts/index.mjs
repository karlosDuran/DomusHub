import { publishNotification } from '#shared/snsClient.mjs'

/**
 * Evalúa un registro de DynamoDB Streams de `homeops-productos` y devuelve el aviso
 * a enviar (o `null`). Solo alerta si el producto está en umbral crítico Y acaba de
 * disminuir, cruzó el mínimo o es nuevo (anti-spam).
 */
export function construirAlerta(record) {
  if (record.eventName !== 'MODIFY' && record.eventName !== 'INSERT') return null

  const newImg = record.dynamodb?.NewImage
  const oldImg = record.dynamodb?.OldImage
  if (!newImg) return null

  const nombre = newImg.nombre?.S || 'Producto'
  const categoria = newImg.categoria?.S || 'Despensa'
  const unidad = newImg.unidad_medida?.S || 'unidad(es)'
  const nuevaCant = Number(newImg.cantidad_actual?.N ?? 0)
  const minimo = Number(newImg.cantidad_minima?.N ?? 0)

  const cantAnterior = oldImg ? Number(oldImg.cantidad_actual?.N ?? Infinity) : Infinity
  const minimoAnterior = oldImg ? Number(oldImg.cantidad_minima?.N ?? 0) : 0

  const estaCritico = nuevaCant <= minimo
  const bajoCantidad = nuevaCant < cantAnterior
  const cruzoUmbral = cantAnterior > minimoAnterior && estaCritico

  if (!(estaCritico && (bajoCantidad || cruzoUmbral || record.eventName === 'INSERT'))) return null

  const textoCantidad = nuevaCant === 0
    ? `¡Se agotó ${nombre}! (0 ${unidad})`
    : `Atención: Queda solo ${nuevaCant} ${unidad} de ${nombre}`

  return {
    nombre,
    subject: `[HomeOps Alerta Super] Stock bajo: ${nombre}`,
    message: [
      textoCantidad,
      `Categoría: ${categoria}`,
      `Umbral mínimo configurado: ${minimo} ${unidad}`,
      '',
      'Revisa el Modo Supermercado en HomeOps para agregarlo a la próxima compra.',
    ].join('\n'),
    nuevaCant,
    minimo,
  }
}

/** Disparada por DynamoDB Streams (`NEW_AND_OLD_IMAGES`) → publica en SNS `homeops-alertas-despensa`. */
export const handler = async (event) => {
  for (const record of event.Records || []) {
    const alerta = construirAlerta(record)
    if (!alerta) continue

    const enviado = await publishNotification({
      topicArn: process.env.SNS_DESPENSA_TOPIC_ARN,
      subject: alerta.subject,
      message: alerta.message,
    })
    if (enviado) {
      console.log(`Alerta SNS enviada para ${alerta.nombre} (actual=${alerta.nuevaCant}, min=${alerta.minimo})`)
    }
  }
  return { statusCode: 200 }
}
