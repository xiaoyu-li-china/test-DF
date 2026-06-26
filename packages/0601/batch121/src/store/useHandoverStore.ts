import { create } from 'zustand'

export interface CheckGroup {
  name: string
  emoji: string
  items: string[]
}

export const CHECK_GROUPS: CheckGroup[] = [
  {
    name: '床品',
    emoji: '🛏️',
    items: ['被套更换', '床单平整', '枕套更换', '床垫无污渍'],
  },
  {
    name: '卫浴',
    emoji: '🚿',
    items: ['马桶清洁', '淋浴间干净', '毛巾更换', '洗手台擦拭', '地漏无堵塞', '地面无积水'],
  },
  {
    name: '厨房',
    emoji: '🍳',
    items: ['灶台清洁', '餐具已洗', '冰箱整洁', '垃圾桶清空'],
  },
]

export const ROOMS: string[] = [
  '101', '102', '103',
  '201', '202', '203',
  '301', '302', '303',
  '401', '402', '403',
]

export const ALL_ITEM_KEYS = CHECK_GROUPS.flatMap((g) =>
  g.items.map((item) => `${g.name}::${item}`)
)

export const MIN_PHOTOS = 2

export type UserRole = 'cleaner' | 'manager'

export interface HandoverRecord {
  id: string
  roomNumber: string
  checkedItems: string[]
  photos: string[]
  timestamp: string
  dateKey: string
}

interface HandoverState {
  roomNumber: string
  checkedItems: Set<string>
  photos: string[]
  records: HandoverRecord[]
  step: number
  role: UserRole

  setRole: (role: UserRole) => void
  setRoomNumber: (room: string) => void
  toggleCheckItem: (itemKey: string) => void
  toggleAllInGroup: (group: CheckGroup) => void
  addPhoto: (dataUrl: string) => void
  removePhoto: (index: number) => void
  setStep: (step: number) => void
  getMissingItems: () => string[]
  submit: () => HandoverRecord | null
  reset: () => void
}

const STORAGE_KEY = 'handover_records'
const ROLE_KEY = 'handover_role'

function loadRecords(): HandoverRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveRecords(records: HandoverRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(-50)))
}

function loadRole(): UserRole {
  try {
    return (localStorage.getItem(ROLE_KEY) as UserRole) || 'cleaner'
  } catch {
    return 'cleaner'
  }
}

export const useHandoverStore = create<HandoverState>((set, get) => ({
  roomNumber: '',
  checkedItems: new Set<string>(),
  photos: [],
  records: loadRecords(),
  step: 0,
  role: loadRole(),

  setRole: (role) => {
    localStorage.setItem(ROLE_KEY, role)
    set({ role })
  },

  setRoomNumber: (room) => set({ roomNumber: room, step: 1 }),

  toggleCheckItem: (itemKey) =>
    set((state) => {
      const next = new Set(state.checkedItems)
      if (next.has(itemKey)) {
        next.delete(itemKey)
      } else {
        next.add(itemKey)
      }
      return { checkedItems: next }
    }),

  toggleAllInGroup: (group) =>
    set((state) => {
      const keys = group.items.map((item) => `${group.name}::${item}`)
      const allChecked = keys.every((k) => state.checkedItems.has(k))
      const next = new Set(state.checkedItems)
      if (allChecked) {
        keys.forEach((k) => next.delete(k))
      } else {
        keys.forEach((k) => next.add(k))
      }
      return { checkedItems: next }
    }),

  addPhoto: (dataUrl) =>
    set((state) => {
      if (state.photos.length >= 3) return state
      return { photos: [...state.photos, dataUrl] }
    }),

  removePhoto: (index) =>
    set((state) => ({
      photos: state.photos.filter((_, i) => i !== index),
    })),

  setStep: (step) => set({ step }),

  getMissingItems: () => {
    const { checkedItems } = get()
    return ALL_ITEM_KEYS.filter((key) => !checkedItems.has(key))
  },

  submit: () => {
    const { roomNumber, checkedItems, photos, records } = get()
    if (!roomNumber) return null

    const missing = ALL_ITEM_KEYS.filter((key) => !checkedItems.has(key))
    if (missing.length > 0) return null

    if (photos.length < MIN_PHOTOS) return null

    const plainItems = Array.from(checkedItems).map((key) => {
      const parts = key.split('::')
      return parts.length > 1 ? parts[1] : key
    })

    const now = new Date()
    const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    const record: HandoverRecord = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      roomNumber,
      checkedItems: plainItems,
      photos,
      timestamp: now.toLocaleString('zh-CN'),
      dateKey,
    }

    const nextRecords = [...records, record]
    saveRecords(nextRecords)
    set({ records: nextRecords })
    return record
  },

  reset: () =>
    set({
      roomNumber: '',
      checkedItems: new Set<string>(),
      photos: [],
      step: 0,
    }),
}))
