import { apiResponse, findPayload } from './util'
import { Context as LambdaContext, APIGatewayEvent, Callback as LambdaCallback } from 'aws-lambda'
import { logger } from './logger'
import fetch from 'node-fetch'
import { urlToBucketName, urlToKeyName, toThrow } from './util'
import { config } from './config'
import { S3 } from 'aws-sdk'
import { simpleParser } from 'mailparser'

const s3 = new S3({
  signatureVersion: 'v4',
  region: config.AWS_REGION,
})

export const processMailObject = (url: string) => {
  logger.info('Sending ' + url + ' to ' + config.SLACK_DEFAULT_HOOK_URL)

  return s3
    .getObject({ Bucket: urlToBucketName(url), Key: urlToKeyName(url) })
    .promise()
    .then(data => {
      logger.info(`Got object ${url}, ${data.ContentLength} bytes`)
      return simpleParser(<any>data.Body, {}) // force cast from undefined and Uint8Array
        .then(mail => {
          const blocks = [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*From:* ${mail.from && mail.from.text} \n*To:* ${mail.to &&
                  mail.to.text} \n${mail.subject}\n`,
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
                  text: `Received: ${mail.date}`,
                },
              ],
            },
          ]

          const text = `You have got mail: ${urlToBucketName(url)}, ${urlToKeyName(url)}, ${
            data.ContentLength
          } bytes, ${mail.subject}, ${mail.from && mail.from.text}, ${mail.to &&
            mail.to.text}, ${mail.cc && mail.cc.text}, ${mail.bcc && mail.bcc.text}\n\n
            --
          ${mail.text}  
          `

          console.info('Sending blocks', blocks)
          console.info('Sending plaintext', text)

          return fetch(config.SLACK_DEFAULT_HOOK_URL, {
            method: 'post',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              blocks,
              text,
            }),
          })
        })
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
    Promise.all(
      s3Event.Records.map(r =>
        processMailObject('s3://' + r.s3.bucket.name + '/' + r.s3.object.key),
      ),
    )
      .then(result => {
        logger.info(`Got result: ${JSON.stringify(result, null, 2)}`)
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
