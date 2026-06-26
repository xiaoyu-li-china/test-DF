import { useState, useEffect, useCallback } from 'react'
import photoQueue from '../services/photoQueue'
import client from '../services/client'

export function usePhotoQueue() {
  const [queue, setQueue] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    syncing: 0,
    success: 0,
    failed: 0
  })

  const updateState = useCallback(() => {
    setQueue(photoQueue.getQueue())
    setStats(photoQueue.getStats())
  }, [])

  useEffect(() => {
    updateState()

    const unsubscribe = photoQueue.subscribe((event, data) => {
      if (event === 'queueUpdated') {
        updateState()
      }
    })

    return unsubscribe
  }, [updateState])

  const addPhoto = useCallback((photoData) => {
    const photo = photoQueue.addPhoto(photoData)
    updateState()
    return photo
  }, [updateState])

  const processQueue = useCallback(() => {
    photoQueue.processQueue()
  }, [])

  const clearCompleted = useCallback(() => {
    photoQueue.clearCompleted()
    updateState()
  }, [updateState])

  const floorId = client.getFloor()

  return {
    queue,
    stats,
    floorId,
    addPhoto,
    processQueue,
    clearCompleted
  }
}

export default usePhotoQueue
