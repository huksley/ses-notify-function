import * as uuid from 'uuid/v4'
import { config } from './config'
import { Notification } from './mime'
import { logger } from './logger'
import { urlToBucketName, urlToKeyName } from './util'
import { createS3UrlMarkup } from './notify'

interface SlackElement {
  type: 'mrkdwn' | 'plain_text' | 'image'
  text?: string
  image_url?: string
  alt_text?: string
}

interface SlackBlock {
  type: 'section' | 'divider' | 'context' | 'header'
  text?: SlackElement
  elements?: SlackElement[]
  accessory?: {
    type: 'button' | 'image'
    text?: {
      type: 'plain_text'
      text: string
    }
    value?: string
    url?: string
    action_id?: 'button-action'
    image_url?: string
    alt_text?: string
  }
}

export type Message = Notification & {
  uuid: string
  blocks?: SlackBlock[]
  text: string
}

export const findDestination = async (message: Message): Promise<string> => {
  const bucket = urlToBucketName(message.url)
  const prefix = urlToKeyName(message.url).split('/')[0]
  console.info('Finding destination for', message.url, 'bucket', bucket, 'prefix', prefix)

  for (let i = 1; i < 10; i++) {
    const hook = config[i === 1 ? 'SLACK_HOOK_URL' : 'SLACK_HOOK_URL_' + i]
    const match_bucket = config[i === 1 ? 'MAIL_BUCKET' : 'MAIL_BUCKET_' + i]
    const match_prefix = config[i === 1 ? 'MAIL_PREFIX' : 'MAIL_PREFIX_' + i]
    if (
      hook &&
      match_bucket &&
      match_prefix &&
      match_bucket === bucket &&
      match_prefix === prefix
    ) {
      logger.info('Matching hook found', hook, 'for', message.url)
      return hook
    } else {
      logger.info(
        'No match for',
        message.url,
        'bucket',
        bucket,
        'prefix',
        prefix,
        'hook',
        hook,
        'match_bucket',
        match_bucket,
        'match_prefix',
        match_prefix,
      )
    }
  }

  return config.SLACK_HOOK_URL
}

export const createMessage = (
  notify: Notification,
  options?: { plainText?: boolean },
): Promise<Message> => {
  const mail = notify.mail
  let notice = `Received: ${mail.date}`
  notice += '\nSource: ' + createS3UrlMarkup(notify.url)

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

  const dynamicBlocks: SlackBlock[] = []

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
    // Empty plain_text blocks generate invalid_text error
    mail.text.split('\n\n').filter(s => s.trim() !== "").map(s =>
      dynamicBlocks.push({
        type: 'section',
        text: {
          type: 'plain_text',
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

  const blocks: SlackBlock[] = [
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

  const message: Message = {
    ...notify,
    uuid: uuid(),
    text,
    ...(options?.plainText ? {} : { blocks }),
  }

  // console.info(JSON.stringify(blocks, null, 2))
  return Promise.resolve(message)
}
