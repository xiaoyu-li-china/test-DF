import { create } from 'zustand'
import type { Photo, PhotoStatus, Scene } from '@/data/mockPhotos'
import { mockPhotos, SCENE_LABELS } from '@/data/mockPhotos'

// ============================================================================
// 摄影师 SaaS API 接入说明
// ============================================================================
// 当接入真实的摄影师 SaaS 平台时，请按以下方式改造此 store:
//
// 1. 初始化加载：从 API 获取相册照片
//    const loadPhotos = async (albumId: string) => {
//      const { data } = await fetch(`/api/albums/${albumId}/photos`)
//      set({ photos: data.photos })
//    }
//
// 2. 状态更新：实时同步到后端
//    setPhotoStatus: async (id, status) => {
//      await fetch(`/api/albums/${albumId}/photos/${id}`, {
//        method: 'PATCH',
//        body: JSON.stringify({ status })
//      })
//      // 乐观更新
//      set(...)
//    }
//
// 3. 批量提交：选片完成后一键提交
//    const submitSelections = async () => {
//      const selections = get().photos
//        .filter(p => p.status !== 'undecided')
//        .map(p => ({ photoId: p.id, status: p.status, note: p.note }))
//
//      await fetch(`/api/albums/${albumId}/selections/batch`, {
//        method: 'POST',
//        body: JSON.stringify({ selections })
//      })
//    }
//
// 4. 导出：调用后端导出接口获取正式文件
//    exportCSV: async () => {
//      const blob = await fetch(`/api/albums/${albumId}/selections/export`)
//      download(blob)
//    }
// ============================================================================

export type StatusFilter = 'all' | 'selected' | 'rejected' | 'undecided'

interface Counts {
  selected: number
  rejected: number
  undecided: number
  total: number
}

interface SelectionStore {
  photos: Photo[]
  statusFilter: StatusFilter
  sceneFilter: Scene | 'all'
  isPhotographerMode: boolean
  setStatusFilter: (filter: StatusFilter) => void
  setSceneFilter: (scene: Scene | 'all') => void
  setPhotoStatus: (id: string, status: PhotoStatus) => void
  toggleLock: (id: string) => void
  updateNote: (id: string, note: string) => void
  togglePhotographerMode: () => void
  getCounts: () => Counts
  getFilteredPhotos: () => Photo[]
  exportCSV: () => string
  reset: (photos?: Photo[]) => void
}

export const useSelectionStore = create<SelectionStore>((set, get) => ({
  photos: mockPhotos,
  statusFilter: 'all',
  sceneFilter: 'all',
  isPhotographerMode: false,

  setStatusFilter: (statusFilter) => set({ statusFilter }),

  setSceneFilter: (sceneFilter) => set({ sceneFilter }),

  setPhotoStatus: (id, status) =>
    set((state) => ({
      photos: state.photos.map((p) => {
        if (p.id !== id) return p
        if (p.locked && !state.isPhotographerMode && status !== 'selected') return p
        return { ...p, status }
      }),
    })),

  toggleLock: (id) =>
    set((state) => ({
      photos: state.photos.map((p) => {
        if (p.id !== id) return p
        const newLocked = !p.locked
        return {
          ...p,
          locked: newLocked,
          status: newLocked ? 'selected' : p.status,
        }
      }),
    })),

  updateNote: (id, note) =>
    set((state) => ({
      photos: state.photos.map((p) => (p.id === id ? { ...p, note } : p)),
    })),

  togglePhotographerMode: () =>
    set((state) => ({ isPhotographerMode: !state.isPhotographerMode })),

  reset: (photos) =>
    set({
      photos: photos ?? mockPhotos,
      statusFilter: 'all',
      sceneFilter: 'all',
      isPhotographerMode: false,
    }),

  getCounts: () => {
    const photos = get().photos
    return {
      selected: photos.filter((p) => p.status === 'selected').length,
      rejected: photos.filter((p) => p.status === 'rejected').length,
      undecided: photos.filter((p) => p.status === 'undecided').length,
      total: photos.length,
    }
  },

  getFilteredPhotos: () => {
    const { photos, statusFilter, sceneFilter } = get()
    return photos.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (sceneFilter !== 'all' && p.scene !== sceneFilter) return false
      return true
    })
  },

  exportCSV: () => {
    const photos = get().photos.filter((p) => p.status === 'selected')
    const header = '文件名,场景,备注,是否锁定'
    const rows = photos.map((p) => {
      const sceneLabel = SCENE_LABELS[p.scene]
      const escapedNote = `"${p.note.replace(/"/g, '""')}"`
      return `${p.id},${sceneLabel},${escapedNote},${p.locked ? '是' : '否'}`
    })
    return [header, ...rows].join('\n')
  },
}))
