import { test } from 'node:test'
import assert from 'node:assert/strict'
import { summarizeVisibleRides } from './dist/rideStats.js'

const ride = (visible, distanceKm, elevationGainM) => ({
  visible, distanceKm, elevationGainM,
})

test('totals only the visible rides', () => {
  assert.deepEqual(summarizeVisibleRides([
    ride(true, 15, 180),
    ride(false, 100, 1500),
    ride(true, 7.5, 240),
  ]), {
    visibleCount: 2,
    visibleDistance: 22.5,
    visibleElevationGain: 420,
    elevationDataCount: 2,
  })
})

test('missing elevation is excluded rather than interpreted as zero elevation', () => {
  assert.deepEqual(summarizeVisibleRides([
    ride(true, 5, null),
    ride(true, 10, 0),
    ride(false, 8, 90),
  ]), {
    visibleCount: 2,
    visibleDistance: 15,
    visibleElevationGain: 0,
    elevationDataCount: 1,
  })
})

test('no visible rides yield an empty summary', () => {
  assert.deepEqual(summarizeVisibleRides([
    ride(false, 50, 320),
  ]), {
    visibleCount: 0,
    visibleDistance: 0,
    visibleElevationGain: 0,
    elevationDataCount: 0,
  })
})
