import { config, readSSMConfig } from '../src/config'
import * as assert from 'assert'
import { logger as log } from '../src/logger'

describe('config.ts', () => {
  it('sensible defaults', () => {
    assert.ok(config.AWS_REGION)
    log.info('config', config)
  })

  const e2e = config.TEST_E2E ? it : it.skip
  e2e('can read SSM config', () => {
    return Promise.all([
      readSSMConfig().then(r => {
        console.info(r)
      }),
      readSSMConfig().then(r => {
        console.info(r)
      }),
      readSSMConfig().then(r => {
        console.info(r)
      }),
    ])
  })
})
