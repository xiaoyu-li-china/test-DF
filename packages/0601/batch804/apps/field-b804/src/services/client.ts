interface FloorAware {
  floorId: string
}

interface CheckItem extends FloorAware {
  id: string
  title: string
  description: string
  checked: boolean
}

interface PhotoEntry extends FloorAware {
  id: string
  dataUrl: string
  timestamp: number
  status: 'pending' | 'syncing' | 'success' | 'failed'
  error?: string
  checklistItemId: string | null
}

interface SyncLogEntry {
  type: 'success' | 'error'
  message: string
  timestamp: number
}

const KEYS = {
  CHECKLIST: 'field_checklist',
  PHOTO_QUEUE: 'field_photo_queue',
  SYNC_LOG: 'field_sync_log',
  CURRENT_FLOOR: 'field_current_floor'
} as const

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

function filterByFloor<T extends FloorAware>(items: T[], floorId: string): T[] {
  return items.filter(item => item.floorId === floorId)
}

class StoreClient {
  private currentFloor: string

  constructor() {
    this.currentFloor = read<string>(KEYS.CURRENT_FLOOR, 'F1')
  }

  getFloor(): string {
    return this.currentFloor
  }

  setFloor(floorId: string): void {
    this.currentFloor = floorId
    write(KEYS.CURRENT_FLOOR, floorId)
  }

  getChecklist(floorId?: string): CheckItem[] {
    const target = floorId ?? this.currentFloor
    const all = read<CheckItem[]>(KEYS.CHECKLIST, [])
    return filterByFloor(all, target)
  }

  setChecklist(items: CheckItem[], floorId?: string): boolean {
    const target = floorId ?? this.currentFloor
    const all = read<CheckItem[]>(KEYS.CHECKLIST, [])
    const others = all.filter(item => item.floorId !== target)
    return write(KEYS.CHECKLIST, [...others, ...items])
  }

  toggleCheckItem(id: string, floorId?: string): CheckItem[] {
    const target = floorId ?? this.currentFloor
    const all = read<CheckItem[]>(KEYS.CHECKLIST, [])
    const updated = all.map(item =>
      item.id === id && item.floorId === target
        ? { ...item, checked: !item.checked }
        : item
    )
    write(KEYS.CHECKLIST, updated)
    return filterByFloor(updated, target)
  }

  resetChecklist(floorId?: string): CheckItem[] {
    const target = floorId ?? this.currentFloor
    const all = read<CheckItem[]>(KEYS.CHECKLIST, [])
    const updated = all.map(item =>
      item.floorId === target ? { ...item, checked: false } : item
    )
    write(KEYS.CHECKLIST, updated)
    return filterByFloor(updated, target)
  }

  getPhotoQueue(floorId?: string): PhotoEntry[] {
    const target = floorId ?? this.currentFloor
    const all = read<PhotoEntry[]>(KEYS.PHOTO_QUEUE, [])
    return filterByFloor(all, target)
  }

  getAllPhotoQueue(): PhotoEntry[] {
    return read<PhotoEntry[]>(KEYS.PHOTO_QUEUE, [])
  }

  setPhotoQueue(items: PhotoEntry[]): boolean {
    return write(KEYS.PHOTO_QUEUE, items)
  }

  addPhoto(photo: Omit<PhotoEntry, 'floorId'>, floorId?: string): PhotoEntry {
    const target = floorId ?? this.currentFloor
    const all = read<PhotoEntry[]>(KEYS.PHOTO_QUEUE, [])
    const entry: PhotoEntry = { ...photo, floorId: target }
    all.push(entry)
    write(KEYS.PHOTO_QUEUE, all)
    return entry
  }

  updatePhotoStatus(id: string, status: PhotoEntry['status'], error?: string, floorId?: string): void {
    const target = floorId ?? this.currentFloor
    const all = read<PhotoEntry[]>(KEYS.PHOTO_QUEUE, [])
    const idx = all.findIndex(p => p.id === id && p.floorId === target)
    if (idx !== -1) {
      all[idx].status = status
      if (error) all[idx].error = error
      write(KEYS.PHOTO_QUEUE, all)
    }
  }

  removePhoto(id: string): void {
    const all = read<PhotoEntry[]>(KEYS.PHOTO_QUEUE, [])
    write(KEYS.PHOTO_QUEUE, all.filter(p => p.id !== id))
  }

  getSyncLog(): SyncLogEntry[] {
    return read<SyncLogEntry[]>(KEYS.SYNC_LOG, [])
  }

  addSyncLog(entry: Omit<SyncLogEntry, 'timestamp'>): boolean {
    const logs = this.getSyncLog()
    logs.unshift({ ...entry, timestamp: Date.now() })
    return write(KEYS.SYNC_LOG, logs.slice(0, 100))
  }

  clearSyncLog(): boolean {
    return write(KEYS.SYNC_LOG, [])
  }

  getPhotoStats(floorId?: string): {
    total: number
    pending: number
    syncing: number
    success: number
    failed: number
  } {
    const items = this.getPhotoQueue(floorId)
    return {
      total: items.length,
      pending: items.filter(p => p.status === 'pending').length,
      syncing: items.filter(p => p.status === 'syncing').length,
      success: items.filter(p => p.status === 'success').length,
      failed: items.filter(p => p.status === 'failed').length,
    }
  }

  getChecklistProgress(floorId?: string): number {
    const items = this.getChecklist(floorId)
    if (items.length === 0) return 0
    return Math.round((items.filter(i => i.checked).length / items.length) * 100)
  }
}

export const client = new StoreClient()
export type { CheckItem, PhotoEntry, SyncLogEntry, FloorAware }
export default client
