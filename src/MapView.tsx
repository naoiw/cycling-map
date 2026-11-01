import { useEffect, useRef, useState } from 'react'
import type { Ride } from './lib/parser'
import type { Point } from './lib/geo'

type LeafletWindow = Window & { L?: any }
type FocusRequest = { id: string; nonce: number } | null

export default function MapView({ rides, focus, fitAllNonce }: {
  rides: Ride[]
  focus: FocusRequest
  fitAllNonce: number
}) {
  const nodeRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const layerRef = useRef<any>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const L = (window as LeafletWindow).L
    if (!L || !nodeRef.current) { setFailed(true); return }
    const map = L.map(nodeRef.current, { zoomControl: false }).setView([36.5, 138], 5)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    }).addTo(map)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    const layer = L.layerGroup().addTo(map)
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
    const L = (window as LeafletWindow).L
    const map = mapRef.current
    const layer = layerRef.current
    if (!L || !map || !layer) return
    layer.clearLayers()
    const active = rides.filter(ride => ride.visible)
    const palette = ['#4964bd', '#ee7950', '#24a18a', '#9a68c8', '#b37a25', '#d35483', '#2379a0']
    const all: Point[] = []
    const focused: Point[] = []
    active.forEach((ride) => {
      const index = rides.findIndex(item => item.id === ride.id)
      const color = palette[index % palette.length]
      ride.segments.forEach(segment => {
        L.polyline(segment, { color, weight: 4, opacity: 0.83, lineCap: 'round' }).addTo(layer)
        all.push(...segment)
        if (focus?.id === ride.id) focused.push(...segment)
      })
    })
    const boundsPoints = focus?.id && focused.length ? focused : all
    // Only move the map for an explicit focus/fit operation or the first import.
    if (boundsPoints.length && (focus !== null || fitAllNonce > 0)) {
      const bounds = L.latLngBounds(boundsPoints)
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 14 })
    }
  }, [rides, focus, fitAllNonce])

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
