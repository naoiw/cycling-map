import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DEFAULT_MAP_STYLE, mapTileFilter } from './dist/mapStyle.js'

test('color is the initial basemap mode, without changing the route palette', () => {
  assert.equal(DEFAULT_MAP_STYLE, 'color')
  assert.equal(mapTileFilter('grayscale'), 'grayscale(100%)')
  assert.equal(mapTileFilter('color'), 'none')
})

test('grayscale is applied only to Leaflet raster tile pane', () => {
  const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
  assert.match(css, /\.map-surface--grayscale\s+\.leaflet-tile-pane\s*\{\s*filter:\s*grayscale\(100%\)/)
  assert.doesNotMatch(css, /\.leaflet-overlay-pane\s*\{\s*filter:\s*grayscale\(100%\)/)
  assert.doesNotMatch(css, /\.leaflet-map\s*\{\s*filter:\s*grayscale\(100%\)/)
})

test('background mode buttons precede route color controls in the map panel', () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
  const background = app.indexOf('<div className="map-style-controls"')
  const route = app.indexOf('<div className="color-controls"')
  const map = app.indexOf('<MapView ')
  assert.ok(background > -1 && route > -1 && map > -1)
  assert.ok(background < route && route < map)
})
