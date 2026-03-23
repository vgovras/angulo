import { distancePx } from './calibration'

const LS_KEY = 'angulo:calibration'

export class CalibrationViewModel {
  pxPerMm = $state<number | null>(null)
  isCalibrating = $state(false)
  pending = $state<{ x: number; y: number }[]>([])

  isCalibrated = $derived(this.pxPerMm !== null)
  /** Both calibration points placed, ready to confirm */
  isReady = $derived(this.isCalibrating && this.pending.length >= 2)
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
    if (this.pending.length < 2) {
      this.pending = [...this.pending, { x, y }]
    }
  }

  movePoint(index: number, x: number, y: number) {
    if (this.pending[index]) {
      this.pending[index].x = x
      this.pending[index].y = y
    }
  }

  hitTest(x: number, y: number, radius: number): number {
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const p = this.pending[i]
      const dx = p.x - x
      const dy = p.y - y
      if (dx * dx + dy * dy <= radius * radius) return i
    }
    return -1
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
