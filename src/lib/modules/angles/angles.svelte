<script lang="ts">
  import type { AnglesViewModel } from './angles.svelte.js'
  import type { PointsViewModel } from '$lib/modules/points/points.svelte.js'
  import type { Point } from '$lib/modules/points/points'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Badge } from '$lib/components/ui/badge/index.js'
  import * as Select from '$lib/components/ui/select/index.js'
  import { Separator } from '$lib/components/ui/separator/index.js'
  import X from '@lucide/svelte/icons/x'
  import Plus from '@lucide/svelte/icons/plus'

  let {
    anglesVm,
    pointsVm,
    onBeforeAction,
  }: {
    anglesVm: AnglesViewModel
    pointsVm: PointsViewModel
    onBeforeAction: () => void
  } = $props()

  function handlePointChange(
    measurementId: string,
    slot: 'A' | 'B' | 'C',
    value: string
  ) {
    onBeforeAction()
    if (slot === 'A') anglesVm.setPointA(measurementId, value)
    else if (slot === 'B') anglesVm.setPointB(measurementId, value)
    else anglesVm.setPointC(measurementId, value)
  }
</script>

<div class="space-y-2">
  <Separator />
  <div class="flex items-center justify-between">
    <h3 class="text-sm font-semibold">
      Кути ({anglesVm.measurements.length})
    </h3>
    <Button variant="outline" size="xs" onclick={() => { onBeforeAction(); anglesVm.add() }}>
      <Plus class="size-3" /> Кут
    </Button>
  </div>

  {#if anglesVm.measurements.length === 0}
    <p class="text-xs text-muted-foreground">
      Додайте кут, щоб виміряти градуси між точками
    </p>
  {:else}
    <div class="space-y-3">
      {#each anglesVm.measurements as m (m.id)}
        <div class="space-y-1 rounded-md border p-2">
          <div class="flex items-center justify-between">
            {#if m.valueDeg !== null}
              <Badge>&#x2220;{m.label}: {m.valueDeg}&deg;</Badge>
            {:else}
              <Badge variant="outline">Оберіть 3 точки</Badge>
            {/if}
            <Button
              variant="ghost"
              size="icon-xs"
              onclick={() => { onBeforeAction(); anglesVm.remove(m.id) }}
            >
              <X class="size-3" />
            </Button>
          </div>

          <div class="grid grid-cols-3 gap-1">
            {#each ['A', 'B', 'C'] as slot}
              <Select.Root
                type="single"
                value={slot === 'A' ? m.pointAId : slot === 'B' ? m.pointBId : m.pointCId}
                onValueChange={(v) => handlePointChange(m.id, slot as 'A' | 'B' | 'C', v)}
              >
                <Select.Trigger class="h-7 text-xs">
                  {#snippet children()}
                    {(() => {
                      const pid = slot === 'A' ? m.pointAId : slot === 'B' ? m.pointBId : m.pointCId
                      const pt = pointsVm.items.find((p: Point) => p.id === pid)
                      return pt ? pt.label : slot
                    })()}
                  {/snippet}
                </Select.Trigger>
                <Select.Content>
                  {#each pointsVm.items as point (point.id)}
                    <Select.Item value={point.id}>{point.label}</Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
