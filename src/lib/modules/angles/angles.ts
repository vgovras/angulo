import type { Point } from '$lib/modules/points/points'

export interface AngleMeasurement {
  id: string
  label: string
  pointAId: string
  pointBId: string
  pointCId: string
  valueDeg: number | null
}

export function calcAngle(a: Point, b: Point, c: Point): number {
  const bax = a.x - b.x
  const bay = a.y - b.y
  const bcx = c.x - b.x
  const bcy = c.y - b.y
  const dot = bax * bcx + bay * bcy
  const mag = Math.sqrt(bax ** 2 + bay ** 2) * Math.sqrt(bcx ** 2 + bcy ** 2)
  return parseFloat(
    (Math.acos(Math.max(-1, Math.min(1, dot / mag))) * (180 / Math.PI)).toFixed(1)
  )
}
