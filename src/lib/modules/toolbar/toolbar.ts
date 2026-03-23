export type ToolMode = 'pan' | 'point' | 'point-angle' | 'line' | 'line-angle' | 'calibrate'

export const TOOL_MODES: { value: ToolMode; label: string; icon: string }[] = [
  { value: 'pan', label: 'Рухати', icon: 'hand' },
  { value: 'point', label: 'Точка', icon: 'map-pin' },
  { value: 'point-angle', label: 'Кут точок', icon: 'point-angle' },
  { value: 'line', label: 'Лінія', icon: 'line' },
  { value: 'line-angle', label: 'Кут ліній', icon: 'line-angle' },
  { value: 'calibrate', label: 'Калібрувати', icon: 'ruler' },
]

export const ICONS = {
  undo: 'undo-2',
  resetView: 'rotate-ccw',
  menu: 'menu',
  delete: 'x',
  angle: 'triangle',
  addAngle: 'plus',
  exportImage: 'download',
  copyResults: 'clipboard-copy',
  clearAll: 'trash-2',
  upload: 'upload',
  grid: 'grid-3x3',
  snap: 'magnet',
} as const
