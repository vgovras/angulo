import { distancePx } from './calibration'

const LS_KEY = 'angulo:calibration'

export class CalibrationViewModel {
  pxPerMm = $state<number | null>(null)
  isCalibrating = $state(false)
  pending = $state<{ x: number; y: number }[]>([])

  isCalibrated = $derived(this.pxPerMm !== null)
  statusLabel = $derived(
    this.pxPerMm
      ? `1 см = ${(this.pxPerMm * 10).toFixed(1)}px`
      : 'Масштаб не налаштовано'
  )

  constructor() {
    this.load()
  }

  start() {
    this.isCalibrating = true
    this.pending = []
  }

  addPoint(x: number, y: number) {
    this.pending = [...this.pending, { x, y }]
  }

  confirm(distanceMm: number) {
    const [p1, p2] = this.pending
    this.pxPerMm = distancePx(p1, p2) / distanceMm
    this.isCalibrating = false
    this.pending = []
    this.save()
  }

  reset() {
    this.pxPerMm = null
    this.isCalibrating = false
    this.pending = []
    this.save()
  }

  toMm(px: number) {
    return this.pxPerMm ? px / this.pxPerMm : px
  }

  restore(pxPerMm: number | null) {
    this.pxPerMm = pxPerMm
    this.isCalibrating = false
    this.pending = []
    this.save()
  }

  private save() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(this.pxPerMm))
    } catch {}
  }

  private load() {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) this.pxPerMm = JSON.parse(raw)
    } catch {}
  }
}
