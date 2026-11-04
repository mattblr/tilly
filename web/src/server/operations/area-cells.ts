import type { Area } from './types'

// The geohash of a point, to `precision` characters.
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz'
function geohash(lat: number, lng: number, precision: number) {
  let [latLo, latHi, lngLo, lngHi] = [-90, 90, -180, 180]
  let hash = ''
  let bits = 0
  let value = 0
  let even = true
  while (hash.length < precision) {
    if (even) {
      const mid = (lngLo + lngHi) / 2
      if (lng >= mid) {
        value = value * 2 + 1
        lngLo = mid
      } else {
        value *= 2
        lngHi = mid
      }
    } else {
      const mid = (latLo + latHi) / 2
      if (lat >= mid) {
        value = value * 2 + 1
        latLo = mid
      } else {
        value *= 2
        latHi = mid
      }
    }
    even = !even
    if (++bits === 5) {
      hash += BASE32[value]
      bits = 0
      value = 0
    }
  }
  return hash
}

/** The cat's area cells, cell1 to cell6, that a zoomed-out map counts by. */
export const cells = ({ lat, lng }: Area) =>
  Object.fromEntries(
    [1, 2, 3, 4, 5, 6].map((n) => [`cell${n}`, geohash(lat, lng, n)]),
  )
