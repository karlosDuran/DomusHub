import { SNSClient, PublishCommand } from '@aws-sdk/client-sns'

export const sns = new SNSClient({})

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
      // SNS exige Subject en una sola línea, ASCII imprimible y <= 100 caracteres.
      Subject: String(subject).replace(/[\r\n]+/g, ' ').slice(0, 100),
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
