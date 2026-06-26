import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSyncStore } from '@/stores/syncStore'

describe('syncStore - 资源清理', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('网络事件监听器生命周期', () => {
    it('initNetworkListeners 后绑定 online/offline 监听器', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
      const store = useSyncStore()

      store.initNetworkListeners()

      expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function))
    })

    it('destroyNetworkListeners 移除监听器', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
      const store = useSyncStore()

      store.initNetworkListeners()
      store.destroyNetworkListeners()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function))
    })

    it('重复 init 不会重复绑定监听器', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
      const store = useSyncStore()

      store.initNetworkListeners()
      store.initNetworkListeners()
      store.initNetworkListeners()

      expect(addEventListenerSpy).toHaveBeenCalledTimes(2)
    })

    it('destroy 后监听器不再响应 online/offline 事件', () => {
      const store = useSyncStore()
      store.setOnline(false)
      store.initNetworkListeners()
      store.destroyNetworkListeners()

      const initialState = store.isOnline

      window.dispatchEvent(new Event('online'))

      expect(store.isOnline).toBe(initialState)
    })
  })
})
