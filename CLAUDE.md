# CLAUDE.md — Angulo

Цей файл містить все необхідне для роботи з проектом. Читай його перед тим як писати будь-який код.

---

## Що це за проект

**Angulo** — mobile-first PWA для ручного цефалометричного аналізу ТРГ (телерентгенограм).

Лікар завантажує рентгенівський знімок, калібрує масштаб по лінійці, ставить точки на анатомічних орієнтирах і отримує кути в градусах. Без AI, без реєстрації, без серверів — все локально в браузері.

---

## Стек

| Що | Чим |
|----|-----|
| Framework | SvelteKit + Svelte 5 |
| UI компоненти | shadcn-svelte (`pnpm dlx shadcn-svelte@latest add <component>`) |
| Стилі | Tailwind CSS v4 (вже налаштований разом з shadcn-svelte) |
| Canvas | HTML5 Canvas API (2D context) — без Konva, без Fabric |
| Gestures | Нативний Pointer Events API — touch і mouse уніфіковані |
| PWA | @vite-pwa/sveltekit + Workbox |
| Хостинг | Cloudflare Pages |

---

## Конвенції іменування файлів

### Правило: kebab-case скрізь (як в shadcn-svelte)

```
✅  canvas.svelte
✅  points-sheet.svelte
✅  calibration.svelte.ts
✅  point.ts

❌  CanvasView.svelte
❌  pointsSheet.svelte
❌  CalibrationViewModel.svelte.ts
```

### Три типи файлів — MVVM pattern

| Розширення | Шар | Вміст |
|------------|-----|-------|
| `.ts` | **Model** | Типи, інтерфейси, чиста бізнес-логіка. Без Svelte, без DOM |
| `.svelte.ts` | **ViewModel** | `class XxxViewModel {}` з `$state`, `$derived`, методами. Без DOM |
| `.svelte` | **View** | Тільки шаблон + підключення ViewModel. Мінімум логіки |

---

## Структура проекту

```
src/
├── lib/
│   ├── modules/                          # Основні модулі додатку
│   │   ├── canvas/
│   │   │   ├── canvas.svelte             # View: <canvas>, pointer events
│   │   │   ├── canvas.svelte.ts          # ViewModel: class CanvasViewModel
│   │   │   └── canvas.ts                 # Model: types, drawGrid(), drawPoints()
│   │   │
│   │   ├── points/
│   │   │   ├── points.svelte             # View: список точок (в Sheet)
│   │   │   ├── points.svelte.ts          # ViewModel: class PointsViewModel
│   │   │   └── points.ts                 # Model: interface Point, POINT_COLORS
│   │   │
│   │   ├── angles/
│   │   │   ├── angles.svelte             # View: список кутів + select A/B/C
│   │   │   ├── angles.svelte.ts          # ViewModel: class AnglesViewModel
│   │   │   └── angles.ts                 # Model: interface AngleMeasurement, calcAngle()
│   │   │
│   │   ├── calibration/
│   │   │   ├── calibration.svelte        # View: Sheet з input для мм
│   │   │   ├── calibration.svelte.ts     # ViewModel: class CalibrationViewModel
│   │   │   └── calibration.ts            # Model: interface CalibrationData, distancePx()
│   │   │
│   │   └── toolbar/
│   │       ├── toolbar.svelte            # View: bottom toolbar з Toggle Group
│   │       ├── toolbar.svelte.ts         # ViewModel: class ToolbarViewModel
│   │       └── toolbar.ts                # Model: type ToolMode, TOOL_MODES
│   │
│   └── components/
│       └── ui/                           # shadcn-svelte (не редагувати вручну)
│           ├── button/
│           ├── sheet/
│           ├── dialog/
│           └── ...
│
├── routes/
│   └── +page.svelte                      # Єдина сторінка — збирає всі модулі
└── app.css
```

### Правило модуля

Кожен модуль — папка з трьома файлами з однаковою назвою:

```
modules/canvas/
  canvas.ts          ← Model
  canvas.svelte.ts   ← ViewModel
  canvas.svelte      ← View
```

Якщо модуль потребує додаткових допоміжних файлів — вони теж живуть у папці модуля:

```
modules/canvas/
  canvas.ts
  canvas.svelte.ts
  canvas.svelte
  canvas-draw.ts     ← допоміжний файл модуля (не окремий модуль)
```

---

## MVVM — як писати

### Model (`.ts`) — типи і чиста логіка

