import assert from 'node:assert/strict'
import test from 'node:test'
import { rehearsalProfile } from './rehearsal-profile.js'

for (const value of ['toString', 'constructor', '__proto__', 'valueOf', '--isolated-port=3306', '--isolated-port=33318', '', undefined]) {
  test('rejects non-fixture argument before connection: ' + String(value), () => {
    let connections = 0
    const caller = (args) => { const profile = rehearsalProfile(args); connections++; return profile }
    assert.throws(() => caller(value === undefined ? [] : [value]), /dedicated fixture port/)
    assert.equal(connections, 0)
  })
}
test('accepts only both pinned immutable profiles', () => {
  assert.deepEqual(rehearsalProfile(['--isolated-port=33316']), { port: 33316, version: '10.11.16-MariaDB', directory: 'data' })
  assert.deepEqual(rehearsalProfile(['--isolated-port=33317']), { port: 33317, version: '10.6.18-MariaDB', directory: 'data106' })
  assert.equal(Object.isFrozen(rehearsalProfile(['--isolated-port=33316'])), true)
})
test('extra arguments including database URLs are refused', () => {
  assert.throws(() => rehearsalProfile(['--isolated-port=33316', '--database=production']), /dedicated fixture port/)
})
