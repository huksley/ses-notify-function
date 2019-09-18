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
    return getCustomConfig().then(props => {
      if (config && props.channels && props.channels[message.channel!]) {
        return props.channels[message.channel!] as string
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

  let attachments = ''
  if (notify.mail.attachments && notify.mail.attachments.length > 0) {
    notify.mail.attachments.forEach(a => {
      attachments += '\\n\n📎 ' + a.filename
    })
  }

  interface SlackBlock {
    type: 'section'
    text: {
      type: 'mrkdwn'
      text: string
    }
  }

  const dynamicBlocks = [] as SlackBlock[]

  if (!mail.text) {
    dynamicBlocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'No text found',
      },
    })
  } else {
    // Split because of 3000 character limit for slack block content
    mail.text.split('\n\n').map(s =>
      dynamicBlocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: s,
        },
      }),
    )
  }

  if (attachments !== '') {
    dynamicBlocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: attachments,
      },
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
    ...dynamicBlocks,
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

  // console.info(JSON.stringify(blocks, null, 2))
  message.channel = findChannel(message)
  return Promise.resolve(message)
}
