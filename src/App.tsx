import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import MapView from './MapView'
import { parseRide, type Ride } from './lib/parser'
import { rideColor } from './lib/rideColors'

const dateLabel = (date: string | null) => date
  ? new Date(date).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  : '日時情報なし'
const km = (value: number) => value.toLocaleString('ja-JP', { maximumFractionDigits: 1, minimumFractionDigits: 1 })
function durationLabel(seconds: number | null) {
  if (seconds === null) return '時間情報なし'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return hours ? String(hours) + '時間' + String(minutes) + '分' : String(minutes) + '分'
}

function App() {
  const inputRef = useRef<HTMLInputElement>(null)
  const importingRef = useRef(false)
  const focusNonceRef = useRef(0)
  const [rides, setRides] = useState<Ride[]>([])
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [focus, setFocus] = useState<{ id: string; nonce: number } | null>(null)
  const [fitAllNonce, setFitAllNonce] = useState(0)
  const stats = useMemo(() => {
    const visible = rides.filter(ride => ride.visible)
    return {
      distance: rides.reduce((total, ride) => total + ride.distanceKm, 0),
      visibleDistance: visible.reduce((total, ride) => total + ride.distanceKm, 0),
      visibleCount: visible.length,
    }
  }, [rides])
  const sorted = useMemo(() => [...rides].sort((a, b) => {
    if (a.date === null) return 1
    if (b.date === null) return -1
    return b.date.localeCompare(a.date)
  }), [rides])

  /**
   * Keep the async sample fetch and local file parsing under a single lock.
   * State alone cannot prevent double clicks before React renders again.
   */
  async function importFiles(source: File[] | (() => Promise<File[]>)) {
    if (importingRef.current) return
    importingRef.current = true
    setBusy(true)
    const issues: string[] = []
    try {
      const files = typeof source === 'function' ? await source() : source
      if (!files.length) return

      const next: Ride[] = []
      const existing = new Set(rides.map(ride => ride.id))
      for (const file of files) {
        const id = file.name + ':' + String(file.size) + ':' + String(file.lastModified)
        if (existing.has(id)) {
          issues.push(file.name + ': 読み込み済みです。')
          continue
        }
        if (!/\.(gpx|tcx)$/i.test(file.name)) {
          issues.push(file.name + ': GPX/TCXファイルを指定してください。')
          continue
        }
        try {
          const ride = parseRide(await file.text(), file.name, id)
          next.push(ride)
          existing.add(id)
        } catch (error) {
          issues.push(file.name + ': ' + (error instanceof Error ? error.message : '読み込みに失敗しました。'))
        }
      }
      if (next.length) {
        setRides(previous => [...previous, ...next])
        setFocus(null)
        setFitAllNonce(value => value + 1)
      }
    } catch (error) {
      issues.push(error instanceof Error ? error.message : '読み込みに失敗しました。')
    } finally {
      setErrors(issues)
      importingRef.current = false
      setBusy(false)
    }
  }

  function loadSample() {
    void importFiles(async () => {
      const paths = ['samples/example.gpx', 'samples/example.tcx']
      return Promise.all(paths.map(async path => {
        const response = await fetch(import.meta.env.BASE_URL + path)
        if (!response.ok) throw new Error('サンプルファイルの取得に失敗しました。')
        const contents = await response.text()
        return new File([contents], path.split('/').pop()!, {
          type: 'application/xml',
          lastModified: 0,
        })
      }))
    })
  }

  const onInput = (event: ChangeEvent<HTMLInputElement>) => {
    void importFiles(Array.from(event.target.files ?? []))
    event.target.value = ''
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    void importFiles(Array.from(event.dataTransfer.files))
  }

  function toggle(id: string) {
    setRides(previous => previous.map(ride => ride.id === id ? { ...ride, visible: !ride.visible } : ride))
    setFocus(null)
  }
  function setAll(visible: boolean) {
    setRides(previous => previous.map(ride => ({ ...ride, visible })))
    setFocus(null)
  }
  function remove(id: string) {
    setRides(previous => previous.filter(ride => ride.id !== id))
    setFocus(null)
  }

  return (
    <div className="site-shell">
      <div className="page-container">
        <header className="site-header">
          <div className="site-brand">
            <span className="brand-mark" aria-hidden="true">↗</span>
            <span>CYCLING MAP</span>
          </div>
          <span className="header-caption">ACTIVITY VIEWER</span>
        </header>
        <main className="site-main">
          <section className="page-intro" aria-labelledby="page-title">
            <p className="section-kicker">RIDE HISTORY</p>
            <h1 id="page-title">サイクリング走行ログ</h1>
            <p className="page-description">GPX・TCXファイルの軌跡を地図に重ねて表示します。</p>
          </section>
          <section className="stats-grid" aria-label="読み込みデータの集計">
            <div className="stat"><span className="stat-label">読み込み件数</span><strong>{rides.length}<small> 件</small></strong></div>
            <div className="stat"><span className="stat-label">総走行距離</span><strong>{km(stats.distance)}<small> km</small></strong></div>
            <div className="stat"><span className="stat-label">表示中の走行距離</span><strong>{km(stats.visibleDistance)}<small> km</small></strong><span className="stat-sub">{stats.visibleCount} 件を地図に表示</span></div>
          </section>
          <div className="workspace">
            <section className="panel map-panel" aria-labelledby="map-title">
              <div className="panel-top">
                <div><p className="section-kicker">ROUTE MAP</p><h2 id="map-title">走行経路</h2></div>
                <button className="button button--secondary" disabled={!stats.visibleCount} onClick={() => { setFocus(null); setFitAllNonce(value => value + 1) }} type="button">全経路に合わせる</button>
              </div>
              <MapView rides={rides} focus={focus} fitAllNonce={fitAllNonce} />
              <div className="map-footer"><span>OpenStreetMap / Leaflet</span><span>表示中の記録を地図に重ねて描画</span></div>
            </section>
            <aside className="panel side-panel" aria-label="ファイルと走行記録">
              <section className="side-section">
                <p className="section-kicker">01 / IMPORT</p>
                <h2>走行ログを追加</h2>
                <div className="drop-zone" onDragOver={event => event.preventDefault()} onDrop={onDrop}>
                  <div className="upload-symbol" aria-hidden="true">↑</div>
                  <strong>GPX / TCX ファイル</strong>
                  <p>ここにドラッグ＆ドロップ、またはファイルを選択</p>
                  <input ref={inputRef} type="file" accept=".gpx,.tcx" multiple onChange={onInput} className="visually-hidden" aria-label="GPXまたはTCXファイルを選択" />
                  <button type="button" className="button button--primary" onClick={() => inputRef.current?.click()} disabled={busy}>{busy ? '読み込み中…' : 'ファイルを選択'}</button>
                </div>
                <button type="button" className="sample-button" onClick={loadSample} disabled={busy}>サンプルの経路を表示</button>
                <p className="privacy-note">ファイルはこのブラウザ内で処理され、サーバーに送信しません。再読み込みすると表示内容は消去されます。</p>
                {errors.length > 0 && <div className="errors" role="alert">{errors.map((message, i) => <p key={i}>{message}</p>)}</div>}
              </section>
              <section className="side-section">
                <div className="activity-heading">
                  <div><p className="section-kicker">02 / ACTIVITIES</p><h2>走行記録 <span>({rides.length})</span></h2></div>
                  <div className="activity-tools">
                    <button type="button" onClick={() => setAll(true)} disabled={!rides.length}>全表示</button>
                    <button type="button" onClick={() => setAll(false)} disabled={!rides.length}>全非表示</button>
                  </div>
                </div>
                {rides.length === 0 ? <div className="empty-list">まだ走行記録はありません。<br />ファイルを追加してください。</div> : (
                  <ul className="ride-list">
                    {sorted.map((ride) => (
                      <li key={ride.id} className={'ride-item' + (ride.visible ? '' : ' muted-ride')}>
                        <label className="ride-check">
                          <input type="checkbox" checked={ride.visible} onChange={() => toggle(ride.id)} aria-label={ride.name + 'を地図に表示'} />
                          <span className="ride-dot" style={{ backgroundColor: rideColor(rides.findIndex(item => item.id === ride.id)) }} />
                        </label>
                        <div className="ride-content">
                          <button className="ride-title" type="button" onClick={() => { if (!ride.visible) setRides(previous => previous.map(item => item.id === ride.id ? { ...item, visible: true } : item)); setFocus({ id: ride.id, nonce: ++focusNonceRef.current }) }}>{ride.name}</button>
                          <div className="ride-date">{dateLabel(ride.date)} <span className="format-tag">{ride.format}</span></div>
                          <div className="ride-meta"><strong>{km(ride.distanceKm)} km</strong><span>{durationLabel(ride.durationSeconds)}</span></div>
                          <div className="ride-extra">{ride.pointCount.toLocaleString('ja-JP')} ポイント{ride.elevationGainM !== null ? ' / 累積上昇 ' + ride.elevationGainM.toLocaleString('ja-JP') + ' m' : ''}</div>
                        </div>
                        <button className="remove-button" type="button" onClick={() => remove(ride.id)} aria-label={ride.name + 'を削除'} title="この記録を削除">×</button>
                      </li>
                    ))}
                  </ul>
                )}
                {rides.length > 0 && <button className="clear-button" type="button" onClick={() => { if (window.confirm('読み込んだ走行記録をすべて削除しますか？')) { setRides([]); setFocus(null); setErrors([]) } }}>すべて削除</button>}
              </section>
            </aside>
          </div>
        <p className="bottom-note">距離はGPS座標から算出した概算値です。記録の欠落、GPS誤差、異なるセグメント間の移動などは反映されません。日時・経過時間はファイルに記録されている場合のみ表示されます。</p>
        </main>
        <footer className="site-footer">
          <span>CYCLING MAP</span>
          <a href="https://github.com/naoiw/cycling-map" target="_blank" rel="noopener noreferrer" aria-label="GitHubでソースコードを開く">GitHub ↗</a>
        </footer>
      </div>
    </div>
  )
}
export default App
