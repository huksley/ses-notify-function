import * as fs from 'fs'
import * as assert from 'assert'
import { parseMail } from '../src/mime'

const FAKE_URL = "s3://ses-notify-incoming/test.wizecore.com/09t2vhcsbvkj11034tfrnmi23nu4fp9cq775so01"

describe('mime.ts', () => {
  it('can parse test-file 3591cs7amv8mmb4lt866fbses81l6p799mv2s401', () => {
    return parseMail(FAKE_URL, fs.readFileSync('test-data/3591cs7amv8mmb4lt866fbses81l6p799mv2s401')).then(
      notify => {
        assert.equal(notify.mail.from?.value[0].address, 'notifications@github.com')
        assert.equal(
          notify.mail.to?.value[0].address,
          'github-repository-provisioner@noreply.github.com',
        )
        assert.equal(notify.mail.cc?.value[0].address, 'notify@app.ruslan.org')
      },
    )
  })

  it('can parse test-file stjrglh0ujt6h0qdtf1dkvsloojnehnp9q8g2fo1', () => {
    return parseMail(FAKE_URL, fs.readFileSync('test-data/stjrglh0ujt6h0qdtf1dkvsloojnehnp9q8g2fo1')).then(
      notify => {
        assert.equal(notify.type, 'github')
        assert.equal(notify.mail.from?.value[0].address, 'notifications@github.com')
        assert.equal(notify.mail.to?.value[0].address, 'app-facade-journey@noreply.github.com')
        assert.equal(notify.mail.cc?.value[0].address, 'notify@app.ruslan.org')
      },
    )
  })

  it('can parse github notification into sensible source/target structure', () => {
    return parseMail(FAKE_URL, fs.readFileSync('test-data/stjrglh0ujt6h0qdtf1dkvsloojnehnp9q8g2fo1')).then(
      notify => {
        assert.equal(notify.type, 'github')
        assert.equal(notify.mail.from?.value[0].address, 'notifications@github.com')
        assert.equal(notify.mail.to?.value[0].address, 'app-facade-journey@noreply.github.com')
        assert.equal(notify.mail.cc?.value[0].address, 'notify@app.ruslan.org')
      },
    )
  })
})
