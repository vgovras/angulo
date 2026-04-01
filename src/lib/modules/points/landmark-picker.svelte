<script lang="ts">
  import { CEPH_LANDMARKS } from './points'
  import type { PointsViewModel } from './points.svelte.js'
  import { Input } from '$lib/components/ui/input/index.js'
  import { Button } from '$lib/components/ui/button/index.js'
  import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte'

  let {
    pointsVm,
    onConfirm,
    onCancel,
  }: {
    pointsVm: PointsViewModel
    onConfirm: (label: string) => void
    onCancel: () => void
  } = $props()

  let query = $state('')
  let inputEl = $state<HTMLInputElement | null>(null)

  const filtered = $derived(
    CEPH_LANDMARKS.filter((name) =>
      name.toLowerCase().includes(query.toLowerCase().trim())
    )
  )

  const pickerWidth = 220
  const pickerHeight = 340

  const pos = $derived(() => {
    if (!pointsVm.pending) return { left: 0, top: 0 }
    const x = Math.min(pointsVm.pending.screenX + 12, window.innerWidth - pickerWidth - 8)
    const y = Math.min(pointsVm.pending.screenY + 12, window.innerHeight - pickerHeight - 8)
    return { left: Math.max(8, x), top: Math.max(8, y) }
  })

  function handleConfirm(label: string) {
    if (label.trim()) onConfirm(label.trim())
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
    if (e.key === 'Enter' && query.trim()) {
      e.preventDefault()
      handleConfirm(query)
    }
  }

  $effect(() => {
    // Focus input when picker appears
    inputEl?.focus()
  })
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Backdrop -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="fixed inset-0 z-40"
  onpointerdown={(e) => { if (e.target === e.currentTarget) onCancel() }}
></div>

<!-- Picker panel -->
<div
  class="fixed z-50 flex w-[220px] flex-col rounded-lg border bg-background shadow-lg"
  style="left: {pos().left}px; top: {pos().top}px;"
>
  <!-- Input row -->
  <div class="flex gap-1.5 border-b p-2">
    <Input
      bind:ref={inputEl}
      placeholder="Назва точки"
      class="h-8 text-sm"
      bind:value={query}
    />
    <Button
      size="sm"
      class="h-8 shrink-0 px-3"
      disabled={!query.trim()}
      onclick={() => handleConfirm(query)}
    >
      +
    </Button>
  </div>

  <!-- Landmark list -->
  <ScrollArea class="h-[280px]">
    <div class="flex flex-col gap-0.5 p-1.5">
      {#each filtered as name}
        {@const used = pointsVm.usedLabels.has(name)}
        <button
          class="rounded px-3 py-1.5 text-left text-sm transition-colors
            {used
              ? 'cursor-default text-muted-foreground opacity-40'
              : 'hover:bg-accent hover:text-accent-foreground'}"
          disabled={used}
          onclick={() => handleConfirm(name)}
        >
          {name}
        </button>
      {/each}
    </div>
  </ScrollArea>
</div>
