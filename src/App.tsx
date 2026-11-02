import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import MapView from './MapView'
import { parseRide, type Ride } from './lib/parser'
import { COLOR_BANDS, UNKNOWN_COLOR, resolveRideColor, type ColorMode } from './lib/rideColors'
import { summarizeVisibleRides } from './lib/rideStats'
import { downloadPng, generateRidePng } from './lib/exportPng'
import { exportFilename, type ExportVariant } from './lib/exportGeometry'
import { makeShareText, xComposeUrl } from './lib/shareRide'

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
  const [colorMode, setColorMode] = useState<ColorMode>('default')
  const [manualColors, setManualColors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const exportLock = useRef(false)
  const shareRequest = useRef(0)
  const shareTextRef = useRef<HTMLTextAreaElement>(null)
  const [exporting, setExporting] = useState<ExportVariant | null>(null)
  const [exportError, setExportError] = useState('')
  const [shareBusy, setShareBusy] = useState(false)
  const [shareDraft, setShareDraft] = useState<{ image: Blob; filename: string } | null>(null)
  const [shareText, setShareText] = useState('')
  const [shareError, setShareError] = useState('')
  const [shareNotice, setShareNotice] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [focus, setFocus] = useState<{ id: string; nonce: number } | null>(null)
  const [fitAllNonce, setFitAllNonce] = useState(0)
  const stats = useMemo(() => summarizeVisibleRides(rides), [rides])
  const routeColors = useMemo(
    () => rides.map((ride, index) => resolveRideColor(ride, index, colorMode, manualColors[ride.id] ?? null)),
    [rides, colorMode, manualColors],
  )
  // Never offer a stale screenshot or figures after tracks, visibility or colors change.
  useEffect(() => {
    shareRequest.current += 1
    setShareDraft(null)
    setShareText('')
    setShareError('')
    setShareNotice('')
  }, [rides, routeColors])

  const nativeShareAvailable = useMemo(() => {
    if (!shareDraft || typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return false
    try {
      const file = new File([shareDraft.image], shareDraft.filename, { type: 'image/png' })
      return navigator.canShare({ files: [file] })
    } catch {
      return false
    }
  }, [shareDraft])

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
      // The index is generated when the app is built from public/samples/YYMMDD.gpx.
      const base = import.meta.env.BASE_URL + 'samples/'
      const indexResponse = await fetch(base + 'index.json', { cache: 'no-store' })
      if (!indexResponse.ok) throw new Error('サンプル一覧を取得できませんでした。')
      const index: unknown = await indexResponse.json()
      if (!index || typeof index !== 'object' || !('files' in index)) {
        throw new Error('サンプル一覧の形式が正しくありません。')
      }

      const names = index.files
      if (!Array.isArray(names) || names.length > 4 ||
        !names.every((name): name is string => typeof name === 'string' && /^\d{6}\.gpx$/.test(name)) ||
        new Set(names).size !== names.length) {
        throw new Error('サンプル一覧の形式が正しくありません。')
      }
      if (names.length === 0) {
        throw new Error('サンプルGPXはまだ登録されていません。public/samples/ に yymmdd.gpx 形式で配置してください。')
      }

      return Promise.all(names.map(async name => {
        const response = await fetch(base + name)
        if (!response.ok) throw new Error(name + ': サンプルGPXを取得できませんでした。')
        const contents = await response.text()
        return new File([contents], name, { type: 'application/gpx+xml', lastModified: 0 })
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

  async function savePng(variant: ExportVariant) {
    if (exportLock.current || !rides.some(ride => ride.visible)) return
    exportLock.current = true
    setExporting(variant)
    setExportError('')
    try {
      const blob = await generateRidePng(rides, routeColors, variant)
      downloadPng(blob, exportFilename(variant, new Date()))
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'PNGの保存に失敗しました。')
    } finally {
      exportLock.current = false
      setExporting(null)
    }
  }

  async function prepareXShare() {
    if (exportLock.current || !rides.some(ride => ride.visible)) return
    exportLock.current = true
    const request = ++shareRequest.current
    setShareBusy(true)
    setShareDraft(null)
    setShareError('')
    setShareNotice('')
    try {
      // Screenshot and text are generated from the same snapshot of visible rides.
      const text = makeShareText(rides)
      const image = await generateRidePng(rides, routeColors, 'map')
      if (request !== shareRequest.current) return
      setShareText(text)
      setShareDraft({ image, filename: exportFilename('map', new Date()) })
    } catch (error) {
      if (request === shareRequest.current) {
        setShareError(error instanceof Error ? error.message : '共有画像の生成に失敗しました。')
      }
    } finally {
      exportLock.current = false
      setShareBusy(false)
    }
  }

  async function sharePngAndText() {
    if (!shareDraft || !nativeShareAvailable) return
    const file = new File([shareDraft.image], shareDraft.filename, { type: 'image/png' })
    setShareError('')
    setShareNotice('')
    try {
      // Share must be invoked directly from this click, not after async PNG generation.
      await navigator.share({ files: [file], text: shareText })
      setShareNotice('共有メニューからの操作が完了しました。')
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setShareNotice('共有操作をキャンセルしました。')
      } else {
        setShareError('画像付き共有に失敗しました。下の画像保存と本文コピーを利用してください。')
      }
    }
  }

  async function copyShareText() {
    setShareError('')
    setShareNotice('')
    try {
      await navigator.clipboard.writeText(shareText)
      setShareNotice('投稿本文をコピーしました。')
    } catch {
      shareTextRef.current?.focus()
      shareTextRef.current?.select()
      setShareNotice('本文を選択しました。コピーしてXの投稿画面に貼り付けてください。')
    }
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
    setManualColors(previous => {
      const next = { ...previous }
      delete next[id]
      return next
    })
    setFocus(null)
  }
  function selectManualColor(id: string, color: string) {
    setManualColors(previous => {
      const next = { ...previous }
      if (COLOR_BANDS.some(band => band.color === color)) next[id] = color
      else delete next[id]
      return next
    })
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
            <div className="stat"><span className="stat-label">表示中の獲得標高</span><strong>{stats.elevationDataCount > 0 ? stats.visibleElevationGain.toLocaleString('ja-JP') : '—'}<small> m</small></strong><span className="stat-sub">{stats.elevationDataCount > 0 ? `${stats.elevationDataCount} 件の標高データを集計` : '標高データなし'}</span></div>
            <div className="stat"><span className="stat-label">表示中の走行距離</span><strong>{km(stats.visibleDistance)}<small> km</small></strong><span className="stat-sub">{stats.visibleCount} 件を地図に表示</span></div>
          </section>
          <div className="workspace">
            <section className="panel map-panel" aria-labelledby="map-title">
              <div className="panel-top">
                <div><p className="section-kicker">ROUTE MAP</p><h2 id="map-title">走行経路</h2></div>
                <button className="button button--secondary" disabled={!stats.visibleCount} onClick={() => { setFocus(null); setFitAllNonce(value => value + 1) }} type="button">全経路に合わせる</button>
              </div>
              <div className="color-controls" role="group" aria-label="経路の自動色分け">
                <span className="color-controls-label">経路の色分け</span>
                <div className="color-mode-buttons">
                  <button className={'color-mode-button' + (colorMode === 'distance' ? ' is-active' : '')} type="button" aria-pressed={colorMode === 'distance'} onClick={() => setColorMode(current => current === 'distance' ? 'default' : 'distance')}>距離別</button>
                  <button className={'color-mode-button' + (colorMode === 'elevation' ? ' is-active' : '')} type="button" aria-pressed={colorMode === 'elevation'} onClick={() => setColorMode(current => current === 'elevation' ? 'default' : 'elevation')}>獲得標高別</button>
                </div>
              </div>
              {colorMode !== 'default' && (
                <div className="color-legend" aria-label={colorMode === 'distance' ? '走行距離の色分け凡例' : '獲得標高の色分け凡例'}>
                  {COLOR_BANDS.map(band => (
                    <span className="color-legend-item" key={band.color}>
                      <span className="color-swatch" style={{ backgroundColor: band.color }} aria-hidden="true" />
                      {colorMode === 'distance' ? band.distance : band.elevation}
                    </span>
                  ))}
                  {colorMode === 'elevation' && (
                    <span className="color-legend-item">
                      <span className="color-swatch" style={{ backgroundColor: UNKNOWN_COLOR }} aria-hidden="true" />
                      標高データなし
                    </span>
                  )}
                </div>
              )}
              <MapView rides={rides} colors={routeColors} focus={focus} fitAllNonce={fitAllNonce} />
              <div className="map-footer"><span>OpenStreetMap / Leaflet</span><span>表示中の記録を地図に重ねて描画</span></div>
              <div className="export-controls" aria-label="走行経路の画像保存">
                <button className="button button--secondary" type="button" disabled={!stats.visibleCount || exporting !== null || shareBusy} onClick={() => { void savePng('map') }}>
                  {exporting === 'map' ? 'PNG生成中…' : '地図をPNG保存'}
                </button>
                <button className="button button--secondary" type="button" disabled={!stats.visibleCount || exporting !== null || shareBusy} onClick={() => { void savePng('stats') }}>
                  {exporting === 'stats' ? 'PNG生成中…' : '統計付きPNG保存'}
                </button>
              </div>
              {exportError && <p className="export-error" role="alert">{exportError}</p>}
              <p className="export-note">表示中の経路のみ保存します。画像には位置情報が含まれます。</p>
              <section className="share-section" aria-label="Xへの走行記録共有">
                <div className="share-section-header">
                  <div>
                    <span className="share-kicker">SHARE</span>
                    <h3>Xで共有</h3>
                  </div>
                  <button type="button" className="button button--primary" disabled={!stats.visibleCount || shareBusy || exporting !== null} onClick={() => { void prepareXShare() }}>
                    {shareBusy ? '共有画像を生成中…' : 'Xで共有'}
                  </button>
                </div>
                <p className="share-privacy">公開すると自宅周辺などの経路・行動範囲が分かる可能性があります。投稿前に画像と本文を確認してください。</p>
                {shareError && <p className="export-error share-alert" role="alert">{shareError}</p>}
                {shareDraft && (
                  <div className="share-draft">
                    <label htmlFor="share-post-text">投稿本文（編集できます）</label>
                    <textarea id="share-post-text" ref={shareTextRef} rows={5} value={shareText} onChange={event => { setShareText(event.target.value); setShareNotice('') }} />
                    <p className="share-hint">画像は「地図のみ」のPNGです。本文と画像は作成時点の表示中ライドを対象にしています。</p>
                    <div className="share-actions">
                      {nativeShareAvailable && (
                        <button type="button" className="button button--primary" onClick={() => { void sharePngAndText() }}>画像と本文を共有</button>
                      )}
                      <button type="button" className="button button--secondary" onClick={() => downloadPng(shareDraft.image, shareDraft.filename)}>共有用PNGを保存</button>
                      <button type="button" className="button button--secondary" onClick={() => { void copyShareText() }}>本文をコピー</button>
                      <a className="button button--secondary" href={xComposeUrl(shareText)} target="_blank" rel="noopener noreferrer">Xの投稿画面を開く</a>
                    </div>
                    <p className="share-hint">{nativeShareAvailable
                      ? '端末の共有メニューからXを選択できます。Xが共有先に表示されるかは端末によって異なります。'
                      : '画像の自動添付には対応していない環境です。PNGを保存してXの投稿画面で手動添付してください。'}</p>
                    {shareNotice && <p className="share-notice" role="status">{shareNotice}</p>}
                  </div>
                )}
              </section>
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
                          <span className="ride-dot" style={{ backgroundColor: routeColors[rides.indexOf(ride)] }} />
                        </label>
                        <div className="ride-content">
                          <button className="ride-title" type="button" onClick={() => { if (!ride.visible) setRides(previous => previous.map(item => item.id === ride.id ? { ...item, visible: true } : item)); setFocus({ id: ride.id, nonce: ++focusNonceRef.current }) }}>{ride.name}</button>
                          <div className="ride-date">{dateLabel(ride.date)} <span className="format-tag">{ride.format}</span></div>
                          <div className="ride-meta"><strong>{km(ride.distanceKm)} km</strong><span>{durationLabel(ride.durationSeconds)}</span></div>
                          <div className="ride-extra">{ride.pointCount.toLocaleString('ja-JP')} ポイント{ride.elevationGainM !== null ? ' / 獲得標高 ' + ride.elevationGainM.toLocaleString('ja-JP') + ' m' : ''}</div>
                          <label className="ride-color-control">
                            <span>経路色</span>
                            <select value={manualColors[ride.id] ?? ''} onChange={event => selectManualColor(ride.id, event.target.value)} aria-label={ride.name + 'の経路色'}>
                              <option value="">自動／既定色に従う</option>
                              {COLOR_BANDS.map(band => <option key={band.color} value={band.color}>{band.name}</option>)}
                            </select>
                          </label>
                        </div>
                        <button className="remove-button" type="button" onClick={() => remove(ride.id)} aria-label={ride.name + 'を削除'} title="この記録を削除">×</button>
                      </li>
                    ))}
                  </ul>
                )}
                {rides.length > 0 && <button className="clear-button" type="button" onClick={() => { if (window.confirm('読み込んだ走行記録をすべて削除しますか？')) { setRides([]); setManualColors({}); setFocus(null); setErrors([]) } }}>すべて削除</button>}
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
