<script lang="ts">
  import type { CalibrationViewModel } from './calibration.svelte.js'
  import * as Drawer from '$lib/components/ui/drawer/index.js'
  import { Input } from '$lib/components/ui/input/index.js'
  import { Label } from '$lib/components/ui/label/index.js'
  import { Button } from '$lib/components/ui/button/index.js'

  let {
    calibrationVm,
    open,
    onOpenChange,
    onBeforeAction,
  }: {
    calibrationVm: CalibrationViewModel
    open: boolean
    onOpenChange: (v: boolean) => void
    onBeforeAction: () => void
  } = $props()

  let distanceMm = $state('10')

  function handleConfirm() {
    const mm = parseFloat(distanceMm)
    if (mm > 0) {
      onBeforeAction()
      calibrationVm.confirm(mm)
      onOpenChange(false)
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') handleConfirm()
  }
</script>

<Drawer.Root {open} {onOpenChange}>
  <Drawer.Content>
    <Drawer.Header>
      <Drawer.Title>Калібрування масштабу</Drawer.Title>
      <Drawer.Description>
        Введіть реальну відстань між двома точками, які ви поставили на лінійці
      </Drawer.Description>
    </Drawer.Header>
    <div class="px-4 pb-6 space-y-4">
      <div class="space-y-2">
        <Label for="cal-distance">Відстань між точками (мм)</Label>
        <Input
          id="cal-distance"
          type="number"
          min="1"
          step="1"
          value={distanceMm}
          oninput={(e: Event) => distanceMm = (e.target as HTMLInputElement).value}
          onkeydown={handleKeydown}
        />
      </div>
      <Drawer.Footer class="px-0">
        <Button size="lg" class="w-full" onclick={handleConfirm}>Підтвердити</Button>
        <Drawer.Close>
          <Button variant="outline" class="w-full" onclick={() => { onBeforeAction(); calibrationVm.reset(); onOpenChange(false) }}>
            Скинути
          </Button>
        </Drawer.Close>
      </Drawer.Footer>
    </div>
  </Drawer.Content>
</Drawer.Root>
