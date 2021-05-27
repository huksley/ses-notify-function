import { parseMail } from '../src/mime'
import * as fs from 'fs'
import { createMessage } from '../src/slack'

describe('slack.ts', () => {
  it('can parse test sus file', () => {
    return parseMail(fs.readFileSync('test-data/viechvd8rvlb22n49nqtrsrql95g0ahpqu6hq8o1')).then(
      notify => {
        return createMessage(notify).then(m => {
          console.info(JSON.stringify(m, null, 2))
          return m
        })
      },
    )
  })
})
