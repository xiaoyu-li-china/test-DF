import client from './client'
import api, { isOnline } from './api'

export const PHOTO_STATUS = {
  PENDING: 'pending',
  SYNCING: 'syncing',
  SUCCESS: 'success',
  FAILED: 'failed'
}

class PhotoQueueService {
  constructor() {
    this.listeners = []
    this.isProcessing = false
    this.initNetworkListener()
  }

  initNetworkListener() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.notifyListeners('online')
        this.processQueue()
      })
      window.addEventListener('offline', () => {
        this.notifyListeners('offline')
      })
    }
  }

  subscribe(callback) {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback)
    }
  }

  notifyListeners(event, data) {
    this.listeners.forEach(callback => callback(event, data))
  }

  getQueue() {
    return client.getPhotoQueue()
  }

  saveQueue(queue) {
    client.setPhotoQueue(queue)
    this.notifyListeners('queueUpdated', queue)
  }

  addPhoto(photoData) {
    const entry = client.addPhoto({
      id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      dataUrl: photoData.dataUrl,
      timestamp: Date.now(),
      status: PHOTO_STATUS.PENDING,
      checklistItemId: photoData.checklistItemId || null
    })

    this.notifyListeners('queueUpdated', client.getPhotoQueue())

    if (isOnline()) {
      setTimeout(() => this.processQueue(), 100)
    }

    return entry
  }

  updatePhotoStatus(id, status, error = null) {
    client.updatePhotoStatus(id, status, error)
    this.notifyListeners('queueUpdated', client.getPhotoQueue())
  }

  removePhoto(id) {
    client.removePhoto(id)
    this.notifyListeners('queueUpdated', client.getPhotoQueue())
  }

  async processQueue() {
    if (this.isProcessing || !isOnline()) {
      return
    }

    this.isProcessing = true

    while (isOnline()) {
      const queue = client.getPhotoQueue()
      const pendingPhotos = queue.filter(p =>
        p.status === PHOTO_STATUS.PENDING || p.status === PHOTO_STATUS.FAILED
      )

      if (pendingPhotos.length === 0) {
        break
      }

      const photo = pendingPhotos[0]

      try {
        this.updatePhotoStatus(photo.id, PHOTO_STATUS.SYNCING)

        await api.uploadPhoto({
          id: photo.id,
          dataUrl: photo.dataUrl,
          timestamp: photo.timestamp,
          checklistItemId: photo.checklistItemId,
          floorId: photo.floorId
        })

        this.removePhoto(photo.id)

        client.addSyncLog({
          type: 'success',
          message: `照片 ${photo.id} (${photo.floorId}) 上传成功，已从队列移除`
        })
      } catch (error) {
        this.updatePhotoStatus(photo.id, PHOTO_STATUS.FAILED, error.message)

        client.addSyncLog({
          type: 'error',
          message: `照片 ${photo.id} (${photo.floorId}) 上传失败: ${error.message}，保留在队列中`
        })

        break
      }
    }

    this.isProcessing = false
  }

  clearCompleted() {
    const queue = client.getPhotoQueue()
    const remaining = queue.filter(p => p.status !== PHOTO_STATUS.SUCCESS)
    client.setPhotoQueue(remaining)
    this.notifyListeners('queueUpdated', remaining)
  }

  getStats() {
    return client.getPhotoStats()
  }
}

export const photoQueue = new PhotoQueueService()
export default photoQueue
