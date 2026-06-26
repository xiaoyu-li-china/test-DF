import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AuthService, type AuthTokens } from '@/services/authService'

describe('authService', () => {
  const mockTokens: AuthTokens = {
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
  }

  const newTokens: AuthTokens = {
    accessToken: 'access-2',
    refreshToken: 'refresh-2',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('401 → refresh token flow', () => {
    it('refresh 成功: 401 后自动 refresh 并重发请求成功', async () => {
      const mockRefresh = vi.fn().mockResolvedValue(newTokens)
      const service = new AuthService({ onRefresh: mockRefresh })
      service.setTokens(mockTokens)

      let attempt = 0
      const fetchFn = vi.fn().mockImplementation(async (token: string) => {
        attempt++
        if (token === 'access-1') {
          return { ok: false as const, status: 401 }
        }
        return { ok: true as const, data: { success: true } }
      })

      const resultPromise = service.request(fetchFn)
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.ok).toBe(true)
      expect(mockRefresh).toHaveBeenCalledTimes(1)
      expect(mockRefresh).toHaveBeenCalledWith('refresh-1')
      expect(fetchFn).toHaveBeenCalledTimes(2)
      expect(fetchFn).toHaveBeenNthCalledWith(1, 'access-1')
      expect(fetchFn).toHaveBeenNthCalledWith(2, 'access-2')
      expect(service.getTokens()?.accessToken).toBe('access-2')
    })

    it('refresh 失败: 401 后 refresh 抛出，最终返回 401', async () => {
      const mockRefresh = vi.fn().mockRejectedValue(new Error('Refresh failed'))
      const service = new AuthService({ onRefresh: mockRefresh })
      service.setTokens(mockTokens)

      const fetchFn = vi.fn().mockResolvedValue({ ok: false as const, status: 401 })

      const resultPromise = service.request(fetchFn)
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.status).toBe(401)
      }
      expect(mockRefresh).toHaveBeenCalledTimes(1)
      expect(fetchFn).toHaveBeenCalledTimes(1)
      expect(service.getTokens()?.accessToken).toBe('access-1')
    })

    it('未设置 token 时直接返回 401', async () => {
      const mockRefresh = vi.fn()
      const service = new AuthService({ onRefresh: mockRefresh })
      const fetchFn = vi.fn()

      const result = await service.request(fetchFn)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.status).toBe(401)
      }
      expect(mockRefresh).not.toHaveBeenCalled()
      expect(fetchFn).not.toHaveBeenCalled()
    })
  })

  describe('并发请求 deduplication', () => {
    it('并发 3 请求遇 401 仅触发 1 次 refresh', async () => {
      let refreshResolve: (value: AuthTokens) => void
      const mockRefresh = vi.fn().mockImplementation(
        () =>
          new Promise<AuthTokens>((resolve) => {
            refreshResolve = resolve
          })
      )
      const service = new AuthService({ onRefresh: mockRefresh })
      service.setTokens(mockTokens)

      const firstFetchPromises: (() => void)[] = []
      const fetchFn = vi.fn().mockImplementation(async (token: string) => {
        if (token === 'access-1') {
          return new Promise((resolve) => {
            firstFetchPromises.push(() => resolve({ ok: false as const, status: 401 }))
          })
        }
        return { ok: true as const, data: { success: true } }
      })

      const promise1 = service.request(fetchFn)
      const promise2 = service.request(fetchFn)
      const promise3 = service.request(fetchFn)

      await vi.runAllTimersAsync()
      firstFetchPromises.forEach((fn) => fn())
      await vi.runAllTimersAsync()

      expect(service.isRefreshingToken()).toBe(true)
      expect(mockRefresh).toHaveBeenCalledTimes(1)

      refreshResolve!(newTokens)
      const results = await Promise.all([promise1, promise2, promise3])

      expect(results.every((r) => r.ok)).toBe(true)
      expect(mockRefresh).toHaveBeenCalledTimes(1)
      expect(fetchFn).toHaveBeenCalledTimes(6)
    })

    it('refresh 期间新请求会等待 refresh 完成', async () => {
      let refreshResolve: (value: AuthTokens) => void
      const mockRefresh = vi.fn().mockImplementation(
        () =>
          new Promise<AuthTokens>((resolve) => {
            refreshResolve = resolve
          })
      )
      const service = new AuthService({ onRefresh: mockRefresh })
      service.setTokens(mockTokens)

      let firstResolve: (() => void) | null = null
      let secondResolve: (() => void) | null = null
      let callIndex = 0
      const fetchFn = vi.fn().mockImplementation(async (token: string) => {
        callIndex++
        if (token === 'access-1') {
          if (callIndex <= 1) {
            return new Promise((resolve) => {
              firstResolve = () => resolve({ ok: false as const, status: 401 })
            })
          }
        }
        return new Promise((resolve) => {
          secondResolve = () => resolve({ ok: true as const, data: { success: true } })
        })
      })

      const promise1 = service.request(fetchFn)
      await vi.runAllTimersAsync()
      firstResolve!()
      await vi.runAllTimersAsync()

      expect(service.isRefreshingToken()).toBe(true)

      const promise2 = service.request(fetchFn)

      refreshResolve!(newTokens)
      await vi.runAllTimersAsync()
      secondResolve!()

      const results = await Promise.all([promise1, promise2])

      expect(results.every((r) => r.ok)).toBe(true)
      expect(mockRefresh).toHaveBeenCalledTimes(1)
    })
  })
})
