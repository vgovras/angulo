<script lang="ts">
  import type { ToolbarViewModel } from './toolbar.svelte.js'
  import type { CanvasViewModel } from '$lib/modules/canvas/canvas.svelte.js'
  import { TOOL_MODES, ICONS, type ToolMode } from './toolbar'
  import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js'
  import { Button } from '$lib/components/ui/button/index.js'
  import * as Tooltip from '$lib/components/ui/tooltip/index.js'
  import { Badge } from '$lib/components/ui/badge/index.js'
  import Hand from '@lucide/svelte/icons/hand'
  import MapPin from '@lucide/svelte/icons/map-pin'
  import Ruler from '@lucide/svelte/icons/ruler'
  import Undo2 from '@lucide/svelte/icons/undo-2'
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw'
  import Menu from '@lucide/svelte/icons/menu'

  const modeIcons: Record<string, typeof Hand> = { hand: Hand, 'map-pin': MapPin, ruler: Ruler }

  let {
    toolbarVm,
    canvasVm,
    onOpenSheet,
    onResetView,
    onUndo,
    canUndo,
    onModeChange,
    calibrationStatus,
  }: {
    toolbarVm: ToolbarViewModel
    canvasVm: CanvasViewModel
    onOpenSheet: () => void
    onResetView: () => void
    onUndo: () => void
    canUndo: boolean
    onModeChange: (mode: ToolMode) => void
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
  class="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between gap-2 border-t border-border bg-background/95 px-3 py-2 backdrop-blur-sm"
>
  <ToggleGroup.Root
    type="single"
    value={toolbarVm.mode}
    onValueChange={handleModeChange}
    class="gap-1"
  >
    {#each TOOL_MODES as mode}
      <Tooltip.Root>
        <Tooltip.Trigger>
          <ToggleGroup.Item value={mode.value} class="h-10 w-10">
            <svelte:component this={modeIcons[mode.icon]} class="size-5" />
          </ToggleGroup.Item>
        </Tooltip.Trigger>
        <Tooltip.Content>{mode.label}</Tooltip.Content>
      </Tooltip.Root>
    {/each}
  </ToggleGroup.Root>

  <div class="flex items-center gap-1">
    <Badge variant="outline" class="hidden text-xs sm:inline-flex">
      {calibrationStatus}
    </Badge>

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
        <Button variant="ghost" size="icon" onclick={onResetView}>
          <RotateCcw class="size-4" />
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Content>Скинути вигляд</Tooltip.Content>
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
