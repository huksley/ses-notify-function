import { simpleParser, ParsedMail } from 'mailparser'

export type NotificationType = 'github' | 'linkedin' | undefined

export interface Notification {
  from: string
  to: string
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

export const toGithubNotification = (mail: ParsedMail): Notification => ({
  type: 'github',
  from: mail.from.value[0].address,
  to: mail.cc ? mail.cc!.value[0].address : mail.to.value[0].address,
  priority:
    mail.headers.get('x-github-verify') || mail.headers.get('x-github-reason') === 'manual'
      ? 'direct'
      : 'project',
  mail,
  meta: {
    reason: mail.headers.get('x-github-reason'),
  },
})

export const toLinkedInNotification = (mail: ParsedMail): Notification => ({
  type: 'linkedin',
  from: mail.from.value[0].address,
  to: mail.to.value[0].address,
  priority:
    mail.headers.get('x-linkedin-template') === 'email_type_messaging_digest'
      ? 'direct'
      : undefined,
  mail,
})

export const toGenericNotification = (mail: ParsedMail): Notification => ({
  type: undefined,
  from: mail.from.value[0].address,
  to: mail.to.value[0].address,
  priority: undefined,
  mail,
})

export const toNotification = (mail: ParsedMail): Notification => {
  switch (notificationType(mail)) {
    case 'github':
      return toGithubNotification(mail)
    case 'linkedin':
      return toLinkedInNotification(mail)
    default:
      return toGenericNotification(mail)
  }
}

export const parseMail = (body: Buffer): Promise<Notification> =>
  simpleParser(body, {}).then(toNotification)
