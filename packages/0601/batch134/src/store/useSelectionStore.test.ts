import { describe, it, expect, beforeEach } from 'vitest'
import { useSelectionStore } from '@/store/useSelectionStore'
import { generateTestPhotos } from '@/test/testData'

describe('useSelectionStore', () => {
  beforeEach(() => {
    const testPhotos = generateTestPhotos(50)
    useSelectionStore.getState().reset(testPhotos)
  })

  describe('勾选/取消功能', () => {
    it('点击「要」后状态变为 selected，计数增加', () => {
      const store = useSelectionStore.getState()
      const firstPhoto = store.photos[0]

      expect(firstPhoto.status).toBe('undecided')
      expect(store.getCounts().selected).toBe(0)

      store.setPhotoStatus(firstPhoto.id, 'selected')

      const updatedPhoto = useSelectionStore.getState().photos[0]
      expect(updatedPhoto.status).toBe('selected')
      expect(useSelectionStore.getState().getCounts().selected).toBe(1)
    })

    it('再次点击「要」后状态回到 undecided', () => {
      const store = useSelectionStore.getState()
      const firstPhoto = store.photos[0]

      store.setPhotoStatus(firstPhoto.id, 'selected')
      useSelectionStore.getState().setPhotoStatus(firstPhoto.id, 'undecided')

      const updatedPhoto = useSelectionStore.getState().photos[0]
      expect(updatedPhoto.status).toBe('undecided')
      expect(useSelectionStore.getState().getCounts().selected).toBe(0)
    })

    it('点击「不要」后状态变为 rejected', () => {
      const store = useSelectionStore.getState()
      const firstPhoto = store.photos[0]

      store.setPhotoStatus(firstPhoto.id, 'rejected')

      const updatedPhoto = useSelectionStore.getState().photos[0]
      expect(updatedPhoto.status).toBe('rejected')
      expect(useSelectionStore.getState().getCounts().rejected).toBe(1)
    })

    it('点击「待定」后状态变为 undecided', () => {
      const store = useSelectionStore.getState()
      const firstPhoto = store.photos[0]

      store.setPhotoStatus(firstPhoto.id, 'rejected')
      useSelectionStore.getState().setPhotoStatus(firstPhoto.id, 'undecided')

      const updatedPhoto = useSelectionStore.getState().photos[0]
      expect(updatedPhoto.status).toBe('undecided')
      expect(useSelectionStore.getState().getCounts().undecided).toBe(50)
    })
  })

  describe('三组 Tab 切换后计数正确', () => {
    beforeEach(() => {
      const store = useSelectionStore.getState()
      const photos = store.photos
      store.setPhotoStatus(photos[0].id, 'selected')
      store.setPhotoStatus(photos[1].id, 'selected')
      store.setPhotoStatus(photos[2].id, 'rejected')
      store.setPhotoStatus(photos[3].id, 'rejected')
      store.setPhotoStatus(photos[4].id, 'rejected')
    })

    it('场景 Tab 切换后计数正确', () => {
      const store = useSelectionStore.getState()

      store.setSceneFilter('ceremony')
      const ceremonyPhotos = store.getFilteredPhotos()
      expect(ceremonyPhotos.length).toBeGreaterThan(0)
      ceremonyPhotos.forEach((p) => expect(p.scene).toBe('ceremony'))

      store.setSceneFilter('reception')
      const receptionPhotos = store.getFilteredPhotos()
      expect(receptionPhotos.length).toBeGreaterThan(0)
      receptionPhotos.forEach((p) => expect(p.scene).toBe('reception'))

      store.setSceneFilter('outdoor')
      const outdoorPhotos = store.getFilteredPhotos()
      expect(outdoorPhotos.length).toBeGreaterThan(0)
      outdoorPhotos.forEach((p) => expect(p.scene).toBe('outdoor'))
    })

    it('场景筛选与状态筛选可组合使用', () => {
      const store = useSelectionStore.getState()

      store.setSceneFilter('ceremony')
      store.setStatusFilter('selected')
      const filtered = store.getFilteredPhotos()

      filtered.forEach((p) => {
        expect(p.scene).toBe('ceremony')
        expect(p.status).toBe('selected')
      })
    })
  })

  describe('CSV 导出', () => {
    it('CSV 导出列头正确', () => {
      const store = useSelectionStore.getState()
      const csv = store.exportCSV()
      const lines = csv.split('\n')
      const header = lines[0]

      expect(header).toBe('文件名,场景,备注,是否锁定')
    })

    it('选中的照片会出现在 CSV 中', () => {
      const store = useSelectionStore.getState()
      const testPhoto = store.photos[0]

      store.setPhotoStatus(testPhoto.id, 'selected')

      const csv = store.exportCSV()
      expect(csv).toContain(testPhoto.id)
      expect(csv).toContain('仪式')
    })

    it('未选中的照片不会出现在 CSV 中', () => {
      const store = useSelectionStore.getState()
      const testPhoto = store.photos[0]

      store.setPhotoStatus(testPhoto.id, 'rejected')

      const csv = store.exportCSV()
      expect(csv).not.toContain(testPhoto.id)
    })

    it('CSV 包含场景信息', () => {
      const store = useSelectionStore.getState()

      store.setPhotoStatus('test-ceremony-1', 'selected')
      store.setPhotoStatus('test-reception-2', 'selected')

      const csv = store.exportCSV()
      expect(csv).toContain('仪式')
      expect(csv).toContain('晚宴')
    })

    it('CSV 包含锁定状态', () => {
      const store = useSelectionStore.getState()

      store.setPhotoStatus('test-ceremony-1', 'selected')

      const csv = store.exportCSV()
      expect(csv).toContain('是')
      expect(csv).toContain('否')
    })
  })

  describe('锁片功能', () => {
    it('新人模式下锁定的照片不能取消选中', () => {
      const store = useSelectionStore.getState()
      const lockedPhoto = store.photos.find((p) => p.locked)

      if (lockedPhoto) {
        store.setPhotoStatus(lockedPhoto.id, 'rejected')
        const updatedPhoto = useSelectionStore.getState().photos.find(
          (p) => p.id === lockedPhoto.id
        )
        expect(updatedPhoto?.status).toBe('selected')
      }
    })

    it('摄影师模式下可以锁定照片', () => {
      const store = useSelectionStore.getState()
      const photo = store.photos.find((p) => !p.locked)!

      store.togglePhotographerMode()
      useSelectionStore.getState().toggleLock(photo.id)

      const updatedPhoto = useSelectionStore.getState().photos.find(
        (p) => p.id === photo.id
      )
      expect(updatedPhoto?.locked).toBe(true)
      expect(updatedPhoto?.status).toBe('selected')
    })
  })
})
