<script lang="ts">
  import type { CanvasViewModel } from './canvas.svelte.js'
  import type { PointsViewModel } from '$lib/modules/points/points.svelte.js'
  import type { AnglesViewModel } from '$lib/modules/angles/angles.svelte.js'
  import type { CalibrationViewModel } from '$lib/modules/calibration/calibration.svelte.js'
  import type { LinesViewModel } from '$lib/modules/lines/lines.svelte.js'
  import type { AnnotationsViewModel } from '$lib/modules/annotations/annotations.svelte.js'
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
    drawAnnotations,
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
    annotationsVm,
    onBeforeAction,
  }: {
    canvasVm: CanvasViewModel
    pointsVm: PointsViewModel
    anglesVm: AnglesViewModel
    calibrationVm: CalibrationViewModel
    linesVm: LinesViewModel
    annotationsVm: AnnotationsViewModel
    onBeforeAction: () => void
  } = $props()

  let el = $state<HTMLCanvasElement | null>(null)
  let container = $state<HTMLDivElement | null>(null)
  let animFrame = 0

  // Visibility priority: angle > line > point. A visible angle FORCES its
  // constituent lines (and their endpoint points) visible — overriding any
  // explicit hide flag on them. A hidden angle has no special effect; lines
  // and points then follow their own flags and the natural endpoint cascade.
  const visibleLineIds = $derived.by(() => {
    const ids = new Set<string>()

    for (const m of linesVm.measurements) {
      let visible = m.visible !== false // start with the line's own flag

      // Pulled in by a visible 3-point angle whose ray endpoints match this line
      if (!visible) {
        for (const angle of anglesVm.measurements) {
          if (angle.visible === false) continue
          if (!angle.pointAId || !angle.pointBId || !angle.pointCId) continue
          const isRay1 =
            (m.pointAId === angle.pointAId && m.pointBId === angle.pointBId) ||
            (m.pointAId === angle.pointBId && m.pointBId === angle.pointAId)
          const isRay2 =
            (m.pointAId === angle.pointBId && m.pointBId === angle.pointCId) ||
            (m.pointAId === angle.pointCId && m.pointBId === angle.pointBId)
          if (isRay1 || isRay2) { visible = true; break }
        }
      }

      // Pulled in by a visible line-angle
      if (!visible) {
        for (const la of linesVm.angles) {
          if (la.visible === false) continue
          if (la.lineAId === m.id || la.lineBId === m.id) { visible = true; break }
        }
      }

      if (visible) ids.add(m.id)
    }

    return ids
  })

  const visiblePointIds = $derived.by(() => {
    const ids = new Set<string>()

    // Points used by a visible 3-point angle
    for (const m of anglesVm.measurements) {
      if (m.visible === false) continue
      if (m.pointAId) ids.add(m.pointAId)
      if (m.pointBId) ids.add(m.pointBId)
      if (m.pointCId) ids.add(m.pointCId)
    }

    // Points that are endpoints of a visible line
    for (const line of linesVm.measurements) {
      if (visibleLineIds.has(line.id)) {
        ids.add(line.pointAId)
        ids.add(line.pointBId)
      }
    }

    // Orphan points (not referenced by any angle or line) — always visible
    const referenced = new Set<string>()
    for (const m of anglesVm.measurements) {
      if (m.pointAId) referenced.add(m.pointAId)
      if (m.pointBId) referenced.add(m.pointBId)
      if (m.pointCId) referenced.add(m.pointCId)
    }
    for (const line of linesVm.measurements) {
      referenced.add(line.pointAId)
      referenced.add(line.pointBId)
    }
    for (const p of pointsVm.items) {
      if (!referenced.has(p.id)) ids.add(p.id)
    }

    return ids
  })

  const visiblePoints = $derived(pointsVm.items.filter((p) => visiblePointIds.has(p.id)))
  const visibleLines = $derived(linesVm.measurements.filter((m) => visibleLineIds.has(m.id)))
  const visibleAngles = $derived(anglesVm.measurements.filter((m) => m.visible !== false))
  const visibleLineAngles = $derived(linesVm.angles.filter((a) => a.visible !== false))

  const pointVisibilityFilter = (p: Point) => visiblePointIds.has(p.id)

  // Pointer tracking
  let isPanning = $state(false)
  let isDragging = $state(false)
  let lastPointerX = 0
  let lastPointerY = 0
  let dragPointId: string | null = null
  let dragCalibIndex: number = -1
  let dragAnnotationId: string | null = null

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

    // Points (only those used by a visible angle/line, or unreferenced orphans)
    drawPoints(ctx, visiblePoints, canvasVm.zoom)

    // Handle for selected point — only if the selected point is currently visible
    if (pointsVm.selected && visiblePointIds.has(pointsVm.selected.id)) {
      drawHandle(ctx, pointsVm.selected, canvasVm.zoom)
    }

    // Lines (full points list for endpoint coordinate lookup)
    drawLines(ctx, visibleLines, pointsVm.items, canvasVm.zoom, calibrationVm.pxPerMm)

    // Line-angle arcs (full lines/points for lookup)
    drawLineAngles(ctx, visibleLineAngles, linesVm.measurements, pointsVm.items, canvasVm.zoom)

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

    // Angles (full points list for lookup)
    drawAngles(ctx, visibleAngles, pointsVm.items, canvasVm.zoom)

    // Text annotations
    drawAnnotations(ctx, annotationsVm.items, annotationsVm.selectedId, canvasVm.zoom)

    animFrame = requestAnimationFrame(render)
  }

  function onPointerDown(e: PointerEvent) {
    if (!el) return
    if (pointsVm.pending) return
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
      // Allow selecting/dragging text annotations
      const annoHit = annotationsVm.hitTest(x, y, 30 / canvasVm.zoom)
      if (annoHit) {
        annotationsVm.select(annoHit.id)
        isDragging = true
        dragAnnotationId = annoHit.id
        lastPointerX = e.clientX
        lastPointerY = e.clientY
        return
      }
      // Also allow selecting/deselecting points by tapping on them
      const hit = pointsVm.hitTest(x, y, POINT_RADIUS * 3 / canvasVm.zoom, pointVisibilityFilter)
      if (hit) {
        annotationsVm.select(null)
        pointsVm.select(hit.id === pointsVm.selectedId ? null : hit.id)
        return
      }
      pointsVm.select(null)
      annotationsVm.select(null)
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
      const hit = pointsVm.hitTest(x, y, POINT_RADIUS * 3 / canvasVm.zoom, pointVisibilityFilter)
      if (hit) {
        pointsVm.select(hit.id)
        return
      }

      // Deselect and show landmark picker
      pointsVm.select(null)
      const snapped = canvasVm.snapPoint(x, y, calibrationVm.pxPerMm)
      pointsVm.beginAdd(snapped.x, snapped.y, e.clientX, e.clientY)
    }

    if (canvasVm.mode === 'point-angle') {
      const hit = pointsVm.hitTest(x, y, POINT_RADIUS * 3 / canvasVm.zoom, pointVisibilityFilter)
      if (hit) {
        onBeforeAction()
        anglesVm.selectPointForAngle(hit.id)
      } else {
        anglesVm.cancelPending()
      }
    }

    if (canvasVm.mode === 'line' || canvasVm.mode === 'ray') {
      const hit = pointsVm.hitTest(x, y, POINT_RADIUS * 3 / canvasVm.zoom, pointVisibilityFilter)
      if (hit) {
        onBeforeAction()
        linesVm.selectPoint(hit.id, canvasVm.mode === 'ray')
      } else {
        pointsVm.select(null)
        linesVm.cancelPending()
      }
    }

    if (canvasVm.mode === 'line-angle') {
      // First: if a point is selected, highlight it and find its line
      const hit = pointsVm.hitTest(x, y, POINT_RADIUS * 3 / canvasVm.zoom, pointVisibilityFilter)
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

    if (canvasVm.mode === 'text') {
      // Try selecting/dragging existing annotation
      const hit = annotationsVm.hitTest(x, y, 30 / canvasVm.zoom)
      if (hit) {
        annotationsVm.select(hit.id)
        isDragging = true
        dragAnnotationId = hit.id
        lastPointerX = e.clientX
        lastPointerY = e.clientY
      } else {
        // Add new text annotation
        onBeforeAction()
        annotationsVm.add(x, y)
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

    if (isDragging && dragAnnotationId) {
      const dx = (e.clientX - lastPointerX) / canvasVm.zoom
      const dy = (e.clientY - lastPointerY) / canvasVm.zoom
      const a = annotationsVm.items.find((a) => a.id === dragAnnotationId)
      if (a) annotationsVm.move(dragAnnotationId, a.x + dx, a.y + dy)
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
      dragAnnotationId = null
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
