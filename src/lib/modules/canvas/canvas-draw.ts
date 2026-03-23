import type { Point } from '$lib/modules/points/points'
import type { AngleMeasurement } from '$lib/modules/angles/angles'

const HANDLE_SIZE = 44
const HANDLE_OFFSET_X = 20
const HANDLE_OFFSET_Y = -20
const POINT_RADIUS = 6

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  pxPerMm: number | null,
  gridStepMm: number,
  width: number,
  height: number
) {
  if (!pxPerMm) return

  const stepPx = pxPerMm * gridStepMm
  if (stepPx < 1) return

  ctx.save()
  ctx.lineWidth = 0.5

  for (let x = 0; x < width; x += stepPx) {
    const isMajor = Math.round(x / stepPx) % 5 === 0
    ctx.strokeStyle = isMajor
      ? 'rgba(135, 206, 250, 0.5)'
      : 'rgba(135, 206, 250, 0.2)'
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }

  for (let y = 0; y < height; y += stepPx) {
    const isMajor = Math.round(y / stepPx) % 5 === 0
    ctx.strokeStyle = isMajor
      ? 'rgba(135, 206, 250, 0.5)'
      : 'rgba(135, 206, 250, 0.2)'
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }

  ctx.restore()
}

export function drawPoints(ctx: CanvasRenderingContext2D, points: Point[], zoom: number) {
  const s = 1 / zoom
  ctx.save()
  for (const p of points) {
    const r = POINT_RADIUS * s
    // Circle
    ctx.beginPath()
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
    ctx.fillStyle = p.color
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2 * s
    ctx.stroke()

    // Label
    ctx.fillStyle = '#fff'
    ctx.strokeStyle = p.color
    ctx.lineWidth = 3 * s
    ctx.font = `bold ${14 * s}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.strokeText(p.label, p.x, p.y - r - 4 * s)
    ctx.fillText(p.label, p.x, p.y - r - 4 * s)
  }
  ctx.restore()
}

export function drawHandle(ctx: CanvasRenderingContext2D, point: Point, zoom: number) {
  const s = 1 / zoom
  const size = HANDLE_SIZE * s
  const offX = HANDLE_OFFSET_X * s
  const offY = HANDLE_OFFSET_Y * s
  const hx = point.x + offX
  const hy = point.y + offY

  ctx.save()

  // Dashed line from point to handle
  ctx.setLineDash([3 * s, 3 * s])
  ctx.beginPath()
  ctx.moveTo(point.x, point.y)
  ctx.lineTo(hx + size / 2, hy + size / 2)
  ctx.strokeStyle = point.color
  ctx.lineWidth = 1 * s
  ctx.stroke()
  ctx.setLineDash([])

  // Handle rectangle
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.strokeStyle = point.color
  ctx.lineWidth = 2 * s
  ctx.fillRect(hx, hy, size, size)
  ctx.strokeRect(hx, hy, size, size)

  // Move icon (crosshair)
  const cx = hx + size / 2
  const cy = hy + size / 2
  ctx.strokeStyle = point.color
  ctx.lineWidth = 2 * s
  ctx.beginPath()
  ctx.moveTo(cx - 8 * s, cy)
  ctx.lineTo(cx + 8 * s, cy)
  ctx.moveTo(cx, cy - 8 * s)
  ctx.lineTo(cx, cy + 8 * s)
  ctx.stroke()

  ctx.restore()
}

export function handleHitTest(
  point: Point,
  x: number,
  y: number,
  zoom: number
): boolean {
  const s = 1 / zoom
  const size = HANDLE_SIZE * s
  const hx = point.x + HANDLE_OFFSET_X * s
  const hy = point.y + HANDLE_OFFSET_Y * s
  return x >= hx && x <= hx + size && y >= hy && y <= hy + size
}

export function drawAngles(
  ctx: CanvasRenderingContext2D,
  measurements: AngleMeasurement[],
  points: Point[],
  zoom: number
) {
  const s = 1 / zoom
  ctx.save()
  for (const m of measurements) {
    const a = points.find((p) => p.id === m.pointAId)
    const b = points.find((p) => p.id === m.pointBId)
    const c = points.find((p) => p.id === m.pointCId)
    if (!a || !b || !c || m.valueDeg === null) continue

    // Lines B→A and B→C
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.lineWidth = 1.5 * s
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.lineTo(c.x, c.y)
    ctx.stroke()

    // Arc
    const angleBA = Math.atan2(a.y - b.y, a.x - b.x)
    const angleBC = Math.atan2(c.y - b.y, c.x - b.x)
    const arcRadius = 25 * s
    ctx.strokeStyle = '#fbbf24'
    ctx.lineWidth = 2 * s
    ctx.beginPath()
    ctx.arc(b.x, b.y, arcRadius, angleBC, angleBA, angleBA < angleBC)
    ctx.stroke()

    // Degree label
    const midAngle = (angleBA + angleBC) / 2
    const labelX = b.x + Math.cos(midAngle) * (arcRadius + 14 * s)
    const labelY = b.y + Math.sin(midAngle) * (arcRadius + 14 * s)
    ctx.fillStyle = '#fbbf24'
    ctx.font = `bold ${13 * s}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${m.valueDeg}°`, labelX, labelY)
  }
  ctx.restore()
}

export function drawCalibrationPoints(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  zoom: number
) {
  const s = 1 / zoom
  ctx.save()
  ctx.fillStyle = '#ef4444'
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 2 * s
  for (const p of points) {
    ctx.beginPath()
    ctx.arc(p.x, p.y, 5 * s, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
  if (points.length === 2) {
    ctx.setLineDash([5 * s, 5 * s])
    ctx.strokeStyle = '#ef4444'
    ctx.lineWidth = 1.5 * s
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    ctx.lineTo(points[1].x, points[1].y)
    ctx.stroke()
    ctx.setLineDash([])
  }
  ctx.restore()
}

export { HANDLE_OFFSET_X, HANDLE_OFFSET_Y, POINT_RADIUS }