```ts
// src/lib/modules/points/points.ts
export interface Point {
  id: string
  label: string
  x: number        // координата на оригінальному зображенні (px)
  y: number
  color: string
}

export const POINT_COLORS = [
  '#f97316', // orange
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#a855f7', // purple
  '#ec4899', // pink
  '#eab308', // yellow
]
```

```ts
// src/lib/modules/angles/angles.ts
import type { Point } from '$lib/modules/points/points'

export interface AngleMeasurement {
  id: string
  label: string            // 'ABC'
  pointAId: string
  pointBId: string         // вершина кута
  pointCId: string
  valueDeg: number | null  // null якщо точки ще не обрані
}

export function calcAngle(a: Point, b: Point, c: Point): number {
  const bax = a.x - b.x
  const bay = a.y - b.y
  const bcx = c.x - b.x
  const bcy = c.y - b.y
  const dot = bax * bcx + bay * bcy
  const mag = Math.sqrt(bax ** 2 + bay ** 2) * Math.sqrt(bcx ** 2 + bcy ** 2)
  return parseFloat(
    (Math.acos(Math.max(-1, Math.min(1, dot / mag))) * (180 / Math.PI)).toFixed(1)
  )
}
```

```ts
// src/lib/modules/calibration/calibration.ts
export interface CalibrationData {
  pxPerMm: number
}

export function distancePx(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)
}
```

```ts
// src/lib/modules/toolbar/toolbar.ts
export type ToolMode = 'pan' | 'point' | 'calibrate'

export const TOOL_MODES: { value: ToolMode; label: string; icon: string }[] = [
  { value: 'pan',       label: 'Рухати',     icon: '🖐️' },
  { value: 'point',     label: 'Точка',      icon: '📍' },
  { value: 'calibrate', label: 'Калібрувати', icon: '📏' },
]
```

---

### ViewModel (`.svelte.ts`) — клас з `$state` і `$derived`

```ts
// src/lib/modules/points/points.svelte.ts
import { nanoid } from 'nanoid'
import { type Point, POINT_COLORS } from './points'

export class PointsViewModel {
  items = $state<Point[]>([])
  selectedId = $state<string | null>(null)

  selected = $derived(
    this.items.find(p => p.id === this.selectedId) ?? null
  )

  add(x: number, y: number) {
    const index = this.items.length
    this.items.push({
      id: nanoid(),
      label: String.fromCharCode(65 + index), // A, B, C...
      x,
      y,
      color: POINT_COLORS[index % POINT_COLORS.length],
    })
  }

  move(id: string, x: number, y: number) {
    const p = this.items.find(p => p.id === id)
    if (p) { p.x = x; p.y = y }
  }

  remove(id: string) {
    this.items = this.items.filter(p => p.id !== id)
    if (this.selectedId === id) this.selectedId = null
  }

  rename(id: string, label: string) {
    const p = this.items.find(p => p.id === id)
    if (p) p.label = label
  }

  select(id: string | null) { this.selectedId = id }

  clear() { this.items = []; this.selectedId = null }
}
```

```ts
// src/lib/modules/canvas/canvas.svelte.ts
import type { ToolMode } from '$lib/modules/toolbar/toolbar'

export class CanvasViewModel {
  zoom  = $state(1)
  panX  = $state(0)
  panY  = $state(0)
  mode  = $state<ToolMode>('pan')
  image = $state<HTMLImageElement | null>(null)

  setMode(m: ToolMode) { this.mode = m }

  applyZoom(delta: number, ox: number, oy: number) {
    const factor = delta > 0 ? 0.9 : 1.1
    const next = Math.max(0.5, Math.min(10, this.zoom * factor))
    this.panX = ox - (ox - this.panX) * (next / this.zoom)
    this.panY = oy - (oy - this.panY) * (next / this.zoom)
    this.zoom = next
  }

  screenToImage(sx: number, sy: number) {
    return { x: (sx - this.panX) / this.zoom, y: (sy - this.panY) / this.zoom }
  }

  resetView() { this.zoom = 1; this.panX = 0; this.panY = 0 }
}
```

```ts
// src/lib/modules/calibration/calibration.svelte.ts
import { distancePx } from './calibration'

export class CalibrationViewModel {
  pxPerMm       = $state<number | null>(null)
  isCalibrating = $state(false)
  pending       = $state<{ x: number; y: number }[]>([])

  isCalibrated = $derived(this.pxPerMm !== null)
  statusLabel  = $derived(
    this.pxPerMm
      ? `1 см = ${(this.pxPerMm * 10).toFixed(1)}px`
      : 'Масштаб не налаштовано'
  )

  start()  { this.isCalibrating = true; this.pending = [] }
  addPoint(x: number, y: number) { this.pending.push({ x, y }) }

  confirm(distanceMm: number) {
    const [p1, p2] = this.pending
    this.pxPerMm = distancePx(p1, p2) / distanceMm
    this.isCalibrating = false
    this.pending = []
  }

  reset() { this.pxPerMm = null; this.isCalibrating = false; this.pending = [] }
  toMm(px: number) { return this.pxPerMm ? px / this.pxPerMm : px }
}
```

