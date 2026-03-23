import { nanoid } from 'nanoid'
import type { Point } from '$lib/modules/points/points'
import type { PointsViewModel } from '$lib/modules/points/points.svelte.js'
import { type AngleMeasurement, calcAngle } from './angles'

const LS_KEY = 'angulo:angles'

export class AnglesViewModel {
  measurements = $state<AngleMeasurement[]>([])
  private pointsVm: PointsViewModel

  constructor(pointsVm: PointsViewModel) {
    this.pointsVm = pointsVm
    this.load()
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
