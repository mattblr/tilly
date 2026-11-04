import assert from 'node:assert/strict'
import test from 'node:test'
import { stopCamera, catchLocation } from './camera'
test('camera cleanup stops every track and tolerates an absent stream', () => {
  let stopped = 0
  stopCamera({
    getTracks: () => [{ stop: () => stopped++ }, { stop: () => stopped++ }],
  } as unknown as MediaStream)
  stopCamera(null)
  assert.equal(stopped, 2)
})
test('catch location validates coordinates and reports denial', async () => {
  const geolocation = (coords: unknown, error?: { code: number }) =>
    ({
      getCurrentPosition: (success: Function, failure: Function) =>
        error ? failure(error) : success({ coords }),
    }) as unknown as Geolocation
  assert.deepEqual(
    await catchLocation(geolocation({ latitude: 51, longitude: -1 })),
    { lat: 51, lng: -1 },
  )
  await assert.rejects(
    catchLocation(geolocation({ latitude: NaN, longitude: 1 })),
    /unavailable/,
  )
  await assert.rejects(catchLocation(geolocation({}, { code: 1 })), /denied/)
})
