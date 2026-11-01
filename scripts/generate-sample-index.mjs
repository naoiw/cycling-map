import { readdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const sampleDir = fileURLToPath(new URL('../public/samples/', import.meta.url))
const maxSamples = 4

/** Pick up GPX files named YYMMDD.gpx; ignore unrelated files. */
export function sampleFilenames(entries) {
  const names = entries
    .filter(entry => entry.isFile() && /^\d{6}\.gpx$/.test(entry.name))
    .map(entry => entry.name)
    .sort()
  if (names.length > maxSamples) {
    throw new Error('サンプルGPXは最大4件です（現在' + names.length + '件）。public/samples/ を確認してください。')
  }
  return names
}

export async function generateSampleIndex() {
  const entries = await readdir(sampleDir, { withFileTypes: true })
  const files = sampleFilenames(entries)
  await writeFile(resolve(sampleDir, 'index.json'), JSON.stringify({ files }, null, 2) + '\n')
  console.log('Sample GPX index: ' + files.length + ' file(s)')
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await generateSampleIndex()
}
