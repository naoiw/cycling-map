import { useEffect, useRef, useState } from 'react'
import type { Ride } from './lib/parser'
import type { Point } from './lib/geo'

/** The small subset of the globally loaded Leaflet API needed by this component. */
interface MapBounds {
  extend(point: Point): MapBounds
  isValid(): boolean
}
interface MapHandle {
  setView(center: Point, zoom: number): void
  fitBounds(bounds: MapBounds, options: { padding: Point; maxZoom: number }): void
  remove(): void
}
interface LayerGroup {
  addTo(map: MapHandle): void
  clearLayers(): void
}
interface LeafletApi {
  map(element: HTMLElement, options: { zoomControl: boolean }): MapHandle
  tileLayer(url: string, options: { maxZoom: number; attribution: string }): { addTo(map: MapHandle): void }
  control: { zoom(options: { position: string }): { addTo(map: MapHandle): void } }
  layerGroup(): LayerGroup
  polyline(points: Point[], options: {
    color: string; weight: number; opacity: number; lineCap: string
  }): { addTo(layer: LayerGroup): void }
  latLngBounds(points: Point[]): MapBounds
}
type FocusRequest = { id: string; nonce: number } | null

function leaflet(): LeafletApi | undefined {
  return (window as Window & { L?: LeafletApi }).L
}

export default function MapView({ rides, colors, focus, fitAllNonce }: {
  rides: Ride[]
  colors: readonly string[]
  focus: FocusRequest
  fitAllNonce: number
}) {
  const nodeRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapHandle | null>(null)
  const layerRef = useRef<LayerGroup | null>(null)
  const lastViewportRef = useRef({ focusNonce: 0, fitAllNonce: 0 })
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const L = leaflet()
    if (!L || !nodeRef.current) {
      setFailed(true)
      return
    }

    const map = L.map(nodeRef.current, { zoomControl: false })
    map.setView([36.5, 138], 5)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    }).addTo(map)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    const layer = L.layerGroup()
    layer.addTo(map)
    mapRef.current = map
    layerRef.current = layer
    setReady(true)

    return () => {
      layer.clearLayers()
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
  }, [])

  useEffect(() => {
    const L = leaflet()
    const map = mapRef.current
    const layer = layerRef.current
    if (!L || !map || !layer) return

    layer.clearLayers()
    const allBounds = L.latLngBounds([])
    const focusBounds = L.latLngBounds([])
    rides.forEach((ride, index) => {
      if (!ride.visible) return
      for (const segment of ride.segments) {
        L.polyline(segment, { color: colors[index], weight: 4, opacity: 0.83, lineCap: 'round' }).addTo(layer)
        // Extend the bounds incrementally: spreading tens of thousands of points
        // into an array push can exceed the JS engine's argument limit.
        for (const point of segment) {
          allBounds.extend(point)
          if (focus?.id === ride.id) focusBounds.extend(point)
        }
      }
    })

    // Re-rendering lines must not reset a map position adjusted by the user.
    // Fit only for a new import / explicit "show all" or a newly requested focus.
    const last = lastViewportRef.current
    const fitRequested = fitAllNonce !== last.fitAllNonce
    const focusRequested = focus !== null && focus.nonce !== last.focusNonce
    if (fitRequested || focusRequested) {
      const bounds = focusRequested && focusBounds.isValid() ? focusBounds : allBounds
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [32, 32], maxZoom: 14 })
    }
    lastViewportRef.current = { focusNonce: focus?.nonce ?? last.focusNonce, fitAllNonce }
  }, [rides, colors, focus, fitAllNonce])

  return (
    <div className="map-surface">
      <div ref={nodeRef} className="leaflet-map" aria-label="走行経路を表示する地図" />
      {!ready && (
        <div className="map-state" role={failed ? 'alert' : 'status'}>
          {failed ? '地図ライブラリを読み込めませんでした。ネットワーク接続を確認してください。' : '地図を準備しています…'}
        </div>
      )}
      {ready && rides.length === 0 && (
        <div className="map-empty">GPX / TCX ファイルを読み込むと、ここに経路を表示します。</div>
      )}
    </div>
  )
}