```ts
// src/lib/modules/toolbar/toolbar.svelte.ts
import { type ToolMode } from './toolbar'

export class ToolbarViewModel {
  mode = $state<ToolMode>('pan')
  setMode(m: ToolMode) { this.mode = m }
}
```

---

### View (`.svelte`) — тільки шаблон

```svelte
<!-- src/lib/modules/canvas/canvas.svelte -->
<script lang="ts">
  import type { CanvasViewModel } from './canvas.svelte'
  import type { PointsViewModel } from '$lib/modules/points/points.svelte'

  let { canvasVm, pointsVm }: {
    canvasVm: CanvasViewModel
    pointsVm: PointsViewModel
  } = $props()

  let el = $state<HTMLCanvasElement | null>(null)

  function onPointerDown(e: PointerEvent) {
    if (canvasVm.mode === 'point') {
      const { x, y } = canvasVm.screenToImage(e.offsetX, e.offsetY)
      pointsVm.add(x, y)
    }
  }
</script>

<canvas bind:this={el} class="touch-none w-full h-full" onpointerdown={onPointerDown} />
```

---

### Інстанціювання — у `+page.svelte`

```svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
  import { CanvasViewModel }      from '$lib/modules/canvas/canvas.svelte'
  import { PointsViewModel }      from '$lib/modules/points/points.svelte'
  import { AnglesViewModel }      from '$lib/modules/angles/angles.svelte'
  import { CalibrationViewModel } from '$lib/modules/calibration/calibration.svelte'
  import { ToolbarViewModel }     from '$lib/modules/toolbar/toolbar.svelte'

  import Canvas      from '$lib/modules/canvas/canvas.svelte'
  import Toolbar     from '$lib/modules/toolbar/toolbar.svelte'
  import Points      from '$lib/modules/points/points.svelte'
  import Calibration from '$lib/modules/calibration/calibration.svelte'

  const canvasVm      = new CanvasViewModel()
  const pointsVm      = new PointsViewModel()
  const anglesVm      = new AnglesViewModel(pointsVm)
  const calibrationVm = new CalibrationViewModel()
  const toolbarVm     = new ToolbarViewModel()
</script>

<main class="relative h-dvh w-full overflow-hidden">
  <Canvas      {canvasVm} {pointsVm} {anglesVm} {calibrationVm} />
  <Toolbar     {toolbarVm} {canvasVm} />
  <Points      {pointsVm} {anglesVm} {calibrationVm} />
  <Calibration {calibrationVm} />
</main>
```

---

## Canvas — як працює

При кожному `requestAnimationFrame`:
1. `ctx.clearRect()`
2. `ctx.setTransform(zoom, 0, 0, zoom, panX, panY)`
3. `ctx.drawImage(image)`
4. `drawGrid(ctx, calibrationVm)`
5. `drawPoints(ctx, pointsVm.items)`
6. `drawAngles(ctx, anglesVm.measurements, pointsVm.items)`
7. `drawHandle(ctx, pointsVm.selected)` — якщо є обрана точка

Логіка малювання — в `src/lib/modules/canvas/canvas-draw.ts` (допоміжний файл модуля).

---

## Drag handle — деталь UX

```ts
// src/lib/modules/canvas/canvas-draw.ts
const HANDLE_SIZE = 44
const OFFSET_X    = 20    // правіше від точки
const OFFSET_Y    = -20   // вище від точки

export function drawHandle(ctx: CanvasRenderingContext2D, point: Point) {
  const hx = point.x + OFFSET_X
  const hy = point.y + OFFSET_Y

  ctx.setLineDash([3, 3])
  ctx.beginPath()
  ctx.moveTo(point.x, point.y)
  ctx.lineTo(hx + HANDLE_SIZE / 2, hy + HANDLE_SIZE / 2)
  ctx.strokeStyle = point.color
  ctx.stroke()
  ctx.setLineDash([])

  ctx.fillStyle   = 'rgba(255,255,255,0.9)'
  ctx.strokeStyle = point.color
  ctx.lineWidth   = 2
  ctx.fillRect(hx, hy, HANDLE_SIZE, HANDLE_SIZE)
  ctx.strokeRect(hx, hy, HANDLE_SIZE, HANDLE_SIZE)
}
```

