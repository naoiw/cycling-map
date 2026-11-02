/** Colors used for the fixed, per-ride distance/elevation classifications. */
export type ColorMode = 'default' | 'distance' | 'elevation'

export const COLOR_BANDS = [
  { name: '水色', color: '#38BDF8', distance: '0～50 km未満', elevation: '0～500 m未満' },
  { name: '緑', color: '#22C55E', distance: '50～100 km未満', elevation: '500～1,000 m未満' },
  { name: '黄', color: '#EAB308', distance: '100～150 km未満', elevation: '1,000～1,500 m未満' },
  { name: 'オレンジ', color: '#F97316', distance: '150～200 km未満', elevation: '1,500～2,000 m未満' },
  { name: '赤', color: '#EF4444', distance: '200 km以上', elevation: '2,000 m以上' },
] as const

export const UNKNOWN_COLOR = '#94A3B8'
const DEFAULT_COLORS = ['#4964bd', '#ee7950', '#24a18a', '#9a68c8', '#b37a25', '#d35483', '#2379a0'] as const

/** Preserves the existing automatic palette, including on initial page load. */
export function rideColor(index: number): string {
  return DEFAULT_COLORS[index % DEFAULT_COLORS.length]
}

/** Return an index into the five color bands, or null for missing/invalid data. */
export function colorBandIndex(value: number | null, increment: number): number | null {
  if (value === null || !Number.isFinite(value) || value < 0) return null
  return Math.min(COLOR_BANDS.length - 1, Math.floor(value / increment))
}

type ColorableRide = {
  distanceKm: number
  elevationGainM: number | null
}

/** Single source of truth for line colors and list markers. Manual color wins. */
export function resolveRideColor(
  ride: ColorableRide,
  index: number,
  mode: ColorMode,
  manualColor: string | null = null,
): string {
  const selected = COLOR_BANDS.find(band => band.color === manualColor)
  if (selected) return selected.color

  if (mode === 'default') return rideColor(index)
  const bandIndex = mode === 'distance'
    ? colorBandIndex(ride.distanceKm, 50)
    : colorBandIndex(ride.elevationGainM, 500)
  return bandIndex === null ? UNKNOWN_COLOR : COLOR_BANDS[bandIndex].color
}
