import { segmentsDistanceMeters, validPoint, type Point } from './geo'

export type ActivityFormat = 'GPX' | 'TCX'
export type Ride = {
  id: string
  name: string
  fileName: string
  format: ActivityFormat
  date: string | null
  durationSeconds: number | null
  distanceKm: number
  elevationGainM: number | null
  pointCount: number
  segments: Point[][]
  visible: boolean
}

type SamplePoint = {
  point: Point
  time: number | null
  elevation: number | null
}

function children(element: Element, localName: string): Element[] {
  return Array.from(element.children).filter(child => child.localName === localName)
}
function descendants(element: Element, localName: string): Element[] {
  return Array.from(element.getElementsByTagName('*')).filter(child => child.localName === localName)
}
function first(element: Element, localName: string): Element | undefined {
  return descendants(element, localName)[0]
}
function text(element: Element | undefined): string {
  return element?.textContent?.trim() ?? ''
}
function timestamp(value: string): number | null {
  if (!value) return null
  const ms = Date.parse(value)
  return Number.isFinite(ms) ? ms : null
}
function sample(lat: string | null, lon: string | null, time: string, elevation: string): SamplePoint | null {
  if (lat === null || lon === null || lat.trim() === '' || lon.trim() === '') return null
  const latitude = Number(lat)
  const longitude = Number(lon)
  if (!validPoint(latitude, longitude)) return null
  const height = elevation.trim() ? Number(elevation) : NaN
  return {
    point: [latitude, longitude],
    time: timestamp(time),
    elevation: Number.isFinite(height) ? height : null,
  }
}
function gpxSegments(root: Element): SamplePoint[][] {
  const result: SamplePoint[][] = []
  for (const segment of descendants(root, 'trkseg')) {
    const points = children(segment, 'trkpt').map(pt => sample(
      pt.getAttribute('lat'), pt.getAttribute('lon'), text(first(pt, 'time')), text(first(pt, 'ele')),
    )).filter((pt): pt is SamplePoint => pt !== null)
    if (points.length > 0) result.push(points)
  }
  if (result.length === 0) {
    for (const route of descendants(root, 'rte')) {
      const points = children(route, 'rtept').map(pt => sample(
        pt.getAttribute('lat'), pt.getAttribute('lon'), text(first(pt, 'time')), text(first(pt, 'ele')),
      )).filter((pt): pt is SamplePoint => pt !== null)
      if (points.length > 0) result.push(points)
    }
  }
  return result
}
function tcxSegments(root: Element): SamplePoint[][] {
  const result: SamplePoint[][] = []
  for (const track of descendants(root, 'Track')) {
    const points = children(track, 'Trackpoint').map(pt => {
      const position = first(pt, 'Position')
      if (!position) return null
      return sample(
        text(first(position, 'LatitudeDegrees')),
        text(first(position, 'LongitudeDegrees')),
        text(first(pt, 'Time')),
        text(first(pt, 'AltitudeMeters')),
      )
    }).filter((pt): pt is SamplePoint => pt !== null)
    if (points.length > 0) result.push(points)
  }
  return result
}

/** Parses XML entirely in the browser; neither input nor parsed positions are uploaded. */
export function parseRide(xml: string, fileName: string, id: string): Ride {
  const document = new DOMParser().parseFromString(xml, 'application/xml')
  if (document.getElementsByTagName('parsererror').length) {
    throw new Error('XMLの形式が正しくありません。')
  }
  const root = document.documentElement
  const format: ActivityFormat = root.localName === 'gpx' ? 'GPX'
    : root.localName === 'TrainingCenterDatabase' ? 'TCX'
      : (() => { throw new Error('GPXまたはTCX形式ではありません。') })()
  const rawSegments = format === 'GPX' ? gpxSegments(root) : tcxSegments(root)
  // Discard empty/singleton geometry: such segments cannot form a route line.
  const validSegments = rawSegments.filter(points => points.length >= 2)
  if (!validSegments.length) throw new Error('地図に描画できる座標が2点以上ありません。')

  const segments = validSegments.map(points => points.map(sample => sample.point))
  const points = validSegments.flat()
  const times = points.map(point => point.time).filter((value): value is number => value !== null)
  const start = times.length ? times.reduce((a, b) => Math.min(a, b)) : null
  const end = times.length ? times.reduce((a, b) => Math.max(a, b)) : null
  let elevationGain = 0
  let hasElevation = false
  for (const segment of validSegments) {
    for (let i = 1; i < segment.length; i += 1) {
      const previous = segment[i - 1].elevation
      const current = segment[i].elevation
      if (previous !== null && current !== null) {
        hasElevation = true
        elevationGain += Math.max(0, current - previous)
      }
    }
  }

  const metadata = first(root, 'metadata')
  const title = format === 'GPX'
    ? text(metadata ? first(metadata, 'name') : undefined) || text(first(root, 'trk') ? first(first(root, 'trk')!, 'name') : undefined)
      || text(first(root, 'rte') ? first(first(root, 'rte')!, 'name') : undefined)
    : ''
  const activityId = format === 'TCX' ? text(first(root, 'Activity') ? first(first(root, 'Activity')!, 'Id') : undefined) : ''
  const metadataTime = metadata ? timestamp(text(first(metadata, 'time'))) : null
  const fallbackTime = timestamp(activityId)
  const date = start ?? metadataTime ?? fallbackTime

  return {
    id,
    name: title || fileName.replace(/\.(gpx|tcx)$/i, ''),
    fileName,
    format,
    date: date === null ? null : new Date(date).toISOString(),
    durationSeconds: start !== null && end !== null && end > start ? Math.round((end - start) / 1000) : null,
    distanceKm: segmentsDistanceMeters(segments) / 1000,
    elevationGainM: hasElevation ? Math.round(elevationGain) : null,
    pointCount: points.length,
    segments,
    visible: true,
  }
}
