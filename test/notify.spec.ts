import * as assert from 'assert'
import { config } from '../src/config'
import fetch from 'node-fetch'
import { processMailObject, processNotify } from '../src/notify'
import { parseMail } from '../src/mime'
import * as fs from 'fs'
import { createMessage } from '../src/slack'

describe('notify.ts', () => {
  const e2e = config.TEST_E2E ? it : it.skip

  it('can parse test verify file', () => {
    return parseMail(fs.readFileSync('test-data/pu764f35kqfv61gs7m77eger4b1p7dp7gamjq0o1')).then(
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
    return parseMail(fs.readFileSync('test-data/kma0vh1tpk667ccsodsf21aspsn7sid8k09o7f81')).then(
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
    return parseMail(fs.readFileSync('test-data/3591cs7amv8mmb4lt866fbses81l6p799mv2s401')).then(
      notify => {
        assert.equal(notify.from, 'notifications@github.com')
        assert.equal(notify.to, 'notify@app.ruslan.org')
        assert.equal('github', notify.type)
        return createMessage(notify).then(m => {
          const meta = m.blocks[3].elements[0].text
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
    return parseMail(fs.readFileSync('test-data/7nhjjcu5pr70b93g3aot4fa2mpbgeiharj3leq81')).then(
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

  e2e('can process local sample file uptime robot', () => {
    return parseMail(fs.readFileSync('test-data/5cktoahvk970k205fsrj3h7i17kbhl7bvmcgido1')).then(
      processNotify('fs://test-data/1.msg'),
    )
  })
})
