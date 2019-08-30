import * as uuid from 'uuid/v4'
import { config, getCustomConfig } from './config'
import { Notification } from './mime'
import { logger } from './logger'

export type Message = Notification & {
  uuid: string
  blocks: any
  text: string
  channel?: string
}

export const findDestination = (message: Message): Promise<string> => {
  if (message.channel === undefined) {
    return Promise.resolve(config.SLACK_DEFAULT_HOOK_URL)
  } else {
    return getCustomConfig().then(config => {
      if (config && config.channels && config.channels[message.channel!]) {
        return config.channels[message.channel!] as string
      } else {
        logger.warn('No hook url for channel ' + message.channel + ', using default')
        return Promise.resolve(config.SLACK_DEFAULT_HOOK_URL)
      }
    })
  }
}

export const findChannel = (message: Message) => {
  if (message.from.indexOf('uptimerobot.com') >= 0) {
    return 'uptime'
  } else if (message.priority === 'direct') {
    return 'direct'
  }
  return undefined
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
  } as Message

  message.channel = findChannel(message)

  return Promise.resolve(message)
}
