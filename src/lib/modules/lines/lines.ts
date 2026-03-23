export interface LineMeasurement {
  id: string
  label: string
  pointAId: string
  pointBId: string
  lengthPx: number | null
  isRay?: boolean
}

export interface LineAngle {
  id: string
  lineAId: string
  lineBId: string
  valueDeg: number | null
}

/** Find intersection point of two line segments (extended to infinity) */
export function lineIntersection(
  a1: { x: number; y: number },
  a2: { x: number; y: number },
  b1: { x: number; y: number },
  b2: { x: number; y: number }
): { x: number; y: number } | null {
  const d1x = a2.x - a1.x
  const d1y = a2.y - a1.y
  const d2x = b2.x - b1.x
  const d2y = b2.y - b1.y
  const denom = d1x * d2y - d1y * d2x
  if (Math.abs(denom) < 1e-10) return null // parallel
  const t = ((b1.x - a1.x) * d2y - (b1.y - a1.y) * d2x) / denom
  return { x: a1.x + t * d1x, y: a1.y + t * d1y }
}

export function calcLineAngle(
  a1: { x: number; y: number },
  a2: { x: number; y: number },
  b1: { x: number; y: number },
  b2: { x: number; y: number }
): number {
  const v1x = a2.x - a1.x
  const v1y = a2.y - a1.y
  const v2x = b2.x - b1.x
  const v2y = b2.y - b1.y
  const dot = v1x * v2x + v1y * v2y
  const mag = Math.sqrt(v1x ** 2 + v1y ** 2) * Math.sqrt(v2x ** 2 + v2y ** 2)
  if (mag === 0) return 0
  return parseFloat(
    (Math.acos(Math.max(-1, Math.min(1, Math.abs(dot) / mag))) * (180 / Math.PI)).toFixed(1)
  )
}
