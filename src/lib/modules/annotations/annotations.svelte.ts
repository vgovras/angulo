import { nanoid } from 'nanoid'
import { type TextAnnotation } from './annotations'

const LS_KEY = 'angulo:annotations'

export class AnnotationsViewModel {
  items = $state<TextAnnotation[]>([])
  selectedId = $state<string | null>(null)

  selected = $derived(
    this.items.find((a) => a.id === this.selectedId) ?? null
  )

  constructor() {
    this.load()
  }

  add(x: number, y: number, text = 'Текст') {
    const id = nanoid()
    this.items.push({ id, text, x, y })
    this.selectedId = id
    this.save()
  }

  move(id: string, x: number, y: number) {
    const a = this.items.find((a) => a.id === id)
    if (a) { a.x = x; a.y = y; this.save() }
  }

  edit(id: string, text: string) {
    const a = this.items.find((a) => a.id === id)
    if (a) { a.text = text; this.save() }
  }

  remove(id: string) {
    this.items = this.items.filter((a) => a.id !== id)
    if (this.selectedId === id) this.selectedId = null
    this.save()
  }

  select(id: string | null) {
    this.selectedId = id
  }

  clear() {
    this.items = []
    this.selectedId = null
    this.save()
  }

  hitTest(x: number, y: number, radius: number): TextAnnotation | null {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const a = this.items[i]
      const dx = a.x - x
      const dy = a.y - y
      if (dx * dx + dy * dy <= radius * radius) return a
    }
    return null
  }

  restore(items: TextAnnotation[]) {
    this.items = items
    this.selectedId = null
    this.save()
  }

  private save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(this.items)) } catch {}
  }

  private load() {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) this.items = JSON.parse(raw)
    } catch {}
  }
}
