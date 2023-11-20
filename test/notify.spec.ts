import * as assert from 'assert'
import { config } from '../src/config'
import fetch from 'node-fetch'
import { processMailObject, createS3UrlMarkup, processNotify } from '../src/notify'
import { parseMail } from '../src/mime'
import * as fs from 'fs'
import { createMessage } from '../src/slack'
import { logger } from '../src/logger'

const FAKE_URL = "s3://ses-notify-incoming/test.wizecore.com/09t2vhcsbvkj11034tfrnmi23nu4fp9cq775so01"

describe('notify.ts', () => {
  const e2e = config.TEST_E2E ? it : it.skip

  it('can parse test sus file', () => {
    return parseMail(FAKE_URL, fs.readFileSync('test-data/viechvd8rvlb22n49nqtrsrql95g0ahpqu6hq8o1')).then(
      notify => {
        return createMessage(notify).then(m => {
          logger.info(m)
          return m
        })
      },
    )
  })

  it('can parse test verify file', () => {
    return parseMail(FAKE_URL, fs.readFileSync('test-data/pu764f35kqfv61gs7m77eger4b1p7dp7gamjq0o1')).then(
      notify => {
        assert.equal(notify.from, 'noreply@github.com')
        assert.equal(notify.to, 'notify@app.ruslan.org')
        assert.equal('github', notify.type)
        assert.equal('direct', notify.priority)
        return createMessage(notify).then(m => {
          return m
        })
      },
    )
  })

  it('can parse test issue comment file', () => {
    return parseMail(FAKE_URL, fs.readFileSync('test-data/kma0vh1tpk667ccsodsf21aspsn7sid8k09o7f81')).then(
      notify => {
        assert.equal(notify.from, 'notifications@github.com')
        assert.equal(notify.to, 'notify@app.ruslan.org')
        assert.equal('github', notify.type)
        assert.equal('direct', notify.priority)
        return createMessage(notify).then(m => {
          return m
        })
      },
    )
  })

  it('can parse test PR notify file', () => {
    return parseMail(FAKE_URL, fs.readFileSync('test-data/3591cs7amv8mmb4lt866fbses81l6p799mv2s401')).then(
      notify => {
        assert.equal(notify.from, 'notifications@github.com')
        assert.equal(notify.to, 'notify@app.ruslan.org')
        assert.equal('github', notify.type)
        return createMessage(notify).then(m => {
          let meta = ''
          m.blocks.forEach(e => {
            if (e.type === 'context' && e.elements) {
              logger.info(e)
              e.elements.forEach(ee => {
                meta += ee.text
              })
            }
          })

          assert.ok(
            meta.indexOf('reason: review_requested') >= 0,
            'Should contain reason: review_requested, ' + meta,
          )
          return m
        })
      },
    )
  })

  it('can parse linkedin direct message', () => {
    return parseMail(FAKE_URL, fs.readFileSync('test-data/7nhjjcu5pr70b93g3aot4fa2mpbgeiharj3leq81')).then(
      notify => {
        assert.equal(notify.from, 'messaging-digest-noreply@linkedin.com')
        assert.equal(notify.to, 'notify@app.ruslan.org')
        assert.equal('linkedin', notify.type)
        assert.equal('direct', notify.priority)
        return createMessage(notify).then(m => {
          return m
        })
      },
    )
  })

  it('can parse message notice url', () => {
    console.info(createS3UrlMarkup('s3://xxx/xxxxx'))
  })

  e2e('can send notification', () => {
    assert.doesNotThrow(() =>
      fetch(config.SLACK_HOOK_URL, {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'Hello, world',
        }),
      }),
    )
  })

  e2e('can process sample file', function() {
    this.timeout(20000)
    return processMailObject(config.TEST_E2E_OBJECT).then(result => assert(result))
  })

  e2e('can process local sample file uptime robot', function() {
    this.timeout(20000)
    return parseMail(FAKE_URL, fs.readFileSync('test-data/5cktoahvk970k205fsrj3h7i17kbhl7bvmcgido1'))
      .then(processNotify('s3://sample-bucket/sample-key'))
      .then(result => assert(result))
  })

  e2e('no invalid_blocks response from slack', function() {
    this.timeout(20000)
    return parseMail(FAKE_URL, fs.readFileSync('test-data/lp7i8nenl6m9m6crjlbnnegghhmjptppuctqn581'))
      .then(processNotify('s3://sample-bucket/sample-key'))
      .then(result => assert(result))
  })
})
