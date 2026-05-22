<script lang="ts">
  import type { LinesViewModel } from './lines.svelte.js'
  import type { PointsViewModel } from '$lib/modules/points/points.svelte.js'
  import type { CalibrationViewModel } from '$lib/modules/calibration/calibration.svelte.js'
  import type { Point } from '$lib/modules/points/points'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Badge } from '$lib/components/ui/badge/index.js'
  import { Separator } from '$lib/components/ui/separator/index.js'
  import * as Select from '$lib/components/ui/select/index.js'
  import X from '@lucide/svelte/icons/x'
  import Minus from '@lucide/svelte/icons/minus'
  import ArrowRight from '@lucide/svelte/icons/arrow-right'
  import Plus from '@lucide/svelte/icons/plus'
  import Eye from '@lucide/svelte/icons/eye'
  import EyeOff from '@lucide/svelte/icons/eye-off'

  let {
    linesVm,
    pointsVm,
    calibrationVm,
    onBeforeAction,
  }: {
    linesVm: LinesViewModel
    pointsVm: PointsViewModel
    calibrationVm: CalibrationViewModel
    onBeforeAction: () => void
  } = $props()

  function formatLength(px: number | null): string {
    if (px === null) return '—'
    if (calibrationVm.isCalibrated) {
      return `${(calibrationVm.toMm(px) / 10).toFixed(2)} см`
    }
    return `${px.toFixed(0)} px`
  }

  function pointLabel(id: string): string {
    const p = pointsVm.items.find((p: Point) => p.id === id)
    return p ? p.label : '?'
  }

  function lineLabel(lineId: string): string {
    const m = linesVm.measurements.find((m) => m.id === lineId)
    return m ? m.label : '—'
  }
</script>

<div class="space-y-2">
  <Separator />
  <div class="flex items-center justify-between gap-2">
    <h3 class="text-sm font-semibold">
      Лінії ({linesVm.measurements.length})
    </h3>
    {#if linesVm.measurements.length > 0}
      <div class="flex gap-1">
        <Button variant="ghost" size="xs" onclick={() => linesVm.setAllVisible(false)}>
          <EyeOff class="size-3" />
        </Button>
        <Button variant="ghost" size="xs" onclick={() => linesVm.setAllVisible(true)}>
          <Eye class="size-3" />
        </Button>
      </div>
    {/if}
  </div>

  {#if linesVm.measurements.length === 0}
    <p class="text-xs text-muted-foreground">
      Оберіть режим "Лінія" та натисніть на 2 точки
    </p>
  {:else}
    <div class="space-y-1">
      {#each linesVm.measurements as m (m.id)}
        <div
          class="flex items-center justify-between rounded-md px-2 py-1 text-sm hover:bg-muted"
          class:opacity-50={m.visible === false}
        >
          <div class="flex items-center gap-2">
            {#if m.isRay}
              <ArrowRight class="size-3 text-muted-foreground" />
            {:else}
              <Minus class="size-3 text-muted-foreground" />
            {/if}
            <span class="font-medium">{pointLabel(m.pointAId)}—{pointLabel(m.pointBId)}</span>
            <Badge variant="outline" class="px-1 py-0 text-[10px]">
              {formatLength(m.lengthPx)}
            </Badge>
          </div>
          <div class="flex items-center">
            <Button
              variant="ghost"
              size="icon-xs"
              onclick={() => linesVm.setVisible(m.id, m.visible === false)}
            >
              {#if m.visible === false}
                <EyeOff class="size-3" />
              {:else}
                <Eye class="size-3" />
              {/if}
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onclick={() => { onBeforeAction(); linesVm.remove(m.id) }}
            >
              <X class="size-3" />
            </Button>
          </div>
        </div>
      {/each}
    </div>

    <!-- Line angles -->
    {#if linesVm.measurements.length >= 2}
      <div class="space-y-2 pt-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-medium text-muted-foreground">Кути між лініями</span>
          <div class="flex items-center gap-1">
            {#if linesVm.angles.length > 0}
              <Button variant="ghost" size="xs" onclick={() => linesVm.setAllAnglesVisible(false)}>
                <EyeOff class="size-3" />
              </Button>
              <Button variant="ghost" size="xs" onclick={() => linesVm.setAllAnglesVisible(true)}>
                <Eye class="size-3" />
              </Button>
            {/if}
            <Button variant="outline" size="xs" onclick={() => { onBeforeAction(); linesVm.addAngle() }}>
              <Plus class="size-3" /> Кут
            </Button>
          </div>
        </div>

        {#each linesVm.angles as a (a.id)}
          <div class="space-y-1 rounded-md border p-2" class:opacity-50={a.visible === false}>
            <div class="flex items-center justify-between">
              {#if a.valueDeg !== null}
                <Badge>&#x2220; {a.valueDeg}&deg;</Badge>
              {:else}
                <Badge variant="outline">Оберіть 2 лінії</Badge>
              {/if}
              <div class="flex items-center">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onclick={() => linesVm.setAngleVisible(a.id, a.visible === false)}
                >
                  {#if a.visible === false}
                    <EyeOff class="size-3" />
                  {:else}
                    <Eye class="size-3" />
                  {/if}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onclick={() => { onBeforeAction(); linesVm.removeAngle(a.id) }}
                >
                  <X class="size-3" />
                </Button>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-1">
              <Select.Root
                type="single"
                value={a.lineAId}
                onValueChange={(v) => { onBeforeAction(); linesVm.setAngleLine(a.id, 'A', v) }}
              >
                <Select.Trigger class="h-7 text-xs">
                  {#snippet children()}
                    {a.lineAId ? lineLabel(a.lineAId) : 'Лінія 1'}
                  {/snippet}
                </Select.Trigger>
                <Select.Content side="top" sideOffset={4}>
                  {#each linesVm.measurements as line (line.id)}
                    <Select.Item value={line.id}>{line.label}</Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>

              <Select.Root
                type="single"
                value={a.lineBId}
                onValueChange={(v) => { onBeforeAction(); linesVm.setAngleLine(a.id, 'B', v) }}
              >
                <Select.Trigger class="h-7 text-xs">
                  {#snippet children()}
                    {a.lineBId ? lineLabel(a.lineBId) : 'Лінія 2'}
                  {/snippet}
                </Select.Trigger>
                <Select.Content side="top" sideOffset={4}>
                  {#each linesVm.measurements as line (line.id)}
                    <Select.Item value={line.id}>{line.label}</Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>
