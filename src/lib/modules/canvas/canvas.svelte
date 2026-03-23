<script lang="ts">
  import type { CanvasViewModel } from './canvas.svelte.js'
  import type { PointsViewModel } from '$lib/modules/points/points.svelte.js'
  import type { AnglesViewModel } from '$lib/modules/angles/angles.svelte.js'
  import type { CalibrationViewModel } from '$lib/modules/calibration/calibration.svelte.js'
  import type { LinesViewModel } from '$lib/modules/lines/lines.svelte.js'
  import type { Point } from '$lib/modules/points/points'
  import {
    drawGrid,
    drawPoints,
    drawHandle,
    drawAngles,
    drawLines,
    drawLineAngles,
    drawPendingLine,
    drawCalibrationPoints,
    handleHitTest,
    calibHandleHitTest,
    HANDLE_OFFSET_X,
    HANDLE_OFFSET_Y,
    POINT_RADIUS,
  } from './canvas-draw'

  let {
    canvasVm,
    pointsVm,
    anglesVm,
    calibrationVm,
    linesVm,
    onBeforeAction,
  }: {
    canvasVm: CanvasViewModel
    pointsVm: PointsViewModel
    anglesVm: AnglesViewModel
    calibrationVm: CalibrationViewModel
    linesVm: LinesViewModel
    onBeforeAction: () => void
  } = $props()

  let el = $state<HTMLCanvasElement | null>(null)
  let container = $state<HTMLDivElement | null>(null)
  let animFrame = 0

  // Pointer tracking
  let isPanning = $state(false)
  let isDragging = $state(false)
  let lastPointerX = 0
  let lastPointerY = 0
  let dragPointId: string | null = null
  let dragCalibIndex: number = -1

  // Pinch zoom
  let pointers = new Map<number, PointerEvent>()

  function getCanvasRect() {
    return el?.getBoundingClientRect() ?? { left: 0, top: 0, width: 0, height: 0 }
  }

  function render() {
    if (!el) return
    const ctx = el.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = getCanvasRect()
    const w = rect.width
    const h = rect.height

    if (el.width !== w * dpr || el.height !== h * dpr) {
      el.width = w * dpr
      el.height = h * dpr
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, el.width, el.height)
    ctx.setTransform(
      dpr * canvasVm.zoom,
      0,
      0,
      dpr * canvasVm.zoom,
      dpr * canvasVm.panX,
      dpr * canvasVm.panY
    )

    // Image
    if (canvasVm.image) {
      ctx.drawImage(canvasVm.image, 0, 0)
    }

    // Grid
    if (canvasVm.gridVisible && canvasVm.image) {
      drawGrid(
        ctx,
        calibrationVm.pxPerMm,
        canvasVm.gridStepMm,
        canvasVm.image.width,
        canvasVm.image.height
      )
    }

    // Calibration points
    if (calibrationVm.isCalibrating && calibrationVm.pending.length > 0) {
      drawCalibrationPoints(ctx, calibrationVm.pending, canvasVm.zoom, dragCalibIndex)
    }

    // Points
    drawPoints(ctx, pointsVm.items, canvasVm.zoom)

    // Handle for selected point
    if (pointsVm.selected) {
      drawHandle(ctx, pointsVm.selected, canvasVm.zoom)
    }

    // Lines
    drawLines(ctx, linesVm.measurements, pointsVm.items, canvasVm.zoom, calibrationVm.pxPerMm)

    // Line angles at intersection
    drawLineAngles(ctx, linesVm.angles, linesVm.measurements, pointsVm.items, canvasVm.zoom)

    // Pending line point highlight
    if (linesVm.pendingPointId) {
      const pendingPt = pointsVm.items.find((p: Point) => p.id === linesVm.pendingPointId)
      if (pendingPt) drawPendingLine(ctx, pendingPt, canvasVm.zoom)
    }

    // Pending line-angle highlight
    if (linesVm.pendingAngleLineId) {
      const pendingLine = linesVm.measurements.find((m) => m.id === linesVm.pendingAngleLineId)
      if (pendingLine) {
        const pA = pointsVm.items.find((p: Point) => p.id === pendingLine.pointAId)
        const pB = pointsVm.items.find((p: Point) => p.id === pendingLine.pointBId)
        if (pA && pB) {
          drawPendingLine(ctx, pA, canvasVm.zoom)
          drawPendingLine(ctx, pB, canvasVm.zoom)
        }
      }
    }

    // Pending point-angle highlights
    for (const pid of anglesVm.pendingPoints) {
      const pt = pointsVm.items.find((p: Point) => p.id === pid)
      if (pt) drawPendingLine(ctx, pt, canvasVm.zoom)
    }

    // Angles
    drawAngles(ctx, anglesVm.measurements, pointsVm.items, canvasVm.zoom)

    animFrame = requestAnimationFrame(render)
  }

  function onPointerDown(e: PointerEvent) {
    if (!el) return
    el.setPointerCapture(e.pointerId)
    pointers.set(e.pointerId, e)

    if (pointers.size >= 2) {
      // Pinch start — cancel any single-pointer action
      isPanning = false
      isDragging = false
      return
    }

    const rect = getCanvasRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const { x, y } = canvasVm.screenToImage(sx, sy)

    if (canvasVm.mode === 'pan') {
      // In pan mode, still allow dragging selected point via handle
      if (pointsVm.selected && handleHitTest(pointsVm.selected, x, y, canvasVm.zoom)) {
        onBeforeAction()
        isDragging = true
        dragPointId = pointsVm.selected.id
        lastPointerX = e.clientX
        lastPointerY = e.clientY
        return
      }
      // Also allow selecting/deselecting points by tapping on them
      const hit = pointsVm.hitTest(x, y, POINT_RADIUS * 3 / canvasVm.zoom)
      if (hit) {
        pointsVm.select(hit.id === pointsVm.selectedId ? null : hit.id)
        return
      }
      pointsVm.select(null)
      isPanning = true
      lastPointerX = e.clientX
      lastPointerY = e.clientY
      return
    }

    if (canvasVm.mode === 'calibrate') {
      if (!calibrationVm.isCalibrating) {
        calibrationVm.start()
      }
      // Try dragging existing calibration point via handle
      for (let i = 0; i < calibrationVm.pending.length; i++) {
        if (calibHandleHitTest(calibrationVm.pending[i], x, y, canvasVm.zoom)) {
          isDragging = true
          dragCalibIndex = i
          lastPointerX = e.clientX
          lastPointerY = e.clientY
          return
        }
      }
      // Add new calibration point (max 2)
      calibrationVm.addPoint(x, y)
      return
    }

    if (canvasVm.mode === 'point') {
      // Check if clicking on handle of selected point
      if (pointsVm.selected && handleHitTest(pointsVm.selected, x, y, canvasVm.zoom)) {
        onBeforeAction()
        isDragging = true
        dragPointId = pointsVm.selected.id
        lastPointerX = e.clientX
        lastPointerY = e.clientY
        return
      }

      // Check if clicking on an existing point
      const hit = pointsVm.hitTest(x, y, POINT_RADIUS * 3 / canvasVm.zoom)
      if (hit) {
        pointsVm.select(hit.id)
        return
      }

      // Deselect and add new point
      pointsVm.select(null)
      onBeforeAction()
      const snapped = canvasVm.snapPoint(x, y, calibrationVm.pxPerMm)
      pointsVm.add(snapped.x, snapped.y)
    }

    if (canvasVm.mode === 'point-angle') {
      const hit = pointsVm.hitTest(x, y, POINT_RADIUS * 3 / canvasVm.zoom)
      if (hit) {
        onBeforeAction()
        anglesVm.selectPointForAngle(hit.id)
      } else {
        anglesVm.cancelPending()
      }
    }

    if (canvasVm.mode === 'line') {
      const hit = pointsVm.hitTest(x, y, POINT_RADIUS * 3 / canvasVm.zoom)
      if (hit) {
        onBeforeAction()
        linesVm.selectPoint(hit.id)
      } else {
        pointsVm.select(null)
        linesVm.cancelPending()
      }
    }

    if (canvasVm.mode === 'line-angle') {
      // First: if a point is selected, highlight it and find its line
      const hit = pointsVm.hitTest(x, y, POINT_RADIUS * 3 / canvasVm.zoom)
      if (hit) {
        pointsVm.select(hit.id)
        // Find lines through this point, prefer one different from pending
        const lines = linesVm.measurements.filter(
          (m) => m.pointAId === hit.id || m.pointBId === hit.id
        )
        if (lines.length > 0) {
          const pending = linesVm.pendingAngleLineId
          const pick = (pending ? lines.find((l) => l.id !== pending) : null) ?? lines[0]
          onBeforeAction()
          linesVm.selectLineForAngle(pick.id)
        }
      } else {
        pointsVm.select(null)
        linesVm.cancelPendingAngle()
      }
    }
  }

  function onPointerMove(e: PointerEvent) {
    pointers.set(e.pointerId, e)

    if (pointers.size >= 2) {
      handlePinch()
      return
    }

    if (isPanning) {
      const dx = e.clientX - lastPointerX
      const dy = e.clientY - lastPointerY
      canvasVm.panX += dx
      canvasVm.panY += dy
      lastPointerX = e.clientX
      lastPointerY = e.clientY
      return
    }

    if (isDragging && dragPointId) {
      const dx = (e.clientX - lastPointerX) / canvasVm.zoom
      const dy = (e.clientY - lastPointerY) / canvasVm.zoom
      const p = pointsVm.items.find((p: Point) => p.id === dragPointId)
      if (p) {
        let nx = p.x + dx
        let ny = p.y + dy
        const snapped = canvasVm.snapPoint(nx, ny, calibrationVm.pxPerMm)
        pointsVm.move(dragPointId, snapped.x, snapped.y)
        anglesVm.recalcAll()
        linesVm.recalcAll()
      }
      lastPointerX = e.clientX
      lastPointerY = e.clientY
    }

    if (isDragging && dragCalibIndex >= 0) {
      const dx = (e.clientX - lastPointerX) / canvasVm.zoom
      const dy = (e.clientY - lastPointerY) / canvasVm.zoom
      const p = calibrationVm.pending[dragCalibIndex]
      if (p) {
        calibrationVm.movePoint(dragCalibIndex, p.x + dx, p.y + dy)
      }
      lastPointerX = e.clientX
      lastPointerY = e.clientY
    }
  }

  function onPointerUp(e: PointerEvent) {
    pointers.delete(e.pointerId)
    if (pointers.size < 2) {
      prevPinchDist = null
    }
    if (pointers.size === 0) {
      isPanning = false
      isDragging = false
      dragPointId = null
      dragCalibIndex = -1
    }
  }

  let prevPinchDist: number | null = null

  function handlePinch() {
    const pts = Array.from(pointers.values())
    if (pts.length < 2) return

    const dx = pts[0].clientX - pts[1].clientX
    const dy = pts[0].clientY - pts[1].clientY
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (prevPinchDist !== null) {
      const rect = getCanvasRect()
      const cx = (pts[0].clientX + pts[1].clientX) / 2 - rect.left
      const cy = (pts[0].clientY + pts[1].clientY) / 2 - rect.top
      const scale = dist / prevPinchDist
      const next = Math.max(0.5, Math.min(10, canvasVm.zoom * scale))
      canvasVm.panX = cx - (cx - canvasVm.panX) * (next / canvasVm.zoom)
      canvasVm.panY = cy - (cy - canvasVm.panY) * (next / canvasVm.zoom)
      canvasVm.zoom = next
    }
    prevPinchDist = dist
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault()
    if (e.ctrlKey || e.metaKey) {
      // Pinch-to-zoom on trackpad (or Ctrl+scroll)
      const rect = getCanvasRect()
      const ox = e.clientX - rect.left
      const oy = e.clientY - rect.top
      canvasVm.applyZoom(e.deltaY, ox, oy)
    } else {
      // Two-finger scroll on trackpad → pan
      canvasVm.panX -= e.deltaX
      canvasVm.panY -= e.deltaY
    }
  }

  $effect(() => {
    if (el) {
      animFrame = requestAnimationFrame(render)
      return () => cancelAnimationFrame(animFrame)
    }
  })
</script>

<div bind:this={container} class="absolute inset-0">
  <canvas
    bind:this={el}
    class="h-full w-full touch-none"
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    onpointercancel={onPointerUp}
    onwheel={onWheel}
  ></canvas>
</div>
