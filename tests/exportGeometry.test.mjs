import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  EXPORT_WIDTH, EXPORT_HEIGHT, visibleExportEntries, mapViewport, pixelFor,
  exportStatistics, exportFilename,
} from './dist/exportGeometry.js'

const ride = (visible, distanceKm, elevationGainM, segments = [[[35.0, 139.0], [35.2, 139.3]]]) => ({
  visible, distanceKm, elevationGainM, segments,
})

test('only visible rides are exported, colors retain their original indices', () => {
  const rows = [ride(true, 10, 100), ride(false, 500, 4000), ride(true, 20, null)]
  const entries = visibleExportEntries(rows, ['#00aaff', '#ff0000', '#00cc88'])
  assert.equal(entries.length, 2)
  assert.deepEqual(entries.map(entry => entry.color), ['#00aaff', '#00cc88'])
  assert.equal(entries[0].ride, rows[0])
  assert.equal(entries[1].ride, rows[2])
})

test('statistics exclude hidden rides and distinguish partial elevation from zero', () => {
  assert.deepEqual(exportStatistics([
    ride(true, 11.25, 300), ride(false, 99, 9000), ride(true, 3.25, null),
  ]), {
    rideCount: '2',
    distance: '14.5 km',
    elevation: '300 m',
    elevationNote: '標高データ 1/2 件',
  })
  assert.equal(exportStatistics([ride(true, 3, null)]).elevation, '— m')
  assert.equal(exportStatistics([ride(true, 3, 0)]).elevation, '0 m')
  assert.equal(exportStatistics([ride(true, 3, 0)]).elevationNote, '')
})

test('map viewport fits visible points inside the image with margins', () => {
  const entries = visibleExportEntries([
    ride(true, 10, 300, [[[35, 139], [35.4, 139.4]], [[35.5, 139.5], [36, 140]]]),
    ride(false, 10, 300, [[[0, 0], [0, 10]]]),
  ], ['#aaa', '#bbb'])
  const rect = { x: 40, y: 230, width: 1520, height: 628 }
  const viewport = mapViewport(entries, rect)
  for (const [lat, lon] of [[35, 139], [35.4, 139.4], [35.5, 139.5], [36, 140]]) {
    const [x, y] = pixelFor(lat, lon, viewport)
    assert.ok(x > 50 && x < 1470, 'point x: ' + x)
    assert.ok(y > 50 && y < 578, 'point y: ' + y)
  }
  assert.ok(viewport.zoom >= 0 && viewport.zoom <= 15)
})

test('crossing the antimeridian uses a compact viewport', () => {
  const entries = visibleExportEntries([
    ride(true, 5, 10, [[[10, 179.8], [10.1, -179.8]]]),
  ], ['#aaa'])
  const rect = { x: 40, y: 100, width: 1520, height: 762 }
  const view = mapViewport(entries, rect)
  const [left] = pixelFor(10, 179.8, view)
  const [right] = pixelFor(10.1, -179.8, view)
  assert.ok(Math.abs(left - right) < rect.width / 2)
})

test('PNG dimensions and timestamped file names are deterministic', () => {
  assert.equal(EXPORT_WIDTH, 1600)
  assert.equal(EXPORT_HEIGHT, 900)
  const date = new Date(2026, 10, 3, 1, 45)
  assert.equal(exportFilename('map', date), 'cycling-map-20261103-0145-map.png')
  assert.equal(exportFilename('stats', date), 'cycling-map-20261103-0145-stats.png')
})
