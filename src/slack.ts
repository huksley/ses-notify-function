import * as uuid from 'uuid/v4'
import { config } from './config'
import { Notification } from './mime'

export type Message = Notification & {
  uuid: string
  blocks: any
  text: string
  channel: undefined
}

export const findDestination = (message: Message) => {
  return message.channel === undefined ? config.SLACK_DEFAULT_HOOK_URL : '?'
}

export const createMessage = (
  notify: Notification,
  options?: { notice?: string },
): Promise<Message> => {
  const mail = notify.mail
  let notice = `Received: ${mail.date}`
  if (options && options.notice) {
    notice += '\n' + options.notice
  }
  notice +=
    '\n• type: ' + (notify.type || 'generic') + ', priority: ' + (notify.priority || 'generic')
  if (notify.meta) {
    Object.keys(notify.meta).forEach(key => {
      notice += `, ${key}: ${notify.meta![key]}`
    })
  }
  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*From:* ${mail.from && mail.from.text} \n*To:* ${mail.to && mail.to.text} \n${
          mail.subject
        }\n`,
      },
    },
    {
      type: 'divider',
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: mail.text,
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: notice,
        },
      ],
    },
  ]

  const text = `${mail.subject}, ${mail.from && mail.from.text}, ${mail.to &&
    mail.to.text}, ${mail.cc && mail.cc.text}, ${mail.bcc && mail.bcc.text}\n\n
    --
  ${mail.text}  
  `

  const message = {
    ...notify,
    uuid: uuid(),
    blocks,
    text,
    channel: undefined,
  }

  return Promise.resolve(message)
}
