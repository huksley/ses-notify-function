import * as assert from 'assert'
import { config } from '../src/config'
import fetch from 'node-fetch'
import { processMailObject } from '../src/notify'

describe('notify.ts', () => {
  const e2e = config.TEST_E2E ? it : it.skip

  e2e('can send notification', () => {
    assert.doesNotThrow(() =>
      fetch(config.SLACK_DEFAULT_HOOK_URL, {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text2: 'Hello, world',
        }),
      }),
    )
  })

  e2e('can process sample file', () => {
    return processMailObject(config.TEST_E2E_OBJECT)
  })
})
