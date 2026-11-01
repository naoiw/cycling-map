import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sampleFilenames } from '../scripts/generate-sample-index.mjs'

const entry = (name, isRegularFile = true) => ({
  name,
  isFile: () => isRegularFile,
})

test('detects four dated GPX files and sorts filenames', () => {
  assert.deepEqual(
    sampleFilenames([
      entry('251002.gpx'), entry('README.md'), entry('250101.gpx'),
      entry('251003.gpx'), entry('251001.gpx'), entry('example.gpx'), entry('index.json'),
    ]),
    ['250101.gpx', '251001.gpx', '251002.gpx', '251003.gpx'],
  )
})

test('allows zero to three files while samples are being prepared', () => {
  assert.deepEqual(sampleFilenames([]), [])
  assert.deepEqual(sampleFilenames([entry('251001.gpx')]), ['251001.gpx'])
})

test('ignores directories and filenames with unexpected format', () => {
  assert.deepEqual(
    sampleFilenames([
      entry('251001.GPX'), entry('251001.tcx'), entry('251001.gpx', false),
      entry('20251001.gpx'), entry('2511.gpx'), entry('example.gpx'),
    ]),
    [],
  )
})

test('rejects five or more sample files', () => {
  assert.throws(
    () => sampleFilenames(['250101.gpx', '250102.gpx', '250103.gpx', '250104.gpx', '250105.gpx'].map(name => entry(name))),
    /最大4件/,
  )
})
