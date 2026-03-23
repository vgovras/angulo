import type { ToolMode } from '$lib/modules/toolbar/toolbar'

export class CanvasViewModel {
  zoom = $state(1)
  panX = $state(0)
  panY = $state(0)
  mode = $state<ToolMode>('pan')
  image = $state<HTMLImageElement | null>(null)
  gridVisible = $state(true)
  gridStepMm = $state(10)
  snapToGrid = $state(false)

  setMode(m: ToolMode) {
    this.mode = m
  }

  loadImage(file: File | Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        this.image = img
        this.resetView()
        resolve()
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = url
    })
  }

  clearImage() {
    this.image = null
    this.resetView()
  }

  applyZoom(delta: number, ox: number, oy: number) {
    const factor = delta > 0 ? 0.9 : 1.1
    const next = Math.max(0.5, Math.min(10, this.zoom * factor))
    this.panX = ox - (ox - this.panX) * (next / this.zoom)
    this.panY = oy - (oy - this.panY) * (next / this.zoom)
    this.zoom = next
  }

  screenToImage(sx: number, sy: number) {
    return {
      x: (sx - this.panX) / this.zoom,
      y: (sy - this.panY) / this.zoom,
    }
  }

  resetView() {
    this.zoom = 1
    this.panX = 0
    this.panY = 0
  }

  snapPoint(x: number, y: number, pxPerMm: number | null): { x: number; y: number } {
    if (!this.snapToGrid || !pxPerMm) return { x, y }
    const stepPx = pxPerMm * this.gridStepMm
    return {
      x: Math.round(x / stepPx) * stepPx,
      y: Math.round(y / stepPx) * stepPx,
    }
  }
}
