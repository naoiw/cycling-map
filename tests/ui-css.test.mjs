import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const stylesheet = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

test('the shared site chrome remains on the dark design system', () => {
  assert.match(stylesheet, /color-scheme:\s*dark\s*;/)
  assert.match(stylesheet, /--canvas:\s*#0b1220\s*;/)
  assert.match(stylesheet, /--accent:\s*#70ddc7\s*;/)
  assert.match(stylesheet, /--chrome-width:\s*1180px\s*;/)
  assert.match(stylesheet, /--chrome-gutter:\s*28px\s*;/)
  assert.doesNotMatch(stylesheet, /background:\s*#f6f7fb\s*;/)
  assert.match(html, /name="theme-color"\s+content="#0b1220"/)
})

test('the dark CSS contains the app layout and map panel styles', () => {
  for (const selector of ['.page-container', '.site-brand', '.site-main', '.site-footer', '.stats-grid', '.panel', '.map-surface']) {
    assert.ok(stylesheet.includes(selector), selector + ' style must exist')
  }
})
