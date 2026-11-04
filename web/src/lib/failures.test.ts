import assert from 'node:assert/strict'
import test from 'node:test'
import { ActionFailure, failureKind, friendlyError } from './failures'

test('provider, GraphQL, HTML and private details cannot become displayed copy', () => {
  for (const error of [
    new Error('[foir] GraphQL errors: HTTP 500 secret=user@example.test'),
    new Error('<html>internal stack and bearer credential</html>'),
    '<script>private record text</script>', null,
    {graphQLErrors: [{message: 'private', extensions: {code: 'INTERNAL'}}]},
    {code: '__proto__'}, {code: 'toString'}, {graphQLErrors: 'untrusted'},
  ]) {
    assert.equal(failureKind(error), 'generic')
    assert.equal(friendlyError(error), 'That didn’t work. Please try again.')
  }
})
test('known failures keep useful guidance without copying provider messages', () => {
  const cases = [
    [{status: 401}, 'signIn'], [{status: 403}, 'permission'], [{status: 429}, 'limited'],
    [{graphQLErrors: [{extensions: {code: 'STEP_UP_REQUIRED'}}]}, 'recentAuth'],
    [{code: 'RATE_LIMITED'}, 'limited'], [{code: 'UNAVAILABLE'}, 'network'],
    [{code: 'INVALID_ARGUMENT'}, 'invalid'], [{code: 'ALREADY_EXISTS'}, 'conflict'],
    [new ActionFailure('pending'), 'pending'], [new ActionFailure('location'), 'location'],
  ] as const
  for (const [error, key] of cases) {
    assert.equal(failureKind(error), key)
    assert.equal(friendlyError(error, key => `Published ${key}`), `Published errors.${key}`)
  }
  assert.equal(friendlyError(new Error('camera internals'), key => key, 'camera'), 'errors.camera')
})
