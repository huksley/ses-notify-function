import { apiResponse, findPayload, urlToBucketName, urlToKeyName, toThrow } from './util'
import { Context as LambdaContext, APIGatewayEvent, Callback as LambdaCallback } from 'aws-lambda'
import { logger } from './logger'
import fetch from 'node-fetch'
import { config } from './config'
import { S3 } from 'aws-sdk'

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

export const processNotify = (url: string) => (notify: Notification) => {
  return createMessage(notify, { notice: `Source: ${createS3UrlMarkup(url)}` }).then(message => {
    return findDestination(message).then(slackUrl => {
      logger.info('Sending message ' + message.uuid + ' to ' + slackUrl)
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
        .then(response => {
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
              logger.info(
                'Message sending failed (' + message.uuid + '): ' + response.status + ', ' + text,
              )
              return false
            })
          }
        })
        .catch(err => {
          logger.warn('Failed to send message (' + message.uuid + '): ' + err.message, err)
          return false
        })
    })
  })
}

export const processMailObject = (url: string) => {
  logger.info('Sending ' + url + ' to ' + config.SLACK_DEFAULT_HOOK_URL)

  // Update content-type to be text
  return s3
    .copyObject({
      CopySource: urlToBucketName(url) + '/' + urlToKeyName(url),
      Bucket: urlToBucketName(url),
      Key: urlToKeyName(url),
      ContentType: 'text/plain',
      MetadataDirective: 'REPLACE',
    })
    .promise()
    .then(_ => {
      return s3
        .getObject({ Bucket: urlToBucketName(url), Key: urlToKeyName(url) })
        .promise()
        .then(data => {
          logger.info(`Got object ${url}, ${data.ContentLength} bytes`)
          // force cast from undefined and Uint8Array
          return parseMail(data.Body as any)
            .then(processNotify(url))
            .catch(err => {
              logger.warn(`Failed to parse mail object: ${url}`, err)
              throw toThrow(err, `Failed to parse mail object: ${url}`)
            })
        })
        .catch(err => {
          logger.warn(`Failed to get object: ${url}`, err)
          throw toThrow(err, `Failed to get object: ${url}`)
        })
    })
    .catch(err => {
      logger.warn(`Failed to update object meta: ${url}`, err)
      throw toThrow(err, `Failed to update object meta: ${url}`)
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
