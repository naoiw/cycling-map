import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeShareText, xComposeUrl } from './dist/shareRide.js'

const ride = (visible, distanceKm, elevationGainM) => ({
  visible, distanceKm, elevationGainM, segments: [[[35.0, 139.0], [35.2, 139.3]]],
})

test('shared text uses the same visible-only totals as the PNG exporter', () => {
  assert.equal(makeShareText([
    ride(true, 12.25, 500),
    ride(false, 999, 9999),
    ride(true, 3.25, 100),
  ]), [
    'サイクリング走行記録',
    'ライド数：2件',
    '総走行距離：15.5 km',
    '総獲得標高：600 m',
  ].join('\n'))
})

test('missing elevation is not reported as zero', () => {
  assert.match(makeShareText([ride(true, 7, null)]), /総獲得標高：データなし/)
  assert.match(makeShareText([ride(true, 7, 0)]), /総獲得標高：0 m/)
})

test('mixed elevation coverage is labeled as partial', () => {
  const text = makeShareText([ride(true, 10, 1234), ride(true, 5, null), ride(false, 5, 0)])
  assert.match(text, /総走行距離：15\.0 km/)
  assert.match(text, /総獲得標高：1,234 m（標高データ 1\/2件）/)
})

test('X intent preserves the editable Japanese text and special characters', () => {
  const content = 'サイクリング走行記録\n総走行距離：40.0 km #朝&夜'
  const url = new URL(xComposeUrl(content))
  assert.equal(url.hostname, 'twitter.com')
  assert.equal(url.pathname, '/intent/tweet')
  assert.equal(url.searchParams.get('text'), content)
})

test('no implicit hashtag or URL is appended', () => {
  const content = makeShareText([ride(true, 2, 3)])
  assert.ok(!content.includes('#'))
  assert.ok(!content.includes('http'))
})
