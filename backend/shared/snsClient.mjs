import {
  SNSClient,
  PublishCommand,
  SubscribeCommand,
  UnsubscribeCommand,
  ListSubscriptionsByTopicCommand,
  SetSubscriptionAttributesCommand,
} from '@aws-sdk/client-sns'

export const sns = new SNSClient({})

/**
 * SNS exige que el Subject sea una sola línea, ASCII imprimible y < 100 caracteres:
 * se quitan acentos/emojis para que nunca falle el envío por un título con "ñ" o "á".
 */
export function toSnsSubject(subject) {
  return String(subject)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 99)
}

/**
 * Publica una notificación en un tópico SNS.
 *
 * Cuando se indica `destinatario` se envía como MessageAttribute para que las
 * Filter Policies de `homeops-avisos-tareas` entreguen el correo solo al responsable.
 *
 * Nunca lanza: un fallo de SNS no debe tumbar la operación principal de la API.
 * @returns {Promise<boolean>} true si el mensaje fue publicado.
 */
export async function publishNotification({ topicArn, subject, message, destinatario }) {
  if (!topicArn) {
    console.warn('SNS: topicArn no configurado, notificación omitida:', subject)
    return false
  }

  try {
    await sns.send(new PublishCommand({
      TopicArn: topicArn,
      Subject: toSnsSubject(subject),
      Message: message,
      ...(destinatario
        ? {
            MessageAttributes: {
              destinatario: { DataType: 'String', StringValue: String(destinatario) },
            },
          }
        : {}),
    }))
    return true
  } catch (err) {
    console.error('SNS: error al publicar notificación', err)
    return false
  }
}

// ── Gestión automática de suscripciones por perfil ──────────────────────────

const normEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '')

export const isConfirmedArn = (arn) => typeof arn === 'string' && arn.startsWith('arn:aws:sns:')

export async function listTopicSubscriptions(topicArn) {
  if (!topicArn) return []
  const subs = []
  let NextToken
  do {
    const res = await sns.send(new ListSubscriptionsByTopicCommand({ TopicArn: topicArn, NextToken }))
    if (res?.Subscriptions) subs.push(...res.Subscriptions)
    NextToken = res?.NextToken
  } while (NextToken)
  return subs
}

function findEmailSub(subs, email) {
  const target = normEmail(email)
  return subs.find((s) => s.Protocol === 'email' && normEmail(s.Endpoint) === target)
}

function buildTareasFilterPolicy(destinatarios) {
  return JSON.stringify({ destinatario: [...new Set([...destinatarios.map(String), 'familia'])] })
}

async function upsertTopicSubscription({ topicArn, email, destinatarios }) {
  if (!topicArn || !email) return 'no_configurado'
  const subs = await listTopicSubscriptions(topicArn)
  const existing = findEmailSub(subs, email)
  const filterPolicy = destinatarios ? buildTareasFilterPolicy(destinatarios) : null

  if (existing && isConfirmedArn(existing.SubscriptionArn)) {
    if (filterPolicy) {
      await sns.send(new SetSubscriptionAttributesCommand({
        SubscriptionArn: existing.SubscriptionArn,
        AttributeName: 'FilterPolicyScope',
        AttributeValue: 'MessageAttributes',
      }))
      await sns.send(new SetSubscriptionAttributesCommand({
        SubscriptionArn: existing.SubscriptionArn,
        AttributeName: 'FilterPolicy',
        AttributeValue: filterPolicy,
      }))
    }
    return 'confirmado'
  }

  // Sin ReturnSubscriptionArn, AWS devuelve "pending confirmation" mientras el usuario no confirma.
  const res = await sns.send(new SubscribeCommand({
    TopicArn: topicArn,
    Protocol: 'email',
    Endpoint: email,
    ...(filterPolicy
      ? { Attributes: { FilterPolicy: filterPolicy, FilterPolicyScope: 'MessageAttributes' } }
      : {}),
  }))
  return isConfirmedArn(res?.SubscriptionArn) ? 'confirmado' : 'pendiente'
}

async function cleanupOldEmailOnTopic({ topicArn, email, remainingIds, isTareas }) {
  if (!topicArn || !email) return
  const subs = await listTopicSubscriptions(topicArn)
  const existing = findEmailSub(subs, email)
  if (!existing || !isConfirmedArn(existing.SubscriptionArn)) return

  if (remainingIds.length > 0) {
    if (isTareas) {
      await sns.send(new SetSubscriptionAttributesCommand({
        SubscriptionArn: existing.SubscriptionArn,
        AttributeName: 'FilterPolicy',
        AttributeValue: buildTareasFilterPolicy(remainingIds),
      }))
    }
    return
  }

  await sns.send(new UnsubscribeCommand({ SubscriptionArn: existing.SubscriptionArn }))
}

