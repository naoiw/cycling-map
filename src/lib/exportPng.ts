import {
  EXPORT_HEIGHT, EXPORT_WIDTH, exportStatistics, mapViewport, pixelFor,
  visibleExportEntries, type ExportRide, type ExportVariant, type MapRect,
} from './exportGeometry'
import { mapTileFilter, type MapStyleMode } from './mapStyle'

const TILE_SIZE = 256
const TILE_URL = 'https://tile.openstreetmap.org'

/** Load only tiles necessary to render the selected area on an explicit user export. */
function loadTile(zoom: number, x: number, y: number): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    let settled = false
    const timeout = window.setTimeout(() => finish(false), 20000)
    function finish(ok: boolean) {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      image.onload = null
      image.onerror = null
      if (ok && image.naturalWidth > 0) resolve(image)
      else reject(new Error('地図タイルを取得できませんでした。ネットワーク・CORS設定を確認してください。'))
    }
    image.onload = () => finish(true)
    image.onerror = () => finish(false)
    const world = 2 ** zoom
    const wrappedX = ((x % world) + world) % world
    image.src = TILE_URL + '/' + zoom + '/' + wrappedX + '/' + y + '.png'
  })
}

function roundedBox(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

type Tile = { x: number; y: number; left: number; top: number }

async function renderTiles(ctx: CanvasRenderingContext2D, rect: MapRect, view: ReturnType<typeof mapViewport>) {
  const fromX = Math.floor(view.originX / TILE_SIZE)
  const toX = Math.ceil((view.originX + rect.width) / TILE_SIZE)
  const fromY = Math.max(0, Math.floor(view.originY / TILE_SIZE))
  const toY = Math.min(2 ** view.zoom, Math.ceil((view.originY + rect.height) / TILE_SIZE))
  const tiles: Tile[] = []
  for (let y = fromY; y < toY; y++) {
    for (let x = fromX; x < toX; x++) {
      tiles.push({ x, y, left: rect.x + x * TILE_SIZE - view.originX, top: rect.y + y * TILE_SIZE - view.originY })
    }
  }
  if (!tiles.length || tiles.length > 72) throw new Error('地図画像の描画範囲が大きすぎます。')
  // Small batches avoid bursts of downloads on the community-funded tile service.
  for (let index = 0; index < tiles.length; index += 4) {
    await Promise.all(tiles.slice(index, index + 4).map(async tile => {
      const image = await loadTile(view.zoom, tile.x, tile.y)
      ctx.drawImage(image, tile.left, tile.top, TILE_SIZE, TILE_SIZE)
    }))
  }
}

function drawRoutes(
  ctx: CanvasRenderingContext2D, rect: MapRect, view: ReturnType<typeof mapViewport>,
  entries: ReturnType<typeof visibleExportEntries>,
) {
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  for (const { ride, color } of entries) {
    for (const segment of ride.segments) {
      if (segment.length < 2) continue
      ctx.beginPath()
      segment.forEach(([lat, lon], i) => {
        const [px, py] = pixelFor(lat, lon, view)
        if (i === 0) ctx.moveTo(rect.x + px, rect.y + py)
        else ctx.lineTo(rect.x + px, rect.y + py)
      })
      ctx.lineWidth = 9
      ctx.strokeStyle = 'rgba(12, 26, 42, 0.8)'
      ctx.stroke()
      ctx.lineWidth = 5.5
      ctx.strokeStyle = color
      ctx.stroke()
    }
  }
}

function statsCard(ctx: CanvasRenderingContext2D, x: number, width: number, title: string, value: string, note = '') {
  roundedBox(ctx, x, 102, width, 106, 13)
  ctx.fillStyle = '#172337'
  ctx.fill()
  ctx.strokeStyle = '#304157'
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.fillStyle = '#a0b2c8'
  ctx.font = '600 21px system-ui, sans-serif'
  ctx.fillText(title, x + 22, 136)
  ctx.fillStyle = '#edf3fb'
  ctx.font = '700 35px system-ui, sans-serif'
  ctx.fillText(value, x + 22, 184)
  if (note) {
    ctx.font = '500 16px system-ui, sans-serif'
    ctx.fillStyle = '#a0b2c8'
    ctx.fillText(note, x + width - ctx.measureText(note).width - 18, 136)
  }
}

/** Returns a PNG Blob; callers can download it (#10) or share it (#11). */
export async function generateRidePng(
  rides: readonly ExportRide[], colors: readonly string[], variant: ExportVariant,
  mapStyle: MapStyleMode,
): Promise<Blob> {
  const entries = visibleExportEntries(rides, colors)
  if (!entries.length) throw new Error('表示中の走行記録がありません。')
  const canvas = document.createElement('canvas')
  canvas.width = EXPORT_WIDTH
  canvas.height = EXPORT_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('ブラウザで画像を生成できません。')

  ctx.fillStyle = '#0b1220'
  ctx.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT)
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#edf3fb'
  ctx.font = '800 37px system-ui, sans-serif'
  ctx.fillText('CYCLING MAP', 40, 48)
  ctx.font = '500 19px system-ui, sans-serif'
  ctx.fillStyle = '#a0b2c8'
  ctx.fillText(variant === 'stats' ? '走行記録サマリー' : '走行経路', 345, 48)

  if (variant === 'stats') {
    const stats = exportStatistics(rides)
    const cardWidth = 492
    statsCard(ctx, 40, cardWidth, 'ライド数', stats.rideCount + ' 件')
    statsCard(ctx, 554, cardWidth, '総走行距離', stats.distance)
    statsCard(ctx, 1068, cardWidth, '総獲得標高', stats.elevation, stats.elevationNote)
  }

  const rect: MapRect = variant === 'stats'
    ? { x: 40, y: 230, width: 1520, height: 628 }
    : { x: 40, y: 96, width: 1520, height: 762 }
  const view = mapViewport(entries, rect)

  ctx.save()
  roundedBox(ctx, rect.x, rect.y, rect.width, rect.height, 15)
  ctx.clip()
  ctx.fillStyle = '#e9eff6'
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height)

  // CORS-enabled images are required to keep the PNG canvas readable.
  // Any failed tile rejects the entire export; never save a partial basemap.
  ctx.save()
  try {
    // Canvas filter applies only to OSM raster tiles. Route lines and attribution stay colored.
    ctx.filter = mapTileFilter(mapStyle)
    await renderTiles(ctx, rect, view)
  } finally {
    ctx.restore()
  }
  drawRoutes(ctx, rect, view, entries)

  const attribution = '© OpenStreetMap contributors · openstreetmap.org/copyright'
  ctx.font = '500 17px system-ui, sans-serif'
  const creditWidth = ctx.measureText(attribution).width + 24
  const creditX = rect.x + rect.width - creditWidth
  const creditY = rect.y + rect.height - 37
  ctx.fillStyle = 'rgba(255,255,255,0.94)'
  ctx.fillRect(creditX, creditY, creditWidth, 37)
  ctx.fillStyle = '#20364a'
  ctx.fillText(attribution, creditX + 12, creditY + 19)
  ctx.restore()

  return new Promise<Blob>((resolve, reject) => {
    try {
      canvas.toBlob(blob => {
        if (blob && blob.type === 'image/png' && blob.size > 0) resolve(blob)
        else reject(new Error('PNG画像の生成に失敗しました。'))
      }, 'image/png')
    } catch {
      reject(new Error('画像を保存できませんでした。地図タイルのCORS設定を確認してください。'))
    }
  })
}

/** Explicit user-triggered download; no route data is uploaded. */
export function downloadPng(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  // Give mobile browsers time to take ownership of the blob URL.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
