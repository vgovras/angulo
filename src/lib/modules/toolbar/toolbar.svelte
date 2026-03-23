<script lang="ts">
  import type { ToolbarViewModel } from './toolbar.svelte.js'
  import type { CanvasViewModel } from '$lib/modules/canvas/canvas.svelte.js'
  import type { PointsViewModel } from '$lib/modules/points/points.svelte.js'
  import type { CalibrationViewModel } from '$lib/modules/calibration/calibration.svelte.js'
  import { TOOL_MODES, ICONS, type ToolMode } from './toolbar'
  import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js'
  import { Button } from '$lib/components/ui/button/index.js'
  import * as Tooltip from '$lib/components/ui/tooltip/index.js'
  import { Badge } from '$lib/components/ui/badge/index.js'
  import Hand from '@lucide/svelte/icons/hand'
  import MapPin from '@lucide/svelte/icons/map-pin'
  import IconLine from './icon-line.svelte'
  import IconRay from './icon-ray.svelte'
  import IconPointAngle from './icon-point-angle.svelte'
  import IconLineAngle from './icon-line-angle.svelte'
  import Ruler from '@lucide/svelte/icons/ruler'
  import Undo2 from '@lucide/svelte/icons/undo-2'
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw'
  import Menu from '@lucide/svelte/icons/menu'
  import Trash2 from '@lucide/svelte/icons/trash-2'
  import Check from '@lucide/svelte/icons/check'

  const modeIcons: Record<string, typeof Hand> = { hand: Hand, 'map-pin': MapPin, 'point-angle': IconPointAngle, line: IconLine, ray: IconRay, 'line-angle': IconLineAngle, ruler: Ruler }

  let {
    toolbarVm,
    canvasVm,
    pointsVm,
    calibrationVm,
    onOpenSheet,
    onResetView,
    onUndo,
    canUndo,
    onModeChange,
    onDeletePoint,
    onCalibrationConfirm,
    calibrationStatus,
  }: {
    toolbarVm: ToolbarViewModel
    canvasVm: CanvasViewModel
    pointsVm: PointsViewModel
    calibrationVm: CalibrationViewModel
    onOpenSheet: () => void
    onResetView: () => void
    onUndo: () => void
    canUndo: boolean
    onModeChange: (mode: ToolMode) => void
    onDeletePoint: () => void
    onCalibrationConfirm: () => void
    calibrationStatus: string
  } = $props()

  function handleModeChange(value: string | undefined) {
    if (value) {
      const mode = value as ToolMode
      toolbarVm.setMode(mode)
      canvasVm.setMode(mode)
      onModeChange(mode)
    }
  }
</script>

<div
  class="fixed bottom-0 left-0 right-0 z-30 flex items-center gap-2 border-t border-border bg-background/95 px-2 py-2 backdrop-blur-sm"
>
  <div class="flex-1 overflow-x-auto scrollbar-none">
    <ToggleGroup.Root
      type="single"
      variant="outline"
      size="lg"
      value={toolbarVm.mode}
      onValueChange={handleModeChange}
      class="w-max"
    >
      {#each TOOL_MODES as mode}
        <ToggleGroup.Item value={mode.value} class="flex-col gap-0 h-auto py-1.5 px-2 shrink-0">
          <svelte:component this={modeIcons[mode.icon]} class="size-5" />
          <span class="text-[9px] leading-none">{mode.label}</span>
        </ToggleGroup.Item>
      {/each}
    </ToggleGroup.Root>
  </div>

  <div class="flex items-center gap-1">
    {#if calibrationVm.isReady}
      <Button size="sm" onclick={onCalibrationConfirm}>
        <Check class="size-4" /> Зберегти
      </Button>
    {/if}

    {#if pointsVm.selected}
      <Tooltip.Root>
        <Tooltip.Trigger>
          <Button variant="destructive" size="icon" onclick={onDeletePoint}>
            <Trash2 class="size-4" />
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content>Видалити точку</Tooltip.Content>
      </Tooltip.Root>
    {/if}

    <Tooltip.Root>
      <Tooltip.Trigger>
        <Button variant="ghost" size="icon" onclick={onUndo} disabled={!canUndo}>
          <Undo2 class="size-4" />
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Content>Відмінити (Ctrl+Z)</Tooltip.Content>
    </Tooltip.Root>

    <Tooltip.Root>
      <Tooltip.Trigger>
        <Button variant="ghost" size="icon" onclick={onOpenSheet}>
          <Menu class="size-4" />
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Content>Точки та кути</Tooltip.Content>
    </Tooltip.Root>
  </div>
</div>