function summarizeEstado(estados) {
  const activos = estados.filter((e) => e && e !== 'no_configurado')
  if (activos.length === 0) return 'no_configurado'
  if (activos.every((e) => e === 'confirmado')) return 'confirmado'
  if (activos.some((e) => e === 'pendiente' || e === 'confirmado')) return 'pendiente'
  return 'no_suscrito'
}

/**
 * Sincroniza las suscripciones SNS (tareas filtradas por user.id + despensa) al crear,
 * editar o eliminar el correo de un perfil familiar.
 * Nunca lanza: si SNS falla se registra en logs sin romper el guardado en DynamoDB.
 */
export async function syncUserSnsSubscriptions({ emailAnterior, emailNuevo, allUsuarios = [] }) {
  const tareasArn = process.env.SNS_TAREAS_TOPIC_ARN
  const despensaArn = process.env.SNS_DESPENSA_TOPIC_ARN
  const oldNorm = normEmail(emailAnterior)
  const newNorm = normEmail(emailNuevo)

  if (!tareasArn && !despensaArn) {
    return { estado: newNorm ? 'no_configurado' : 'sin_correo', tareas: 'no_configurado', despensa: 'no_configurado' }
  }

  const idsConEmail = (target) => allUsuarios
    .filter((u) => normEmail(u.email) === target)
    .map((u) => u.id)

  try {
    if (oldNorm && oldNorm !== newNorm) {
      const remaining = idsConEmail(oldNorm)
      await Promise.all([
        cleanupOldEmailOnTopic({ topicArn: tareasArn, email: oldNorm, remainingIds: remaining, isTareas: true }),
        cleanupOldEmailOnTopic({ topicArn: despensaArn, email: oldNorm, remainingIds: remaining, isTareas: false }),
      ])
    }

    if (!newNorm) {
      return { estado: 'sin_correo', tareas: 'sin_correo', despensa: 'sin_correo' }
    }

    const ids = idsConEmail(newNorm)
    const [tareas, despensa] = await Promise.all([
      upsertTopicSubscription({ topicArn: tareasArn, email: newNorm, destinatarios: ids }),
      upsertTopicSubscription({ topicArn: despensaArn, email: newNorm, destinatarios: null }),
    ])

    return { estado: summarizeEstado([tareas, despensa]), tareas, despensa }
  } catch (err) {
    console.error('SNS: error al sincronizar suscripción del perfil', err)
    return { estado: newNorm ? 'error' : 'sin_correo', tareas: 'error', despensa: 'error' }
  }
}

/**
 * Consulta el estado actual de suscripción SNS por correo para todos los tópicos configurados.
 * @returns {Promise<Map<string, string>|null>} Mapa email(lowercase) -> estado, o null si SNS no está configurado.
 */
export async function getSnsStatusMap() {
  const tareasArn = process.env.SNS_TAREAS_TOPIC_ARN
  const despensaArn = process.env.SNS_DESPENSA_TOPIC_ARN
  if (!tareasArn && !despensaArn) return null

  try {
    const [tareasSubs, despensaSubs] = await Promise.all([
      listTopicSubscriptions(tareasArn),
      listTopicSubscriptions(despensaArn),
    ])

    const mapByTopic = (subs) => {
      const m = new Map()
      for (const s of subs) {
        if (s.Protocol !== 'email') continue
        const key = normEmail(s.Endpoint)
        if (!key) continue
        const estado = isConfirmedArn(s.SubscriptionArn) ? 'confirmado' : 'pendiente'
        if (m.get(key) !== 'confirmado') m.set(key, estado)
      }
      return m
    }

    const tMap = tareasArn ? mapByTopic(tareasSubs) : null
    const dMap = despensaArn ? mapByTopic(despensaSubs) : null
    const allEmails = new Set([...(tMap?.keys() || []), ...(dMap?.keys() || [])])
    const result = new Map()

    for (const email of allEmails) {
      const estados = []
      if (tMap) estados.push(tMap.get(email) || 'no_suscrito')
      if (dMap) estados.push(dMap.get(email) || 'no_suscrito')
      result.set(email, summarizeEstado(estados))
    }
    return result
  } catch (err) {
    console.error('SNS: error al consultar estado de suscripciones', err)
    return null
  }
}
