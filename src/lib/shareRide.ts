import { exportStatistics, type ExportRide } from './exportGeometry.js'

/** Plain factual copy; X users can edit before posting. Only visible rides count. */
export function makeShareText(rides: readonly ExportRide[]): string {
  const { rideCount, distance, elevation, elevationNote } = exportStatistics(rides)
  const elevationText = elevation === '— m'
    ? 'データなし'
    : elevation + (elevationNote ? '（' + elevationNote.replace(/ 件$/, '件') + '）' : '')
  return [
    'サイクリング走行記録',
    'ライド数：' + rideCount + '件',
    '総走行距離：' + distance,
    '総獲得標高：' + elevationText,
  ].join('\n')
}

/** Web Intents support prefilling text, not uploading an image attachment. */
export function xComposeUrl(text: string): string {
  return 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text)
}
