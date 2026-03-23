import type { Point } from '$lib/modules/points/points'
import type { AngleMeasurement } from '$lib/modules/angles/angles'
import type { PointsViewModel } from '$lib/modules/points/points.svelte.js'
import type { AnglesViewModel } from '$lib/modules/angles/angles.svelte.js'
import type { CalibrationViewModel } from '$lib/modules/calibration/calibration.svelte.js'

interface Snapshot {
  points: Point[]
  selectedId: string | null
  angles: AngleMeasurement[]
  pxPerMm: number | null
}

const MAX_STACK = 50

export class HistoryManager {
  private stack = $state<Snapshot[]>([])

  canUndo = $derived(this.stack.length > 0)

  snapshot(
    pointsVm: PointsViewModel,
    anglesVm: AnglesViewModel,
    calibrationVm: CalibrationViewModel
  ) {
    this.stack.push({
      points: structuredClone($state.snapshot(pointsVm.items)),
      selectedId: pointsVm.selectedId,
      angles: structuredClone($state.snapshot(anglesVm.measurements)),
      pxPerMm: calibrationVm.pxPerMm,
    })
    if (this.stack.length > MAX_STACK) {
      this.stack.shift()
    }
  }

  undo(
    pointsVm: PointsViewModel,
    anglesVm: AnglesViewModel,
    calibrationVm: CalibrationViewModel
  ) {
    const snap = this.stack.pop()
    if (!snap) return
    pointsVm.restore(snap.points, snap.selectedId)
    anglesVm.restore(snap.angles)
    calibrationVm.restore(snap.pxPerMm)
  }
}
