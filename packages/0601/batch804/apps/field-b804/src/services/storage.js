const STORAGE_KEYS = {
  CHECKLIST: 'field_checklist',
  PHOTO_QUEUE: 'field_photo_queue',
  SYNC_LOG: 'field_sync_log'
}

export const storage = {
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (e) {
      console.error('Storage get error:', e)
      return defaultValue
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch (e) {
      console.error('Storage set error:', e)
      return false
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key)
      return true
    } catch (e) {
      console.error('Storage remove error:', e)
      return false
    }
  },

  getChecklist() {
    return this.get(STORAGE_KEYS.CHECKLIST, [])
  },

  setChecklist(data) {
    return this.set(STORAGE_KEYS.CHECKLIST, data)
  },

  getPhotoQueue() {
    return this.get(STORAGE_KEYS.PHOTO_QUEUE, [])
  },

  setPhotoQueue(data) {
    return this.set(STORAGE_KEYS.PHOTO_QUEUE, data)
  },

  getSyncLog() {
    return this.get(STORAGE_KEYS.SYNC_LOG, [])
  },

  addSyncLog(entry) {
    const logs = this.getSyncLog()
    logs.unshift({
      ...entry,
      timestamp: Date.now()
    })
    return this.set(STORAGE_KEYS.SYNC_LOG, logs.slice(0, 100))
  }
}

export default storage
