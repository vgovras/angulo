import { nanoid } from 'nanoid'
import { type Point, type PendingPoint, POINT_COLORS } from './points'

const LS_KEY = 'angulo:points'

export class PointsViewModel {
  items = $state<Point[]>([])
  selectedId = $state<string | null>(null)
  pending = $state<PendingPoint | null>(null)

  selected = $derived(
    this.items.find((p) => p.id === this.selectedId) ?? null
  )

  usedLabels = $derived(new Set(this.items.map((p) => p.label)))

  constructor() {
    this.load()
  }

  add(x: number, y: number) {
    const index = this.items.length
    this.items.push({
      id: nanoid(),
      label: String.fromCharCode(65 + index),
      x,
      y,
      color: POINT_COLORS[index % POINT_COLORS.length],
    })
    this.save()
  }

  beginAdd(x: number, y: number, screenX: number, screenY: number) {
    this.pending = { x, y, screenX, screenY }
  }

  confirmAdd(label: string) {
    if (!this.pending) return
    const index = this.items.length
    this.items.push({
      id: nanoid(),
      label,
      x: this.pending.x,
      y: this.pending.y,
      color: POINT_COLORS[index % POINT_COLORS.length],
    })
    this.pending = null
    this.save()
  }

  cancelAdd() {
    this.pending = null
  }

  move(id: string, x: number, y: number) {
    const p = this.items.find((p) => p.id === id)
    if (p) {
      p.x = x
      p.y = y
      this.save()
    }
  }

  remove(id: string) {
    this.items = this.items.filter((p) => p.id !== id)
    if (this.selectedId === id) this.selectedId = null
    this.save()
  }

  rename(id: string, label: string) {
    const p = this.items.find((p) => p.id === id)
    if (p) {
      p.label = label
      this.save()
    }
  }

  select(id: string | null) {
    this.selectedId = id
  }

  clear() {
    this.items = []
    this.selectedId = null
    this.save()
  }

  hitTest(x: number, y: number, radius: number): Point | null {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i]
      const dx = p.x - x
      const dy = p.y - y
      if (dx * dx + dy * dy <= radius * radius) return p
    }
    return null
  }

  restore(items: Point[], selectedId: string | null) {
    this.items = items
    this.selectedId = selectedId
    this.save()
  }

  private save() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(this.items))
    } catch {}
  }

  private load() {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) this.items = JSON.parse(raw)
    } catch {}
  }
}
