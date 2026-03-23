import { nanoid } from 'nanoid'
import type { Point } from '$lib/modules/points/points'
import type { PointsViewModel } from '$lib/modules/points/points.svelte.js'
import { type AngleMeasurement, calcAngle } from './angles'

const LS_KEY = 'angulo:angles'

export class AnglesViewModel {
  measurements = $state<AngleMeasurement[]>([])
  pendingPoints = $state<string[]>([])
  private pointsVm: PointsViewModel

  /** How many points selected so far (0-2) */
  pendingCount = $derived(this.pendingPoints.length)

  constructor(pointsVm: PointsViewModel) {
    this.pointsVm = pointsVm
    this.load()
  }

  /** Select a point for building an angle (tap 3 points on canvas) */
  selectPointForAngle(pointId: string) {
    // If tapping the same point, deselect it
    if (this.pendingPoints.length > 0 && this.pendingPoints[this.pendingPoints.length - 1] === pointId) {
      this.pendingPoints = this.pendingPoints.slice(0, -1)
      return
    }

    this.pendingPoints = [...this.pendingPoints, pointId]

    if (this.pendingPoints.length >= 3) {
      const [aId, bId, cId] = this.pendingPoints
      this.measurements.push({
        id: nanoid(),
        label: '',
        pointAId: aId,
        pointBId: bId,
        pointCId: cId,
        valueDeg: null,
      })
      const m = this.measurements[this.measurements.length - 1]
      this.recalc(m)
      this.save()
      this.pendingPoints = []
    }
  }

  cancelPending() {
    this.pendingPoints = []
  }

  add() {
    this.measurements.push({
      id: nanoid(),
      label: '',
      pointAId: '',
      pointBId: '',
      pointCId: '',
      valueDeg: null,
    })
    this.save()
  }

  setPointA(measurementId: string, pointId: string) {
    const m = this.measurements.find((m) => m.id === measurementId)
    if (m) {
      m.pointAId = pointId
      this.recalc(m)
      this.save()
    }
  }

  setPointB(measurementId: string, pointId: string) {
    const m = this.measurements.find((m) => m.id === measurementId)
    if (m) {
      m.pointBId = pointId
      this.recalc(m)
      this.save()
    }
  }

  setPointC(measurementId: string, pointId: string) {
    const m = this.measurements.find((m) => m.id === measurementId)
    if (m) {
      m.pointCId = pointId
      this.recalc(m)
      this.save()
    }
  }

  remove(id: string) {
    this.measurements = this.measurements.filter((m) => m.id !== id)
    this.save()
  }

  clear() {
    this.measurements = []
    this.save()
  }

  recalcAll() {
    for (const m of this.measurements) {
      this.recalc(m)
    }
  }

  private recalc(m: AngleMeasurement) {
    const a = this.pointsVm.items.find((p: Point) => p.id === m.pointAId)
    const b = this.pointsVm.items.find((p: Point) => p.id === m.pointBId)
    const c = this.pointsVm.items.find((p: Point) => p.id === m.pointCId)
    if (a && b && c) {
      m.valueDeg = calcAngle(a, b, c)
      const aLabel = a.label
      const bLabel = b.label
      const cLabel = c.label
      m.label = `${aLabel}${bLabel}${cLabel}`
    } else {
      m.valueDeg = null
      m.label = ''
    }
  }

  restore(measurements: AngleMeasurement[]) {
    this.measurements = measurements
    this.recalcAll()
    this.save()
  }

  private save() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(this.measurements))
    } catch {}
  }

  private load() {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) this.measurements = JSON.parse(raw)
    } catch {}
  }
}
