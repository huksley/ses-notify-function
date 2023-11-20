import { simpleParser, ParsedMail } from 'mailparser'
import { logger } from './logger';

export type NotificationType = 'github' | 'linkedin' | undefined

export interface Notification {
  /** Bucket url */
  url: string;
  from?: string
  to?: string
  type: NotificationType
  priority: 'direct' | 'project' | undefined
  mail: ParsedMail
  meta?: {
    [key: string]: any
  }
}

export const notificationType = (mail: ParsedMail): NotificationType => {
  if (mail.headers.get('x-github-reason') || mail.headers.get('x-github-verify')) {
    return 'github'
  }
  if (mail.headers.get('x-linkedin-class')) {
    return 'linkedin'
  }
  return undefined
}

export const toGithubNotification = (url: string, mail: ParsedMail): Notification => ({
  url,
  type: 'github',
  from: mail.from?.value[0].address,
  to: mail.cc ? mail.cc?.value[0].address : mail.to?.value[0].address,
  priority:
    mail.headers.get('x-github-verify') || mail.headers.get('x-github-reason') === 'manual'
      ? 'direct'
      : 'project',
  mail,
  meta: {
    reason: mail.headers.get('x-github-reason'),
    messageId: mail.headers.get('message-id'),
    subject: mail.subject,
  },
})

export const toLinkedInNotification = (url: string, mail: ParsedMail): Notification => ({
  url, 
  type: 'linkedin',
  from: mail.from?.value[0].address,
  to: mail.to?.value[0].address,
  priority:
    mail.headers.get('x-linkedin-template') === 'email_type_messaging_digest'
      ? 'direct'
      : undefined,
  mail,
  meta: {
    template: mail.headers.get('x-linkedin-template'),
    messageId: mail.headers.get('message-id'),
    subject: mail.subject,
  },
})

export const toGenericNotification = (url: string, mail: ParsedMail): Notification => ({
  url,
  type: undefined,
  from: mail.from?.value[0].address,
  to: mail.to?.value[0].address,
  priority: undefined,
  mail,
  meta: {
    messageId: mail.headers.get('message-id'),
    subject: mail.subject,
  },
})

export const toNotification = (url: string) => (mail: ParsedMail): Notification => {
  const type = notificationType(mail)
  logger.info("toNotification", url, "type", type)
  switch (type) {
    case 'github':
      return toGithubNotification(url, mail)
    case 'linkedin':
      return toLinkedInNotification(url, mail)
    default:
      return toGenericNotification(url, mail)
  }
}

export const parseMail = (url: string, body: Buffer): Promise<Notification> =>
  simpleParser(body, {}).then(toNotification(url))
