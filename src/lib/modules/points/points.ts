export interface Point {
  id: string
  label: string
  x: number
  y: number
  color: string
}

export const CEPH_LANDMARKS = [
  'N', 'S', 'A', 'B', 'Or', 'Ar', 'Po', 'Pt', 'Ba',
  'Me', 'Go', 'Gn', 'Co', 'L', 'N1', 'A1', 'B1',
  'Me1', 'Pog1', '1+', '1-', 'ii+', 'ii-', 'UL', 'LL', 'PNS', 'ANS',
]

export interface PendingPoint {
  x: number
  y: number
  screenX: number
  screenY: number
}

export const POINT_COLORS = [
  '#f97316', // orange
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#a855f7', // purple
  '#ec4899', // pink
  '#eab308', // yellow
]
