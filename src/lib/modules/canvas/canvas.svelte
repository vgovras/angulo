<script lang="ts">
  import type { CanvasViewModel } from './canvas.svelte.js'
  import type { PointsViewModel } from '$lib/modules/points/points.svelte.js'
  import type { AnglesViewModel } from '$lib/modules/angles/angles.svelte.js'
  import type { CalibrationViewModel } from '$lib/modules/calibration/calibration.svelte.js'
  import type { Point } from '$lib/modules/points/points'
  import {
    drawGrid,
    drawPoints,
    drawHandle,
    drawAngles,
    drawCalibrationPoints,
    handleHitTest,
    HANDLE_OFFSET_X,
    HANDLE_OFFSET_Y,
    POINT_RADIUS,
  } from './canvas-draw'

  let {
    canvasVm,
    pointsVm,
    anglesVm,
    calibrationVm,
    onCalibrationReady,
    onBeforeAction,
  }: {
    canvasVm: CanvasViewModel
    pointsVm: PointsViewModel
    anglesVm: AnglesViewModel
    calibrationVm: CalibrationViewModel
    onCalibrationReady: () => void
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
      drawCalibrationPoints(ctx, calibrationVm.pending, canvasVm.zoom)
    }

    // Points
    drawPoints(ctx, pointsVm.items, canvasVm.zoom)

    // Handle for selected point
    if (pointsVm.selected) {
      drawHandle(ctx, pointsVm.selected, canvasVm.zoom)
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
      isPanning = true
      lastPointerX = e.clientX
      lastPointerY = e.clientY
      return
    }

    if (canvasVm.mode === 'calibrate') {
      if (!calibrationVm.isCalibrating) {
        calibrationVm.start()
      }
      calibrationVm.addPoint(x, y)
      if (calibrationVm.pending.length >= 2) {
        onCalibrationReady()
      }
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

      // Add new point
      onBeforeAction()
      const snapped = canvasVm.snapPoint(x, y, calibrationVm.pxPerMm)
      pointsVm.add(snapped.x, snapped.y)
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
