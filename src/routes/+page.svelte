<script lang="ts">
  import { CanvasViewModel } from '$lib/modules/canvas/canvas.svelte.js'
  import { PointsViewModel } from '$lib/modules/points/points.svelte.js'
  import { AnglesViewModel } from '$lib/modules/angles/angles.svelte.js'
  import { CalibrationViewModel } from '$lib/modules/calibration/calibration.svelte.js'
  import { ToolbarViewModel } from '$lib/modules/toolbar/toolbar.svelte.js'
  import { HistoryManager } from '$lib/modules/history/history.svelte.js'
  import {
    saveCurrentImage,
    loadCurrentImage,
    clearCurrentImage,
    loadHistory,
    addToHistory,
    type FileHistoryEntry,
  } from '$lib/modules/storage/storage'

  import Canvas from '$lib/modules/canvas/canvas.svelte'
  import Toolbar from '$lib/modules/toolbar/toolbar.svelte'
  import Points from '$lib/modules/points/points.svelte'
  import Angles from '$lib/modules/angles/angles.svelte'
  import Calibration from '$lib/modules/calibration/calibration.svelte'

  import * as Drawer from '$lib/components/ui/drawer/index.js'
  import * as Dialog from '$lib/components/ui/dialog/index.js'
  import * as Alert from '$lib/components/ui/alert/index.js'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Switch } from '$lib/components/ui/switch/index.js'
  import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js'
  import { Label } from '$lib/components/ui/label/index.js'
  import { Separator } from '$lib/components/ui/separator/index.js'
  import { Toaster } from '$lib/components/ui/sonner/index.js'
  import { toast } from 'svelte-sonner'
  import Upload from '@lucide/svelte/icons/upload'
  import Download from '@lucide/svelte/icons/download'
  import ClipboardCopy from '@lucide/svelte/icons/clipboard-copy'
  import Trash2 from '@lucide/svelte/icons/trash-2'
  import FolderOpen from '@lucide/svelte/icons/folder-open'
  import LogOut from '@lucide/svelte/icons/log-out'
  import FileImage from '@lucide/svelte/icons/file-image'
  import Clock from '@lucide/svelte/icons/clock'

  const canvasVm = new CanvasViewModel()
  const pointsVm = new PointsViewModel()
  const anglesVm = new AnglesViewModel(pointsVm)
  const calibrationVm = new CalibrationViewModel()
  const toolbarVm = new ToolbarViewModel()
  const history = new HistoryManager()

  let fileHistory = $state<FileHistoryEntry[]>(loadHistory())

  function takeSnapshot() {
    history.snapshot(pointsVm, anglesVm, calibrationVm)
  }

  function handleUndo() {
    history.undo(pointsVm, anglesVm, calibrationVm)
  }

  function handleKeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault()
      handleUndo()
    }
  }

  let drawerOpen = $state(false)
  let calibrationDrawerOpen = $state(false)
  let clearDialogOpen = $state(false)
  let closeDialogOpen = $state(false)
  let fileInput = $state<HTMLInputElement | null>(null)

  // Restore image from IndexedDB on mount
  async function restoreImage() {
    try {
      const blob = await loadCurrentImage()
      if (blob) {
        await canvasVm.loadImage(blob)
      }
    } catch {}
  }

  $effect(() => {
    restoreImage()
  })

  function handleCalibrationOpenChange(v: boolean) {
    calibrationDrawerOpen = v
    if (!v && calibrationVm.isCalibrated) {
      toast.success('Масштаб налаштовано')
    }
  }

  async function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    if (file.size > 20 * 1024 * 1024) {
      toast.error('Файл занадто великий (макс. 20 МБ)')
      return
    }

    try {
      await canvasVm.loadImage(file)
      await saveCurrentImage(file)
      addToHistory({ name: file.name, date: new Date().toISOString(), size: file.size })
      fileHistory = loadHistory()
    } catch {
      toast.error('Не вдалося завантажити зображення')
    }
  }

  async function handleOpenFromHistory(entry: FileHistoryEntry) {
    try {
      const blob = await loadCurrentImage()
      if (blob) {
        await canvasVm.loadImage(blob)
      } else {
        toast.error('Зображення не знайдено в кеші. Завантажте файл знову.')
      }
    } catch {
      toast.error('Не вдалося відкрити зображення')
    }
  }

  function handleClearAll() {
    takeSnapshot()
    pointsVm.clear()
    anglesVm.clear()
    calibrationVm.reset()
    clearDialogOpen = false
    toast.success('Все очищено')
  }

  async function handleCloseProject() {
    canvasVm.clearImage()
    pointsVm.clear()
    anglesVm.clear()
    calibrationVm.reset()
    await clearCurrentImage()
    closeDialogOpen = false
  }

  function handleSelectPoint(id: string) {
    pointsVm.select(id)
  }

  function handleExportImage() {
    const canvas = document.querySelector('canvas')
    if (!canvas) return
    const link = document.createElement('a')
    link.download = 'angulo-export.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
    toast.success('Зображення збережено')
  }

  function handleCopyResults() {
    let text = 'Точки:\n'
    for (const p of pointsVm.items) {
      const x = calibrationVm.toMm(p.x).toFixed(1)
      const y = calibrationVm.toMm(p.y).toFixed(1)
      text += `  ${p.label}: (${x}, ${y})${calibrationVm.isCalibrated ? ' мм' : ' px'}\n`
    }
    text += '\nКути:\n'
    for (const m of anglesVm.measurements) {
      if (m.valueDeg !== null) {
        text += `  ∠${m.label}: ${m.valueDeg}°\n`
      }
    }
    navigator.clipboard.writeText(text)
    toast.success('Скопійовано!')
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} Б`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
  }

  function formatDate(iso: string): string {
    const d = new Date(iso)
    return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }
</script>

<svelte:head>
  <title>Angulo — Цефалометричний аналіз</title>
  <meta name="description" content="Інструмент для ручного цефалометричного аналізу ТРГ" />
</svelte:head>

<svelte:window onkeydown={handleKeydown} />
<Toaster />

<main class="relative h-dvh w-full overflow-hidden">
  {#if !canvasVm.image}
    <!-- Upload screen -->
    <div class="flex h-full items-center justify-center p-6">
      <div class="w-full max-w-sm space-y-6">
        <h1 class="text-center text-xl font-semibold">Angulo</h1>

        <Alert.Root>
          <Alert.Description>
            Завантажте рентгенівський знімок (ТРГ), щоб почати аналіз.
            Зображення не покидає ваш пристрій.
          </Alert.Description>
        </Alert.Root>

        <Button class="w-full" onclick={() => fileInput?.click()}>
          <Upload class="size-4" /> Завантажити зображення
        </Button>
        <p class="text-center text-xs text-muted-foreground">JPG, PNG, WEBP до 20 МБ</p>
        <input
          bind:this={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          class="hidden"
          onchange={handleFileSelect}
        />

        <!-- File history -->
        {#if fileHistory.length > 0}
          <Separator />
          <div class="space-y-2">
            <div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock class="size-4" /> Нещодавні файли
            </div>
            <div class="space-y-1">
              {#each fileHistory as entry}
                <button
                  class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                  onclick={() => handleOpenFromHistory(entry)}
                >
                  <FileImage class="size-4 shrink-0 text-muted-foreground" />
                  <div class="flex-1 min-w-0">
                    <div class="truncate font-medium">{entry.name}</div>
                    <div class="text-xs text-muted-foreground">
                      {formatDate(entry.date)} &middot; {formatFileSize(entry.size)}
                    </div>
                  </div>
                </button>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>
  {:else}
    <!-- Canvas -->
    <Canvas
      {canvasVm}
      {pointsVm}
      {anglesVm}
      {calibrationVm}
      onBeforeAction={takeSnapshot}
    />

    <!-- Toolbar -->
    <Toolbar
      {toolbarVm}
      {canvasVm}
      {pointsVm}
      {calibrationVm}
      calibrationStatus={calibrationVm.statusLabel}
      onOpenSheet={() => (drawerOpen = true)}
      onResetView={() => canvasVm.resetView()}
      onUndo={handleUndo}
      canUndo={history.canUndo}
      onModeChange={(mode) => { if (mode !== 'point') pointsVm.select(null) }}
      onDeletePoint={() => { if (pointsVm.selected) { takeSnapshot(); pointsVm.remove(pointsVm.selected.id) } }}
      onCalibrationConfirm={() => (calibrationDrawerOpen = true)}
    />

    <!-- Calibration sheet -->
    <Calibration
      {calibrationVm}
      open={calibrationDrawerOpen}
      onOpenChange={handleCalibrationOpenChange}
      onBeforeAction={takeSnapshot}
    />

    <!-- Points & Angles drawer -->
    <Drawer.Root bind:open={drawerOpen}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>Точки та кути</Drawer.Title>
        </Drawer.Header>
        <div class="overflow-y-auto px-4" style="max-height: calc(80vh - 5rem)">
          <div class="space-y-4 pb-4">
            <!-- Grid controls -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <Label class="text-xs">Сітка</Label>
                <Switch
                  checked={canvasVm.gridVisible}
                  onCheckedChange={(v) => (canvasVm.gridVisible = v)}
                />
              </div>
              {#if canvasVm.gridVisible}
                <div class="flex items-center justify-between">
                  <Label class="text-xs">Snap до сітки</Label>
                  <Switch
                    checked={canvasVm.snapToGrid}
                    onCheckedChange={(v) => (canvasVm.snapToGrid = v)}
                  />
                </div>
                <div class="flex items-center justify-between">
                  <Label class="text-xs">Крок сітки</Label>
                  <ToggleGroup.Root
                    type="single"
                    value={String(canvasVm.gridStepMm)}
                    onValueChange={(v) => { if (v) canvasVm.gridStepMm = Number(v) }}
                    class="gap-1"
                  >
                    {#each [5, 10, 20] as step}
                      <ToggleGroup.Item value={String(step)} class="h-7 px-2 text-xs">
                        {step} мм
                      </ToggleGroup.Item>
                    {/each}
                  </ToggleGroup.Root>
                </div>
              {/if}
            </div>

            <Separator />

            <!-- Points list -->
            <Points
              {pointsVm}
              {anglesVm}
              onSelectPoint={handleSelectPoint}
              onBeforeAction={takeSnapshot}
            />

            <!-- Angles list -->
            <Angles {anglesVm} {pointsVm} onBeforeAction={takeSnapshot} />

            <Separator />

            <!-- Export & Actions -->
            <div class="flex flex-col gap-2">
              <Button variant="outline" size="sm" onclick={handleExportImage}>
                <Download class="size-4" /> Зберегти зображення
              </Button>
              <Button variant="outline" size="sm" onclick={handleCopyResults}>
                <ClipboardCopy class="size-4" /> Копіювати результати
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onclick={() => (clearDialogOpen = true)}
              >
                <Trash2 class="size-4" /> Очистити все
              </Button>
              <Button
                variant="outline"
                size="sm"
                onclick={() => (closeDialogOpen = true)}
              >
                <LogOut class="size-4" /> Закрити проект
              </Button>
            </div>
          </div>
        </div>
      </Drawer.Content>
    </Drawer.Root>

    <!-- Clear all dialog -->
    <Dialog.Root bind:open={clearDialogOpen}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Очистити всі точки та кути?</Dialog.Title>
          <Dialog.Description>
            Це видалить {pointsVm.items.length} точок та {anglesVm.measurements.length} вимірювань. Дію неможливо скасувати.
          </Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer>
          <Button variant="outline" onclick={() => (clearDialogOpen = false)}>
            Скасувати
          </Button>
          <Button variant="destructive" onclick={handleClearAll}>
            Очистити
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>

    <!-- Close project dialog -->
    <Dialog.Root bind:open={closeDialogOpen}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Закрити проект?</Dialog.Title>
          <Dialog.Description>
            Точки та кути будуть збережені. Зображення потрібно буде завантажити знову.
          </Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer>
          <Button variant="outline" onclick={() => (closeDialogOpen = false)}>
            Скасувати
          </Button>
          <Button onclick={handleCloseProject}>
            Закрити
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  {/if}
</main>
