const DB_NAME = 'angulo'
const DB_VERSION = 1
const STORE_IMAGES = 'images'
const CURRENT_KEY = 'current'
const LS_HISTORY_KEY = 'angulo:history'

export interface FileHistoryEntry {
  name: string
  date: string
  size: number
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_IMAGES)) {
        db.createObjectStore(STORE_IMAGES)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveCurrentImage(blob: Blob): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_IMAGES, 'readwrite')
    tx.objectStore(STORE_IMAGES).put(blob, CURRENT_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadCurrentImage(): Promise<Blob | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_IMAGES, 'readonly')
    const req = tx.objectStore(STORE_IMAGES).get(CURRENT_KEY)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function clearCurrentImage(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_IMAGES, 'readwrite')
    tx.objectStore(STORE_IMAGES).delete(CURRENT_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export function loadHistory(): FileHistoryEntry[] {
  try {
    const raw = localStorage.getItem(LS_HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addToHistory(entry: FileHistoryEntry): void {
  const history = loadHistory()
  // Remove duplicate by name
  const filtered = history.filter((h) => h.name !== entry.name)
  filtered.unshift(entry)
  // Keep max 10
  if (filtered.length > 10) filtered.length = 10
  localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(filtered))
}

export function clearHistory(): void {
  localStorage.setItem(LS_HISTORY_KEY, JSON.stringify([]))
}