> Handle — кастомний Canvas-елемент, **не** shadcn-svelte компонент. Малюється через `ctx.fillRect()`.

---

## localStorage — що зберігати

```ts
// у $effect всередині ViewModel
pointsVm.items            → 'angulo:points'
anglesVm.measurements     → 'angulo:angles'
calibrationVm.pxPerMm     → 'angulo:calibration'

// НЕ зберігати
canvasVm.image            // HTMLImageElement не серіалізується
canvasVm.zoom / pan       // скидається при перезавантаженні — ок
```

---

## Shadcn-svelte компоненти — які використовуємо

| Компонент | Де |
|-----------|-----|
| `button` | Тулбар, експорт, всі кнопки |
| `toggle-group` | Вибір режиму (Pan / Point / Calibrate) у toolbar |
| `sheet` (side="bottom") | Список точок і кутів на мобільному |
| `dialog` | Підтвердження "Очистити все?" |
| `tooltip` | Підказки на десктопі |
| `input` | Калібрування (мм), перейменування точки |
| `label` | До всіх Input |
| `select` | Вибір точок A/B/C для кута |
| `separator` | Між секціями в Sheet |
| `badge` | Значення кута `∠ABC: 82.4°` |
| `scroll-area` | Список точок в Sheet |
| `switch` | Snap до сітки on/off |
| `slider` | Крок сітки (5/10/20 мм) |
| `sonner` | Toasts: "Скопійовано!", помилки |
| `alert` | Стартовий екран без зображення |
| `skeleton` | Завантаження зображення |
| `spinner` | Завантаження великого файлу |

---

## Що НЕ треба робити

- **Не використовувати Konva.js або Fabric.js** — тільки нативний Canvas API
- **Не використовувати Hammer.js** — тільки Pointer Events API
- **Не робити запити на сервер** — додаток повністю офлайн
- **Не зберігати зображення в localStorage** — тільки метадані
- **Не використовувати старі Svelte stores** (`writable`, `derived`) — тільки Svelte 5 runes
- **Не редагувати файли в `src/lib/components/ui/`** — оновлюються через CLI
- **Не писати логіку у `.svelte` файлах** — тільки у ViewModel
- **Не використовувати PascalCase для назв файлів** — тільки kebab-case
- **Не виносити файли модуля за межі його папки** — canvas-draw.ts живе в `modules/canvas/`, не в `utils/`

---

## Out of scope (не реалізовувати в MVP)

- AI-автотрейсинг
- Готові шаблони аналізів (Steiner, Ricketts тощо)
- Порівняння з нормами
- Лінійні вимірювання між точками
- Збереження кількох сесій / пацієнтів
- PDF-звіт
- Суперімпозиція двох знімків
- 3D / CBCT
- Хмарна синхронізація

---

## Команди

```bash
pnpm dev          # розробка
pnpm build        # білд
pnpm check        # перевірка типів

pnpm dlx shadcn-svelte@latest add <component>  # додати компонент
```

---

## Деплой (Cloudflare Pages)

- Build command: `pnpm build`
- Output directory: `.svelte-kit/cloudflare`
- Adapter: `@sveltejs/adapter-auto` у `svelte.config.js`

---

## Context7 MCP

Перед тим як писати код для будь-якої бібліотеки — отримуй актуальну документацію через Context7 MCP.

### Коли використовувати

Завжди викликай Context7 для:
- **SvelteKit** — routing, adapters, hooks
- **Svelte 5** — runes (`$state`, `$derived`, `$effect`, `$props`)
- **shadcn-svelte** — встановлення компонентів, їх API та пропси
- **Tailwind CSS v4** — нові утиліти, синтаксис що змінився з v3
- **@vite-pwa/sveltekit** — конфігурація Service Worker

### Як використовувати

```
1. resolve_library_id  →  знайти ID бібліотеки
2. get_library_docs    →  отримати документацію по темі
```

### Приклади запитів

```
# Svelte 5 runes
resolve_library_id("svelte")
get_library_docs(id, topic="runes $state $derived class")

# SvelteKit
resolve_library_id("sveltekit")
get_library_docs(id, topic="adapter-auto cloudflare pages")

# shadcn-svelte
resolve_library_id("shadcn-svelte")
get_library_docs(id, topic="sheet toggle-group select")

# Tailwind v4
resolve_library_id("tailwindcss")
get_library_docs(id, topic="v4 migration utilities")
```

### Правило

Не покладайся на знання з тренування для API бібліотек — воно може бути застарілим. Context7 завжди актуальний.
