import { test } from 'node:test'
import assert from 'node:assert/strict'
import { COLOR_BANDS, UNKNOWN_COLOR, colorBandIndex, resolveRideColor, rideColor } from './dist/rideColors.js'

const item = (distanceKm, elevationGainM) => ({ distanceKm, elevationGainM })

test('green band uses the darker map-visible green', () => {
  assert.equal(COLOR_BANDS[1].color, '#16A34A')
  assert.equal(resolveRideColor(item(50, 500), 0, 'distance'), '#16A34A')
  assert.equal(resolveRideColor(item(50, 500), 0, 'elevation'), '#16A34A')
  assert.equal(resolveRideColor(item(0, 0), 0, 'manual', '#16A34A'), '#16A34A')
})

test('five fixed distance bands, including exact boundary values', () => {
  const values = [0, 49.999, 50, 99.999, 100, 149.999, 150, 199.999, 200, 900]
  const bands = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4]
  assert.deepEqual(values.map(x => colorBandIndex(x, 50)), bands)
  assert.deepEqual(values.map(x => resolveRideColor(item(x, 0), 0, 'distance')), bands.map(i => COLOR_BANDS[i].color))
})

test('elevation classification does not confuse a missing value with zero', () => {
  const values = [0, 499, 500, 999, 1000, 1499, 1500, 1999, 2000, 9999]
  const bands = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4]
  assert.deepEqual(values.map(x => colorBandIndex(x, 500)), bands)
  assert.deepEqual(values.map(x => resolveRideColor(item(5, x), 0, 'elevation')), bands.map(i => COLOR_BANDS[i].color))
  assert.equal(resolveRideColor(item(50, null), 0, 'elevation'), UNKNOWN_COLOR)
  assert.equal(resolveRideColor(item(50, 0), 0, 'elevation'), COLOR_BANDS[0].color)
})

test('invalid or negative values use the neutral color in automatic modes', () => {
  for (const invalid of [Number.NaN, Number.POSITIVE_INFINITY, -1]) {
    assert.equal(colorBandIndex(invalid, 50), null)
    assert.equal(resolveRideColor(item(invalid, invalid), 0, 'distance'), UNKNOWN_COLOR)
    assert.equal(resolveRideColor(item(1, invalid), 0, 'elevation'), UNKNOWN_COLOR)
  }
})

test('manual colors are selected only in manual mode; automatic modes ignore stored selections', () => {
  const ride = item(220, null)
  const selected = COLOR_BANDS[1].color
  assert.equal(resolveRideColor(ride, 2, 'manual', selected), selected)
  assert.equal(resolveRideColor(ride, 2, 'manual'), rideColor(2))
  assert.equal(resolveRideColor(ride, 2, 'manual', '#ffffff'), rideColor(2))
  assert.equal(resolveRideColor(ride, 2, 'distance', selected), COLOR_BANDS[4].color)
  assert.equal(resolveRideColor(ride, 2, 'elevation', selected), UNKNOWN_COLOR)
  assert.equal(resolveRideColor(ride, 2, 'distance'), COLOR_BANDS[4].color)
  assert.equal(resolveRideColor(ride, 2, 'elevation'), UNKNOWN_COLOR)
})

test('switching modes does not change the explicit manual color stored by the UI', () => {
  const ride = item(75, 1500)
  const choice = COLOR_BANDS[4].color
  assert.equal(resolveRideColor(ride, 1, 'manual', choice), choice)
  assert.equal(resolveRideColor(ride, 1, 'distance', choice), COLOR_BANDS[1].color)
  assert.equal(resolveRideColor(ride, 1, 'elevation', choice), COLOR_BANDS[3].color)
  assert.equal(resolveRideColor(ride, 1, 'manual', choice), choice)
})

test('classification is independent of other rides and visibility', () => {
  assert.equal(resolveRideColor(item(50, 0), 5, 'distance'), COLOR_BANDS[1].color)
  assert.equal(resolveRideColor(item(50, 0), 5, 'distance'), resolveRideColor(item(50, 0), 0, 'distance'))
})
