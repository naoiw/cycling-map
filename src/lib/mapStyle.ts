/** Raster basemap presentation; route overlays must remain in full color. */
export type MapStyleMode = 'color' | 'grayscale'

export const DEFAULT_MAP_STYLE: MapStyleMode = 'color'

/** Apply this only while drawing OSM tiles, never the colored routes or labels. */
export function mapTileFilter(mode: MapStyleMode): string {
  return mode === 'grayscale' ? 'grayscale(100%)' : 'none'
}
