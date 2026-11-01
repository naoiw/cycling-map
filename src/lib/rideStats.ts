/** Values for the three dashboard cards; hidden rides do not contribute. */
export type RideSummaryInput = {
  visible: boolean
  distanceKm: number
  elevationGainM: number | null
}

export function summarizeVisibleRides(rides: readonly RideSummaryInput[]) {
  let visibleCount = 0
  let visibleDistance = 0
  let visibleElevationGain = 0
  let elevationDataCount = 0

  for (const ride of rides) {
    if (!ride.visible) continue
    visibleCount += 1
    visibleDistance += ride.distanceKm
    if (ride.elevationGainM !== null) {
      visibleElevationGain += ride.elevationGainM
      elevationDataCount += 1
    }
  }

  return { visibleCount, visibleDistance, visibleElevationGain, elevationDataCount }
}
