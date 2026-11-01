/** Shared palette for route lines and activity-list markers. */
const RIDE_COLORS = ['#4964bd', '#ee7950', '#24a18a', '#9a68c8', '#b37a25', '#d35483', '#2379a0'] as const

export function rideColor(index: number): string {
  return RIDE_COLORS[index % RIDE_COLORS.length]
}
