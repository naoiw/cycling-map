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
function child(element: Element | undefined, localName: string): Element | undefined {
  return element && children(element, localName)[0]
}
function descendants(element: Element, localName: string): Element[] {
  return Array.from(element.getElementsByTagName('*')).filter(child => child.localName === localName)
}
function text(element: Element | undefined): string {
  return element?.textContent?.trim() ?? ''
}
function timestamp(value: string): number | null {
  const ms = value ? Date.parse(value) : NaN
  return Number.isFinite(ms) ? ms : null
}
function sample(lat: string | null, lon: string | null, time: string, elevation: string): SamplePoint | null {
  if (lat === null || lon === null || !lat.trim() || !lon.trim()) return null
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
  const segments: SamplePoint[][] = []
  for (const segment of descendants(root, 'trkseg')) {
    const points = children(segment, 'trkpt').map(pt => sample(
      pt.getAttribute('lat'), pt.getAttribute('lon'),
      text(child(pt, 'time')), text(child(pt, 'ele')),
    )).filter((pt): pt is SamplePoint => pt !== null)
    if (points.length > 0) segments.push(points)
  }
  // A GPX file can contain tracks or routes; route points are used if no
  // usable track points are present, matching the previous JourneyMap behavior.
  if (!segments.length) {
    for (const route of descendants(root, 'rte')) {
      const points = children(route, 'rtept').map(pt => sample(
        pt.getAttribute('lat'), pt.getAttribute('lon'),
        text(child(pt, 'time')), text(child(pt, 'ele')),
      )).filter((pt): pt is SamplePoint => pt !== null)
      if (points.length > 0) segments.push(points)
    }
  }
  return segments
}

function tcxSegments(root: Element): SamplePoint[][] {
  const segments: SamplePoint[][] = []
  for (const track of descendants(root, 'Track')) {
    const points = children(track, 'Trackpoint').map(pt => {
      const position = child(pt, 'Position')
      if (!position) return null
      return sample(
        text(child(position, 'LatitudeDegrees')),
        text(child(position, 'LongitudeDegrees')),
        text(child(pt, 'Time')),
        text(child(pt, 'AltitudeMeters')),
      )
    }).filter((pt): pt is SamplePoint => pt !== null)
    if (points.length > 0) segments.push(points)
  }
  return segments
}

/** Parse one activity locally in the browser; no file data is uploaded. */
export function parseRide(xml: string, fileName: string, id: string): Ride {
  const document = new DOMParser().parseFromString(xml, 'application/xml')
  if (document.getElementsByTagName('parsererror').length) {
    throw new Error('XMLの形式が正しくありません。')
  }
  const root = document.documentElement
  let format: ActivityFormat
  if (root.localName === 'gpx') format = 'GPX'
  else if (root.localName === 'TrainingCenterDatabase') format = 'TCX'
  else throw new Error('GPXまたはTCX形式ではありません。')

  const raw = format === 'GPX' ? gpxSegments(root) : tcxSegments(root)
  const validSegments = raw.filter(points => points.length >= 2)
  if (!validSegments.length) throw new Error('地図に描画できる座標が2点以上ありません。')
  const segments = validSegments.map(points => points.map(sample => sample.point))

  let pointCount = 0
  let start: number | null = null
  let end: number | null = null
  let elevationGain = 0
  let hasElevation = false
  // Do not flatten large activity arrays or allocate a separate list of times.
  for (const segment of validSegments) {
    pointCount += segment.length
    for (let i = 0; i < segment.length; i += 1) {
      const current = segment[i]
      if (current.time !== null) {
        start = start === null ? current.time : Math.min(start, current.time)
        end = end === null ? current.time : Math.max(end, current.time)
      }
      if (i === 0) continue
      const previousElevation = segment[i - 1].elevation
      if (previousElevation !== null && current.elevation !== null) {
        hasElevation = true
        elevationGain += Math.max(0, current.elevation - previousElevation)
      }
    }
  }

  const metadata = child(root, 'metadata')
  const track = child(root, 'trk')
  const route = child(root, 'rte')
  const activity = format === 'TCX' ? descendants(root, 'Activity')[0] : undefined
  const title = format === 'GPX'
    ? text(child(metadata, 'name')) || text(child(track, 'name')) || text(child(route, 'name'))
    : ''
  const metadataTime = timestamp(text(child(metadata, 'time')))
  const fallbackTime = timestamp(text(child(activity, 'Id')))
  const date = start ?? metadataTime ?? fallbackTime

  return {
    id,
    name: title || fileName.replace(/\.(gpx|tcx)$/i, ''),
    fileName,
    format,
    date: date === null ? null : new Date(date).toISOString(),
    durationSeconds: start !== null && end !== null && end > start
      ? Math.round((end - start) / 1000)
      : null,
    distanceKm: segmentsDistanceMeters(segments) / 1000,
    elevationGainM: hasElevation ? Math.round(elevationGain) : null,
    pointCount,
    segments,
    visible: true,
  }
}
