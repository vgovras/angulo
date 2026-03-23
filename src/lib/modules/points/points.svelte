<script lang="ts">
  import type { PointsViewModel } from './points.svelte.js'
  import type { AnglesViewModel } from '$lib/modules/angles/angles.svelte.js'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Input } from '$lib/components/ui/input/index.js'
  import { Separator } from '$lib/components/ui/separator/index.js'
  import { Badge } from '$lib/components/ui/badge/index.js'
  import X from '@lucide/svelte/icons/x'
  import Pencil from '@lucide/svelte/icons/pencil'

  let {
    pointsVm,
    anglesVm,
    onSelectPoint,
    onBeforeAction,
  }: {
    pointsVm: PointsViewModel
    anglesVm: AnglesViewModel
    onSelectPoint: (id: string) => void
    onBeforeAction: () => void
  } = $props()

  function anglesForPoint(pointId: string): string[] {
    return anglesVm.measurements
      .filter(m => m.pointAId === pointId || m.pointBId === pointId || m.pointCId === pointId)
      .filter(m => m.label)
      .map(m => m.label)
  }

  let editingId = $state<string | null>(null)
  let editValue = $state('')

  function startRename(id: string, label: string) {
    editingId = id
    editValue = label
  }

  function confirmRename(id: string) {
    if (editValue.trim()) {
      onBeforeAction()
      pointsVm.rename(id, editValue.trim())
      anglesVm.recalcAll()
    }
    editingId = null
  }

  function handleKeydown(e: KeyboardEvent, id: string) {
    if (e.key === 'Enter') confirmRename(id)
    if (e.key === 'Escape') editingId = null
  }
</script>

<div class="space-y-2">
  <h3 class="text-sm font-semibold">Точки ({pointsVm.items.length})</h3>
  {#if pointsVm.items.length === 0}
    <p class="text-xs text-muted-foreground">
      Оберіть режим "Точка" та натисніть на знімок
    </p>
  {:else}
    <div class="space-y-1">
      {#each pointsVm.items as point (point.id)}
        <div
          class="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted"
          class:bg-muted={pointsVm.selectedId === point.id}
        >
          <span
            class="h-3 w-3 shrink-0 rounded-full"
            style="background-color: {point.color}"
          ></span>

          {#if editingId === point.id}
            <Input
              class="h-6 w-16 px-1 text-xs"
              value={editValue}
              oninput={(e: Event) => editValue = (e.target as HTMLInputElement).value}
              onblur={() => confirmRename(point.id)}
              onkeydown={(e: KeyboardEvent) => handleKeydown(e, point.id)}
            />
          {:else}
            <button
              class="flex-1 text-left text-xs"
              onclick={() => onSelectPoint(point.id)}
            >
              <span class="font-medium">{point.label}</span>
              <span class="text-muted-foreground">
                ({point.x.toFixed(0)}, {point.y.toFixed(0)})
              </span>
              {#each anglesForPoint(point.id) as angleLabel}
                <Badge variant="outline" class="ml-1 px-1 py-0 text-[10px]">
                  &#x2220;{angleLabel}
                </Badge>
              {/each}
            </button>
            <Button
              variant="ghost"
              size="icon-xs"
              onclick={() => startRename(point.id, point.label)}
            >
              <Pencil class="size-3" />
            </Button>
          {/if}

          <Button
            variant="ghost"
            size="icon-xs"
            onclick={() => { onBeforeAction(); pointsVm.remove(point.id) }}
          >
            <X class="size-3" />
          </Button>
        </div>
      {/each}
    </div>
  {/if}
</div>
