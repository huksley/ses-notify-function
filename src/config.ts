import * as dotenv from 'dotenv'
import 'source-map-support/register'

export const defaultConfig = {
  NODE_ENV: 'development' as 'development' | 'product',
  AWS_REGION: 'eu-west-1',
  SLACK_HOOK_URL: 'https://hooks.slack.com/services/DEADBEEF/DEADBEEF/beefdeaddeadbeefdead',
  MAIL_BUCKET: 'ses-notify-mail',
  MAIL_PREFIX: 'mail1',
  SLACK_HOOK_URL_2: 'https://hooks.slack.com/services/DEADBEEF/DEADBEEF/beefdeaddeadbeefdead',
  MAIL_BUCKET_2: 'ses-notify-mail2',
  MAIL_PREFIX_2: 'mail2',
  /** Send automatic reply */
  SEND_REPLY: '0',
  /** Do not send if received from this one */
  SEND_REPLY_EXCLUDE: 'hello@example.com',
  TEST_E2E: false,
  TEST_E2E_OBJECT: 's3://sample-bucket/sample-folder/deadbeefdeadbeefdeaddeadbeef',
}

type defaultConfigType = typeof defaultConfig 
type openType = { [key: string]: string }

/**
 * Typed, configurable instance of application config. Use environment or .env files to define variables.
 */
export const config = (dotenv.config().parsed ?? {}) as defaultConfigType & openType

