import { createServerFn } from '@tanstack/react-start'
import { getRequest, setResponseHeader } from '@tanstack/react-start/server'

export type Area = { lat: number; lng: number }
/** Only the coarse edge location is returned; IP addresses are never exposed or stored. */
export const requestArea = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Area | null> => {
    setResponseHeader('Cache-Control', 'private, no-store')
    const cf = (
      getRequest() as Request & {
        cf?: { latitude?: string; longitude?: string }
      }
    ).cf
    if (!cf?.latitude || !cf.longitude) return null
    const lat = Number(cf.latitude),
      lng = Number(cf.longitude)
    return Number.isFinite(lat) &&
      Math.abs(lat) <= 90 &&
      Number.isFinite(lng) &&
      Math.abs(lng) <= 180
      ? { lat, lng }
      : null
  },
)
