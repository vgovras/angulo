import { nanoid } from 'nanoid'
import type { Point } from '$lib/modules/points/points'
import type { PointsViewModel } from '$lib/modules/points/points.svelte.js'
import { type LineMeasurement, type LineAngle, calcLineAngle } from './lines'
import { distancePx } from '$lib/modules/calibration/calibration'

const LS_LINES_KEY = 'angulo:lines'
const LS_ANGLES_KEY = 'angulo:line-angles'

export class LinesViewModel {
  measurements = $state<LineMeasurement[]>([])
  angles = $state<LineAngle[]>([])
  pendingPointId = $state<string | null>(null)
  pendingAngleLineId = $state<string | null>(null)
  private pointsVm: PointsViewModel

  hasPending = $derived(this.pendingPointId !== null)

  constructor(pointsVm: PointsViewModel) {
    this.pointsVm = pointsVm
    this.load()
  }

  selectPoint(pointId: string) {
    if (!this.pendingPointId) {
      this.pendingPointId = pointId
    } else if (this.pendingPointId === pointId) {
      this.pendingPointId = null
    } else {
      const a = this.pointsVm.items.find((p: Point) => p.id === this.pendingPointId)
      const b = this.pointsVm.items.find((p: Point) => p.id === pointId)
      if (a && b) {
        this.measurements.push({
          id: nanoid(),
          label: `${a.label}${b.label}`,
          pointAId: this.pendingPointId,
          pointBId: pointId,
          lengthPx: distancePx(a, b),
        })
        this.save()
      }
      this.pendingPointId = null
    }
  }

  cancelPending() {
    this.pendingPointId = null
  }

  /** Select a line for angle measurement by its ID */
  selectLineForAngle(lineId: string) {
    if (!this.pendingAngleLineId) {
      this.pendingAngleLineId = lineId
    } else if (this.pendingAngleLineId === lineId) {
      this.pendingAngleLineId = null
    } else {
      this.angles.push({
        id: nanoid(),
        lineAId: this.pendingAngleLineId,
        lineBId: lineId,
        valueDeg: null,
      })
      const a = this.angles[this.angles.length - 1]
      this.recalcAngle(a)
      this.saveAngles()
      this.pendingAngleLineId = null
    }
  }

  cancelPendingAngle() {
    this.pendingAngleLineId = null
  }

  addAngle() {
    this.angles.push({
      id: nanoid(),
      lineAId: '',
      lineBId: '',
      valueDeg: null,
    })
    this.saveAngles()
  }

  setAngleLine(angleId: string, slot: 'A' | 'B', lineId: string) {
    const a = this.angles.find((a) => a.id === angleId)
    if (!a) return
    if (slot === 'A') a.lineAId = lineId
    else a.lineBId = lineId
    this.recalcAngle(a)
    this.saveAngles()
  }

  removeAngle(id: string) {
    this.angles = this.angles.filter((a) => a.id !== id)
    this.saveAngles()
  }

  private recalcAngle(a: LineAngle) {
    const lineA = this.measurements.find((m) => m.id === a.lineAId)
    const lineB = this.measurements.find((m) => m.id === a.lineBId)
    if (!lineA || !lineB) { a.valueDeg = null; return }
    const pA1 = this.pointsVm.items.find((p: Point) => p.id === lineA.pointAId)
    const pA2 = this.pointsVm.items.find((p: Point) => p.id === lineA.pointBId)
    const pB1 = this.pointsVm.items.find((p: Point) => p.id === lineB.pointAId)
    const pB2 = this.pointsVm.items.find((p: Point) => p.id === lineB.pointBId)
    if (pA1 && pA2 && pB1 && pB2) {
      a.valueDeg = calcLineAngle(pA1, pA2, pB1, pB2)
    } else {
      a.valueDeg = null
    }
  }

  remove(id: string) {
    this.measurements = this.measurements.filter((m) => m.id !== id)
    // Remove angles referencing this line
    this.angles = this.angles.filter((a) => a.lineAId !== id && a.lineBId !== id)
    this.save()
    this.saveAngles()
  }

  clear() {
    this.measurements = []
    this.angles = []
    this.pendingPointId = null
    this.save()
    this.saveAngles()
  }

  recalcAll() {
    for (const m of this.measurements) {
      const a = this.pointsVm.items.find((p: Point) => p.id === m.pointAId)
      const b = this.pointsVm.items.find((p: Point) => p.id === m.pointBId)
      if (a && b) {
        m.lengthPx = distancePx(a, b)
        m.label = `${a.label}${b.label}`
      } else {
        m.lengthPx = null
      }
    }
    for (const a of this.angles) {
      this.recalcAngle(a)
    }
  }

  restore(measurements: LineMeasurement[]) {
    this.measurements = measurements
    this.pendingPointId = null
    this.recalcAll()
    this.save()
  }

  private save() {
    try {
      localStorage.setItem(LS_LINES_KEY, JSON.stringify(this.measurements))
    } catch {}
  }

  private saveAngles() {
    try {
      localStorage.setItem(LS_ANGLES_KEY, JSON.stringify(this.angles))
    } catch {}
  }

  private load() {
    try {
      const raw = localStorage.getItem(LS_LINES_KEY)
      if (raw) this.measurements = JSON.parse(raw)
      const rawA = localStorage.getItem(LS_ANGLES_KEY)
      if (rawA) this.angles = JSON.parse(rawA)
    } catch {}
  }
}
