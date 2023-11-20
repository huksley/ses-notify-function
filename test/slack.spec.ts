import { parseMail } from '../src/mime'
import * as fs from 'fs'
import { createMessage } from '../src/slack'

const FAKE_URL = "s3://ses-notify-incoming/test.wizecore.com/09t2vhcsbvkj11034tfrnmi23nu4fp9cq775so01"


describe('slack.ts', () => {
  it('can parse test sus file', () => {
    return parseMail(FAKE_URL, fs.readFileSync('test-data/viechvd8rvlb22n49nqtrsrql95g0ahpqu6hq8o1')).then(
      notify => {
        return createMessage(notify).then(m => {
          console.info(JSON.stringify(m, null, 2))
          return m
        })
      },
    )
  })
})
