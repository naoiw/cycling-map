import { summarizeVisibleRides } from './rideStats.js'

/** Minimal input shared by the browser PNG renderer and future social sharing (#11). */
export type ExportRide = {
  visible: boolean
  distanceKm: number
  elevationGainM: number | null
  segments: [number, number][][]
}

export type ExportVariant = 'map' | 'stats'
export type ExportEntry = { ride: ExportRide; color: string }
export type MapRect = { x: number; y: number; width: number; height: number }
export type MapViewport = {
  zoom: number
  scale: number
  anchorX: number
  originX: number
  originY: number
}

export const EXPORT_WIDTH = 1600
export const EXPORT_HEIGHT = 900

export function visibleExportEntries(rides: readonly ExportRide[], colors: readonly string[]): ExportEntry[] {
  return rides.flatMap((ride, index) => ride.visible ? [{ ride, color: colors[index] ?? '#94A3B8' }] : [])
}

const LAT_LIMIT = 85.05112878
function normalizedX(lon: number): number { return (lon + 180) / 360 }
function normalizedY(lat: number): number {
  const rad = Math.max(-LAT_LIMIT, Math.min(LAT_LIMIT, lat)) * Math.PI / 180
  return (1 - Math.log(Math.tan(Math.PI / 4 + rad / 2)) / Math.PI) / 2
}

function unwrapX(x: number, anchor: number): number {
  if (x - anchor > 0.5) return x - 1
  if (x - anchor < -0.5) return x + 1
  return x
}

/** Fit all visible tracks, including single-axis tracks, without joining segments. */
export function mapViewport(entries: readonly ExportEntry[], rect: MapRect, margin = 60): MapViewport {
  let anchorX: number | null = null
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const { ride } of entries) {
    for (const segment of ride.segments) {
      for (const [lat, lon] of segment) {
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
        const rawX = normalizedX(lon)
        if (anchorX === null) anchorX = rawX
        const x = unwrapX(rawX, anchorX)
        const y = normalizedY(lat)
        minX = Math.min(minX, x); maxX = Math.max(maxX, x)
        minY = Math.min(minY, y); maxY = Math.max(maxY, y)
      }
    }
  }
  if (anchorX === null) throw new Error('画像に出力できる経路がありません。')
  const fitWidth = Math.max(1, rect.width - 2 * margin)
  const fitHeight = Math.max(1, rect.height - 2 * margin)
  let zoom = 15
  while (zoom > 0) {
    const scale = 256 * 2 ** zoom
    if ((maxX - minX) * scale <= fitWidth && (maxY - minY) * scale <= fitHeight) break
    zoom--
  }
  const scale = 256 * 2 ** zoom
  return {
    zoom, scale, anchorX,
    originX: (minX + maxX) / 2 * scale - rect.width / 2,
    originY: (minY + maxY) / 2 * scale - rect.height / 2,
  }
}

export function pixelFor(lat: number, lon: number, view: MapViewport): [number, number] {
  return [
    unwrapX(normalizedX(lon), view.anchorX) * view.scale - view.originX,
    normalizedY(lat) * view.scale - view.originY,
  ]
}

export function exportStatistics(rides: readonly ExportRide[]) {
  const s = summarizeVisibleRides(rides)
  return {
    rideCount: String(s.visibleCount),
    distance: s.visibleDistance.toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' km',
    elevation: s.elevationDataCount ? s.visibleElevationGain.toLocaleString('ja-JP') + ' m' : '— m',
    elevationNote: s.elevationDataCount < s.visibleCount
      ? '標高データ ' + s.elevationDataCount + '/' + s.visibleCount + ' 件'
      : '',
  }
}

export function exportFilename(variant: ExportVariant, now: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  const date = String(now.getFullYear()) + pad(now.getMonth() + 1) + pad(now.getDate())
  const time = pad(now.getHours()) + pad(now.getMinutes())
  return 'cycling-map-' + date + '-' + time + '-' + variant + '.png'
}
