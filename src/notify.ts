import { apiResponse, findPayload, urlToBucketName, urlToKeyName, toThrow } from './util'
import { Context as LambdaContext, APIGatewayEvent, Callback as LambdaCallback } from 'aws-lambda'
import { logger } from './logger'
import fetch from 'node-fetch'
import { config } from './config'
import { S3, SES } from 'aws-sdk'
import * as aws from 'aws-sdk'
import { createTransport } from 'nodemailer'
import { Response } from 'node-fetch'

import { createMessage, findDestination } from './slack'
import { parseMail, Notification } from './mime'

const s3 = new S3({
  signatureVersion: 'v4',
  region: config.AWS_REGION,
})

/**
 * https://api.slack.com/messaging/composing/formatting#linking-urls
 */
export const createS3UrlMarkup = (url: string) => {
  return (
    '<https://s3.console.aws.amazon.com/s3/object/' +
    urlToBucketName(url) +
    '/' +
    urlToKeyName(url) +
    '|' +
    url +
    '>'
  )
}

const ses = new SES({
  apiVersion: '2010-12-01',
  region: 'eu-west-1',
})

const send = createTransport({
  SES: { ses, aws },
  sendingRate: 1,
})

export const processNotify = async (notify: Notification) => {
  if (config.SEND_REPLY === '1') {
    const mail = {
      from: notify.to,
      to: notify.from,
      subject: notify.meta?.subject?.startsWith('Re:')
        ? notify.meta?.subject
        : 'Re: ' + (notify.meta?.subject || ''),
      html:
        "<div><p>Hi, I've received your message. Thank you!</p><p>On " +
        notify.mail.date?.toISOString() +
        ' you wrote:\r\n' +
        notify.mail.html +
        '</p></div>',
      headers: {
        ...(typeof notify.meta?.messageId == 'string'
          ? { 'In-Reply-To': notify.meta?.messageId }
          : {}),
      },
    }

    if (config.SEND_REPLY_EXCLUDE && notify.from !== config.SEND_REPLY_EXCLUDE) {
      logger.info('Sending reply email from', mail.from, 'to', mail.to, 'subject', mail.subject)
      await send.sendMail(mail)
    }
  }

  return createMessage(notify).then(message => {
    return findDestination(message).then(slackUrl => {
      logger.info('Sending message ' + message.url + ', UUID = ' + message.uuid + ' to ' + slackUrl)

      let plainTextSent = false

      const handleSlackResponse = async (response: Response) => {
        if (response.status === 204) {
          logger.info('Message sent ' + message.uuid + ': 204 OK')
          return true
        } else if (response.status === 200) {
          return response.text().then(text => {
            logger.info('Message sent (' + message.uuid + '): ' + text)
            return true
          })
        } else {
          return response.text().then(text => {
            const code = text
            if (!plainTextSent && code === 'invalid_blocks') {
              // Resend with plain text
              plainTextSent = true
              logger.info('Resending message ' + message.uuid + ' as plain text, got invalid_blocks', JSON.stringify(message.blocks))
              return fetch(slackUrl, {
                method: 'post',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  text: message.text,
                }),
              }).then(handleSlackResponse)
            } else {
              logger.info(
                'Message sending failed (' + message.uuid + '): ' + response.status + ', ' + text,
              )
              return false
            }
          })
        }
      }

      return fetch(slackUrl, {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blocks: message.blocks,
          text: message.text,
        }),
      })
        .then(handleSlackResponse)
        .catch(err => {
          logger.warn('Failed to send message (' + message.uuid + '): ' + err.message, err)
          return false
        })
    })
  })
}

export const processMailObject = (url: string) => {
  logger.info('Processing ' + url)
  return s3
    .getObject({ Bucket: urlToBucketName(url), Key: urlToKeyName(url) })
    .promise()
    .then(data => {
      logger.info(`Got object ${url}, ${data.ContentLength} bytes`)
      // force cast from undefined and Uint8Array
      return parseMail(url, data.Body as any)
        .then(processNotify)
        .catch(err => {
          logger.warn(`Failed to parse mail object: ${url}`, err)
          throw toThrow(err, `Failed to parse mail object: ${url}`)
        })
    })
    .catch(err => {
      logger.warn(`Failed to get object: ${url}`, err)
      throw toThrow(err, `Failed to get object: ${url}`)
    })
}

/** Invoked on S3 event */
export const s3Handler = (
  event: APIGatewayEvent,
  context: LambdaContext,
  callback: LambdaCallback,
) => {
  const payload = findPayload(event)
  try {
    const s3Event = payload as AWSLambda.S3Event
    return Promise.all(
      s3Event.Records.map(r => {
        if (r.eventName === 'ObjectCreated:Put') {
          return processMailObject('s3://' + r.s3.bucket.name + '/' + r.s3.object.key)
        } else {
          return Promise.resolve(false)
        }
      }),
    )
      .then(result => {
        logger.info(`Got result: ${JSON.stringify(result)}`)
        apiResponse(event, context, callback).success(result)
      })
      .catch(err => {
        logger.warn('Failed to send to webhook URL', err)
        apiResponse(event, context, callback).failure('Failed to send to webhook URL: ' + err)
      })
  } catch (err) {
    logger.warn('Failed to process s3 event', err)
    apiResponse(event, context, callback).failure('Failed to process s3 event: ' + err.message)
  }
}
