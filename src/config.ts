import * as dotenv from 'dotenv'
import * as R from 'ramda'
import 'source-map-support/register'
import { SSM } from 'aws-sdk'

export const defaultConfig = {
  NODE_ENV: 'development' as 'development' | 'product',
  LOG_LEVEL: 'info' as 'info' | 'debug' | 'warn' | 'error',
  AWS_REGION: 'eu-west-1',
  SLACK_DEFAULT_HOOK_URL: 'https://hooks.slack.com/services/DEADBEEF/DEADBEEF/beefdeaddeadbeefdead',
  TEST_E2E: false,
  TEST_E2E_OBJECT: 's3://sample-bucket/sample-folder/deadbeefdeadbeefdeaddeadbeef',
  SSM_PARAMETER_CONFIG: '',
}

type defaultConfigKey = keyof typeof defaultConfig

/** Converts specific keys to boolean */
const toBoolean = (o: typeof defaultConfig, k: defaultConfigKey[]): typeof defaultConfig => {
  const oo = o as any
  for (const kk of k) {
    oo[kk] = typeof o[kk] === 'string' ? Boolean(o[kk]) : o[kk]
  }
  return o
}

/** Converts specific keys to number */
const toNumber = (o: typeof defaultConfig, k: defaultConfigKey[]): typeof defaultConfig => {
  const oo = o as any
  for (const kk of k) {
    oo[kk] = typeof o[kk] === 'string' ? Number(o[kk]) : o[kk]
  }
  return o
}

/**
 * Typed, configurable instance of application config. Use environment or .env files to define variables.
 */
export const config = toNumber(
  toBoolean(
    {
      ...defaultConfig,
      ...(dotenv.config().parsed || R.pick(R.keys(defaultConfig), process.env)),
    },
    ['TEST_E2E'],
  ),
  [],
)

export const readSSMConfig = (): any => {
  if (config.SSM_PARAMETER_CONFIG) {
    const ssm = new SSM({
      region: config.AWS_REGION,
    })
    return ssm
      .getParameter({
        Name: config.SSM_PARAMETER_CONFIG,
      })
      .promise()
      .then(result => {
        return JSON.parse(result.Parameter!.Value!)
      })
      .catch(error => {
        // Can`t use logger because it is not initialized yet
        // tslint:disable-next-line:no-console
        console.warn('Failed to read SSM ' + config.SSM_PARAMETER_CONFIG + ': ' + error, error)
        return {}
      })
  } else {
    return Promise.resolve({})
  }
}
