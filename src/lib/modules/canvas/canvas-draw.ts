import type { Point } from '$lib/modules/points/points'
import type { AngleMeasurement } from '$lib/modules/angles/angles'
import { type LineMeasurement, type LineAngle, lineIntersection } from '$lib/modules/lines/lines'
import type { TextAnnotation } from '$lib/modules/annotations/annotations'

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
      ? 'rgba(30, 64, 175, 0.5)'
      : 'rgba(30, 64, 175, 0.2)'
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }

  for (let y = 0; y < height; y += stepPx) {
    const isMajor = Math.round(y / stepPx) % 5 === 0
    ctx.strokeStyle = isMajor
      ? 'rgba(30, 64, 175, 0.5)'
      : 'rgba(30, 64, 175, 0.2)'
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
    ctx.strokeStyle = '#92400e'
    ctx.lineWidth = 2 * s
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.lineTo(c.x, c.y)
    ctx.stroke()

    // Arc
    const angleBA = Math.atan2(a.y - b.y, a.x - b.x)
    const angleBC = Math.atan2(c.y - b.y, c.x - b.x)
    const arcRadius = 25 * s
    ctx.strokeStyle = '#92400e'
    ctx.lineWidth = 2 * s
    ctx.beginPath()
    ctx.arc(b.x, b.y, arcRadius, angleBC, angleBA, angleBA < angleBC)
    ctx.stroke()

    // Degree label
    const midAngle = (angleBA + angleBC) / 2
    const labelX = b.x + Math.cos(midAngle) * (arcRadius + 14 * s)
    const labelY = b.y + Math.sin(midAngle) * (arcRadius + 14 * s)
    ctx.fillStyle = '#92400e'
    ctx.font = `bold ${13 * s}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${m.valueDeg}°`, labelX, labelY)
  }
  ctx.restore()
}

export function drawLines(
  ctx: CanvasRenderingContext2D,
  measurements: LineMeasurement[],
  points: Point[],
  zoom: number,
  pxPerMm: number | null
) {
  const s = 1 / zoom
  ctx.save()
  for (const m of measurements) {
    const a = points.find((p) => p.id === m.pointAId)
    const b = points.find((p) => p.id === m.pointBId)
    if (!a || !b) continue

    ctx.strokeStyle = 'rgba(153, 27, 27, 0.9)'
    ctx.lineWidth = 2 * s
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    if (m.isRay) {
      // Extend ray from A through B to a far distance
      const dx = b.x - a.x
      const dy = b.y - a.y
      const len = Math.sqrt(dx * dx + dy * dy)
      if (len > 0) {
        const ext = 10000
        ctx.lineTo(a.x + (dx / len) * ext, a.y + (dy / len) * ext)
      }
    } else {
      ctx.lineTo(b.x, b.y)
    }
    ctx.stroke()

    // Length label at midpoint
    if (m.lengthPx !== null) {
      const mx = (a.x + b.x) / 2
      const my = (a.y + b.y) / 2
      const label = pxPerMm
        ? `${(m.lengthPx / pxPerMm / 10).toFixed(2)} см`
        : `${m.lengthPx.toFixed(0)} px`
      ctx.fillStyle = 'rgba(153, 27, 27, 1)'
      ctx.font = `bold ${16 * s}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillText(label, mx, my - 4 * s)
    }
  }
  ctx.restore()
}

export function drawLineAngles(
  ctx: CanvasRenderingContext2D,
  angles: LineAngle[],
  lines: LineMeasurement[],
  points: Point[],
  zoom: number
) {
  const s = 1 / zoom
  ctx.save()
  for (const a of angles) {
    if (a.valueDeg === null) continue
    const lineA = lines.find((l) => l.id === a.lineAId)
    const lineB = lines.find((l) => l.id === a.lineBId)
    if (!lineA || !lineB) continue

    const pA1 = points.find((p) => p.id === lineA.pointAId)
    const pA2 = points.find((p) => p.id === lineA.pointBId)
    const pB1 = points.find((p) => p.id === lineB.pointAId)
    const pB2 = points.find((p) => p.id === lineB.pointBId)
    if (!pA1 || !pA2 || !pB1 || !pB2) continue

    const ix = lineIntersection(pA1, pA2, pB1, pB2)
    if (!ix) continue

    // 4 direction angles from intersection
    const angA1 = Math.atan2(pA2.y - pA1.y, pA2.x - pA1.x)
    const angA2 = angA1 + Math.PI // opposite direction
    const angB1 = Math.atan2(pB2.y - pB1.y, pB2.x - pB1.x)
    const angB2 = angB1 + Math.PI

    // Sort all 4 angles to find the 4 sectors
    const dirs = [angA1, angB1, angA2, angB2].map((a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI))
    dirs.sort((a, b) => a - b)

    const arcRadius = 30 * s
    const acuteRad = (a.valueDeg * Math.PI) / 180
    const obtuseRad = Math.PI - acuteRad
    const obtuseDeg = parseFloat((180 - a.valueDeg).toFixed(1))

    // Draw intersection dot
    ctx.fillStyle = '#92400e'
    ctx.beginPath()
    ctx.arc(ix.x, ix.y, 3 * s, 0, Math.PI * 2)
    ctx.fill()

    // Draw 2 unique angles (first acute + first obtuse)
    let drawnAcute = false
    let drawnObtuse = false
    for (let i = 0; i < 4; i++) {
      const startAng = dirs[i]
      const endAng = dirs[(i + 1) % 4]
      let sweep = endAng - startAng
      if (sweep <= 0) sweep += 2 * Math.PI

      const isAcute = Math.abs(sweep - acuteRad) < 0.01
      const isObtuse = Math.abs(sweep - obtuseRad) < 0.01
      if (isAcute && drawnAcute) continue
      if (isObtuse && drawnObtuse) continue
      if (!isAcute && !isObtuse) continue

      if (isAcute) drawnAcute = true
      if (isObtuse) drawnObtuse = true

      const deg = isAcute ? a.valueDeg : obtuseDeg
      const radius = isAcute ? arcRadius : arcRadius * 0.7
      const color = isAcute ? '#b45309' : '#6d28d9'

      ctx.strokeStyle = color
      ctx.lineWidth = 2.5 * s
      ctx.beginPath()
      ctx.arc(ix.x, ix.y, radius, startAng, startAng + sweep)
      ctx.stroke()

      const midAng = startAng + sweep / 2
      const labelDist = radius + 16 * s
      const labelX = ix.x + Math.cos(midAng) * labelDist
      const labelY = ix.y + Math.sin(midAng) * labelDist
      ctx.fillStyle = color
      ctx.font = `bold ${15 * s}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`${deg}°`, labelX, labelY)
    }
  }
  ctx.restore()
}

