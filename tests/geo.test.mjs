import { test } from 'node:test'
import assert from 'node:assert/strict'
import { distanceMeters, segmentsDistanceMeters, validPoint } from './dist/geo.js'

test('identical coordinates have zero distance', () => {
  assert.equal(distanceMeters([35.68, 139.75], [35.68, 139.75]), 0)
})

test('known approximate latitude length is correct', () => {
  const meters = distanceMeters([35, 139], [36, 139])
  assert.ok(meters > 110000 && meters < 112000, String(meters))
})

test('segments never connect different laps/tracks', () => {
  const a = [35, 139], b = [35.01, 139], c = [36, 140], d = [36.01, 140]
  const actual = segmentsDistanceMeters([[a, b], [c, d]])
  const expected = distanceMeters(a, b) + distanceMeters(c, d)
  assert.ok(Math.abs(actual - expected) < 0.001)
})

test('empty and single-point segments do not contribute distance', () => {
  assert.equal(segmentsDistanceMeters([[], [[35, 139]]]), 0)
})

test('coordinates outside latitude and longitude range are rejected', () => {
  assert.equal(validPoint(91, 139), false)
  assert.equal(validPoint(35, 181), false)
  assert.equal(validPoint(NaN, 139), false)
  assert.equal(validPoint(35, 139), true)
})
