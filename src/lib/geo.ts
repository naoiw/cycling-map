export type Point = [latitude: number, longitude: number]

const EARTH_RADIUS_M = 6371008.8

/** Great-circle distance between two WGS84 latitude/longitude points (meters). */
export function distanceMeters(a: Point, b: Point): number {
  const toRadians = Math.PI / 180
  const dLat = (b[0] - a[0]) * toRadians
  const dLon = (b[1] - a[1]) * toRadians
  const lat1 = a[0] * toRadians
  const lat2 = b[0] * toRadians
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Sum within each segment. Never bridge gaps between different tracks/laps. */
export function segmentsDistanceMeters(segments: Point[][]): number {
  return segments.reduce((total, segment) => {
    for (let i = 1; i < segment.length; i += 1) {
      total += distanceMeters(segment[i - 1], segment[i])
    }
    return total
  }, 0)
}

export function validPoint(lat: number, lon: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lon)
    && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
}
