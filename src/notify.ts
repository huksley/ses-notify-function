import { apiResponse, findPayload, urlToBucketName, urlToKeyName, toThrow } from './util'
import { Context as LambdaContext, APIGatewayEvent, Callback as LambdaCallback } from 'aws-lambda'
import { logger } from './logger'
import fetch from 'node-fetch'
import { config } from './config'
import { S3 } from 'aws-sdk'

import { createMessage, findDestination } from './slack'
import { parseMail } from './mime'

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
      // force cast from undefined and Uint8Array
      return parseMail(data.Body as any)
        .then(notify => {
          return createMessage(notify, { notice: `Source: ${url}` }).then(message => {
            return fetch(findDestination(message), {
              method: 'post',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                blocks: message.blocks,
                text: message.text,
              }),
            })
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