export function drawPendingLine(
  ctx: CanvasRenderingContext2D,
  point: Point,
  zoom: number
) {
  const s = 1 / zoom
  ctx.save()
  // Highlight the pending first point
  ctx.strokeStyle = 'rgba(153, 27, 27, 0.9)'
  ctx.lineWidth = 3 * s
  ctx.beginPath()
  ctx.arc(point.x, point.y, POINT_RADIUS * 1.8 * s, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

export function drawCalibrationPoints(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  zoom: number,
  dragIndex: number
) {
  const s = 1 / zoom
  const color = '#991b1b'
  ctx.save()
  ctx.fillStyle = color
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
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5 * s
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    ctx.lineTo(points[1].x, points[1].y)
    ctx.stroke()
    ctx.setLineDash([])
  }
  // Draw handles for each calibration point
  for (const p of points) {
    drawCalibHandle(ctx, p, s, color)
  }
  ctx.restore()
}

function drawCalibHandle(
  ctx: CanvasRenderingContext2D,
  p: { x: number; y: number },
  s: number,
  color: string
) {
  const size = HANDLE_SIZE * s
  const hx = p.x + HANDLE_OFFSET_X * s
  const hy = p.y + HANDLE_OFFSET_Y * s

  ctx.save()
  ctx.setLineDash([3 * s, 3 * s])
  ctx.beginPath()
  ctx.moveTo(p.x, p.y)
  ctx.lineTo(hx + size / 2, hy + size / 2)
  ctx.strokeStyle = color
  ctx.lineWidth = 1 * s
  ctx.stroke()
  ctx.setLineDash([])

  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.strokeStyle = color
  ctx.lineWidth = 2 * s
  ctx.fillRect(hx, hy, size, size)
  ctx.strokeRect(hx, hy, size, size)

  const cx = hx + size / 2
  const cy = hy + size / 2
  ctx.strokeStyle = color
  ctx.lineWidth = 2 * s
  ctx.beginPath()
  ctx.moveTo(cx - 8 * s, cy)
  ctx.lineTo(cx + 8 * s, cy)
  ctx.moveTo(cx, cy - 8 * s)
  ctx.lineTo(cx, cy + 8 * s)
  ctx.stroke()
  ctx.restore()
}

export function calibHandleHitTest(
  p: { x: number; y: number },
  x: number,
  y: number,
  zoom: number
): boolean {
  const s = 1 / zoom
  const size = HANDLE_SIZE * s
  const hx = p.x + HANDLE_OFFSET_X * s
  const hy = p.y + HANDLE_OFFSET_Y * s
  return x >= hx && x <= hx + size && y >= hy && y <= hy + size
}

export function drawAnnotations(
  ctx: CanvasRenderingContext2D,
  items: TextAnnotation[],
  selectedId: string | null,
  zoom: number
) {
  const s = 1 / zoom
  ctx.save()
  for (const a of items) {
    const isSelected = a.id === selectedId
    const fontSize = 16 * s
    ctx.font = `bold ${fontSize}px sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'

    // Background
    const metrics = ctx.measureText(a.text)
    const pad = 4 * s
    const bw = metrics.width + pad * 2
    const bh = fontSize + pad * 2
    ctx.fillStyle = isSelected ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)'
    ctx.fillRect(a.x - pad, a.y - pad, bw, bh)

    if (isSelected) {
      ctx.strokeStyle = '#fbbf24'
      ctx.lineWidth = 2 * s
      ctx.strokeRect(a.x - pad, a.y - pad, bw, bh)
    }

    // Text
    ctx.fillStyle = '#fff'
    ctx.fillText(a.text, a.x, a.y)
  }
  ctx.restore()
}

export { HANDLE_OFFSET_X, HANDLE_OFFSET_Y, POINT_RADIUS }
