import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios, { AxiosRequestConfig } from 'axios'
import MockAdapter from 'axios-mock-adapter'
import {
  createApiClient,
  setTokens,
  _resetRefreshPromise,
  _getRefreshPromise,
  AUTH_REFRESH_EVENT,
} from './client'

const API_BASE_URL = 'http://localhost:8000'
const OLD_ACCESS_TOKEN = 'old-access-token'
const REFRESH_TOKEN = 'valid-refresh-token'
const NEW_ACCESS_TOKEN = 'new-access-token'
const NEW_REFRESH_TOKEN = 'new-refresh-token'

describe('Auth Interceptor', () => {
  let client: ReturnType<typeof createApiClient>
  let mock: MockAdapter
  let axiosPostSpy: ReturnType<typeof vi.spyOn>
  let authRefreshHandler: EventListener

  beforeEach(() => {
    _resetRefreshPromise()
    localStorage.clear()

    client = createApiClient()
    mock = new MockAdapter(client)

    authRefreshHandler = vi.fn() as unknown as EventListener
    window.addEventListener(AUTH_REFRESH_EVENT, authRefreshHandler)

    axiosPostSpy = vi.spyOn(axios, 'post')
  })

  afterEach(() => {
    mock.restore()
    axiosPostSpy.mockRestore()
    window.removeEventListener(AUTH_REFRESH_EVENT, authRefreshHandler)
    _resetRefreshPromise()
    localStorage.clear()
  })

  describe('401 -> Refresh Success', () => {
    it('should refresh token and retry request when access token expires', async () => {
      setTokens(OLD_ACCESS_TOKEN, REFRESH_TOKEN)

      mock
        .onGet('/api/protected-resources')
        .replyOnce(401, { detail: 'Unauthorized' })
        .onGet('/api/protected-resources')
        .reply(200, [{ id: 1, name: 'Test', content: 'Content' }])

      axiosPostSpy.mockResolvedValueOnce({
        data: {
          access_token: NEW_ACCESS_TOKEN,
          refresh_token: NEW_REFRESH_TOKEN,
          token_type: 'bearer',
        },
      })

      const response = await client.get('/api/protected-resources')

      expect(response.status).toBe(200)
      expect(response.data).toEqual([{ id: 1, name: 'Test', content: 'Content' }])

      expect(axiosPostSpy).toHaveBeenCalledTimes(1)
      expect(axiosPostSpy).toHaveBeenCalledWith(
        `${API_BASE_URL}/auth/refresh`,
        { refresh_token: REFRESH_TOKEN }
      )

      expect(localStorage.getItem('access_token')).toBe(NEW_ACCESS_TOKEN)
      expect(localStorage.getItem('refresh_token')).toBe(NEW_REFRESH_TOKEN)

      expect(authRefreshHandler).not.toHaveBeenCalled()
    })

    it('should update Authorization header with new token on retry', async () => {
      setTokens(OLD_ACCESS_TOKEN, REFRESH_TOKEN)

      const requestHeaders: Record<string, string>[] = []

      mock
        .onGet('/api/protected-resources')
        .replyOnce(function (config) {
          requestHeaders.push(config.headers?.Authorization || '')
          return [401, { detail: 'Unauthorized' }]
        })
        .onGet('/api/protected-resources')
        .replyOnce(function (config) {
          requestHeaders.push(config.headers?.Authorization || '')
          return [200, { data: 'ok' }]
        })

      axiosPostSpy.mockResolvedValueOnce({
        data: {
          access_token: NEW_ACCESS_TOKEN,
          refresh_token: NEW_REFRESH_TOKEN,
          token_type: 'bearer',
        },
      })

      await client.get('/api/protected-resources')

      expect(requestHeaders[0]).toBe(`Bearer ${OLD_ACCESS_TOKEN}`)
      expect(requestHeaders[1]).toBe(`Bearer ${NEW_ACCESS_TOKEN}`)
    })

    it('should set _retry flag to prevent infinite retry loop', async () => {
      setTokens(OLD_ACCESS_TOKEN, REFRESH_TOKEN)

      const retryFlags: (boolean | undefined)[] = []

      mock
        .onGet('/api/test')
        .replyOnce(function (config) {
          retryFlags.push((config as unknown as { _retry?: boolean })._retry)
          return [401, { detail: 'Unauthorized' }]
        })
        .onGet('/api/test')
        .replyOnce(function (config) {
          retryFlags.push((config as unknown as { _retry?: boolean })._retry)
          return [200, { ok: true }]
        })

      axiosPostSpy.mockResolvedValueOnce({
        data: {
          access_token: NEW_ACCESS_TOKEN,
          refresh_token: NEW_REFRESH_TOKEN,
          token_type: 'bearer',
        },
      })

      await client.get('/api/test')

      expect(retryFlags[0]).toBeUndefined()
      expect(retryFlags[1]).toBe(true)
    })
  })

  describe('401 -> Refresh Failure', () => {
    it('should clear tokens and dispatch event when refresh returns 401', async () => {
      setTokens(OLD_ACCESS_TOKEN, REFRESH_TOKEN)

      mock.onGet('/api/protected-resources').reply(401, { detail: 'Unauthorized' })

      axiosPostSpy.mockRejectedValueOnce({
        response: { status: 401, data: { detail: 'Invalid refresh token' } },
      })

      await expect(client.get('/api/protected-resources')).rejects.toThrow()

      expect(axiosPostSpy).toHaveBeenCalledTimes(1)

      expect(localStorage.getItem('access_token')).toBeNull()
      expect(localStorage.getItem('refresh_token')).toBeNull()

      expect(authRefreshHandler).toHaveBeenCalledTimes(1)
    })

    it('should clear tokens and dispatch event when no refresh token exists', async () => {
      localStorage.setItem('access_token', OLD_ACCESS_TOKEN)

      mock.onGet('/api/protected-resources').reply(401, { detail: 'Unauthorized' })

      await expect(client.get('/api/protected-resources')).rejects.toThrow()

      expect(axiosPostSpy).not.toHaveBeenCalled()

      expect(localStorage.getItem('access_token')).toBeNull()
      expect(localStorage.getItem('refresh_token')).toBeNull()

      expect(authRefreshHandler).toHaveBeenCalledTimes(1)
    })

    it('should clear tokens when refresh endpoint itself returns 401', async () => {
      setTokens(OLD_ACCESS_TOKEN, REFRESH_TOKEN)

      mock.onPost('/auth/refresh').reply(401, { detail: 'Invalid refresh token' })

      await expect(client.post('/auth/refresh', { refresh_token: REFRESH_TOKEN })).rejects.toThrow()

      expect(localStorage.getItem('access_token')).toBeNull()
      expect(localStorage.getItem('refresh_token')).toBeNull()

      expect(authRefreshHandler).toHaveBeenCalledTimes(1)
    })

    it('should reset refreshPromise after refresh failure', async () => {
      setTokens(OLD_ACCESS_TOKEN, REFRESH_TOKEN)

      mock.onGet('/api/test').reply(401, { detail: 'Unauthorized' })

      axiosPostSpy.mockRejectedValueOnce({
        response: { status: 401 },
      })

      await expect(client.get('/api/test')).rejects.toThrow()

      expect(_getRefreshPromise()).toBeNull()
    })
  })

  describe('Concurrent Requests -> Single Refresh', () => {
    it('should make only ONE refresh call for 3 concurrent 401 requests', async () => {
      setTokens(OLD_ACCESS_TOKEN, REFRESH_TOKEN)

      mock
        .onGet('/api/resource-1')
        .replyOnce(401, { detail: 'Unauthorized' })
        .onGet('/api/resource-1')
        .reply(200, { id: 1 })

      mock
        .onGet('/api/resource-2')
        .replyOnce(401, { detail: 'Unauthorized' })
        .onGet('/api/resource-2')
        .reply(200, { id: 2 })

      mock
        .onGet('/api/resource-3')
        .replyOnce(401, { detail: 'Unauthorized' })
        .onGet('/api/resource-3')
        .reply(200, { id: 3 })

      let refreshResolve: ((value: { data: unknown }) => void) | null = null
      const refreshPromise = new Promise<{ data: unknown }>((resolve) => {
        refreshResolve = resolve
      })

      axiosPostSpy.mockImplementation(() => refreshPromise)

      const concurrentRequests = Promise.all([
        client.get('/api/resource-1'),
        client.get('/api/resource-2'),
        client.get('/api/resource-3'),
      ])

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(axiosPostSpy).toHaveBeenCalledTimes(1)

      expect(_getRefreshPromise()).not.toBeNull()

      refreshResolve!({
        data: {
          access_token: NEW_ACCESS_TOKEN,
          refresh_token: NEW_REFRESH_TOKEN,
          token_type: 'bearer',
        },
      })

      const results = await concurrentRequests

      expect(results[0].status).toBe(200)
      expect(results[1].status).toBe(200)
      expect(results[2].status).toBe(200)

      expect(axiosPostSpy).toHaveBeenCalledTimes(1)

      expect(_getRefreshPromise()).toBeNull()
    })

    it('should retry all concurrent requests with new token after refresh', async () => {
      setTokens(OLD_ACCESS_TOKEN, REFRESH_TOKEN)

      const authHeaders: string[] = []

      type MockResponse = [number, Record<string, unknown>]

      const captureAuth = () => function (config: AxiosRequestConfig): MockResponse {
        authHeaders.push(String(config.headers?.Authorization || ''))
        return [401, { detail: 'Unauthorized' }]
      }

      const captureRetryAuth = (expectedToken: string) =>
        function (config: AxiosRequestConfig): MockResponse {
          const authHeader = String(config.headers?.Authorization || '')
          authHeaders.push(authHeader)
          expect(authHeader).toBe(`Bearer ${expectedToken}`)
          return [200, { ok: true }]
        }

      mock
        .onGet('/api/a')
        .replyOnce(captureAuth())
        .onGet('/api/a')
        .replyOnce(captureRetryAuth(NEW_ACCESS_TOKEN))

      mock
        .onGet('/api/b')
        .replyOnce(captureAuth())
        .onGet('/api/b')
        .replyOnce(captureRetryAuth(NEW_ACCESS_TOKEN))

      mock
        .onGet('/api/c')
        .replyOnce(captureAuth())
        .onGet('/api/c')
        .replyOnce(captureRetryAuth(NEW_ACCESS_TOKEN))

      axiosPostSpy.mockResolvedValueOnce({
        data: {
          access_token: NEW_ACCESS_TOKEN,
          refresh_token: NEW_REFRESH_TOKEN,
          token_type: 'bearer',
        },
      })

      await Promise.all([
        client.get('/api/a'),
        client.get('/api/b'),
        client.get('/api/c'),
      ])

      expect(authHeaders).toEqual([
        `Bearer ${OLD_ACCESS_TOKEN}`,
        `Bearer ${OLD_ACCESS_TOKEN}`,
        `Bearer ${OLD_ACCESS_TOKEN}`,
        `Bearer ${NEW_ACCESS_TOKEN}`,
        `Bearer ${NEW_ACCESS_TOKEN}`,
        `Bearer ${NEW_ACCESS_TOKEN}`,
      ])
    })

    it('should fail all concurrent requests if refresh fails', async () => {
      setTokens(OLD_ACCESS_TOKEN, REFRESH_TOKEN)

      mock.onGet('/api/a').reply(401, { detail: 'Unauthorized' })
      mock.onGet('/api/b').reply(401, { detail: 'Unauthorized' })
      mock.onGet('/api/c').reply(401, { detail: 'Unauthorized' })

      axiosPostSpy.mockRejectedValueOnce({
        response: { status: 401 },
      })

      const results = await Promise.allSettled([
        client.get('/api/a'),
        client.get('/api/b'),
        client.get('/api/c'),
      ])

      expect(results.every(r => r.status === 'rejected')).toBe(true)

      expect(axiosPostSpy).toHaveBeenCalledTimes(1)

      expect(authRefreshHandler).toHaveBeenCalledTimes(1)
    })
  })

  describe('Request Interceptor', () => {
    it('should add Authorization header when token exists', async () => {
      setTokens(OLD_ACCESS_TOKEN, REFRESH_TOKEN)

      let capturedHeader: string | undefined

      mock.onGet('/api/test').reply(function (config) {
        capturedHeader = config.headers?.Authorization
        return [200, { ok: true }]
      })

      await client.get('/api/test')

      expect(capturedHeader).toBe(`Bearer ${OLD_ACCESS_TOKEN}`)
    })

    it('should not add Authorization header when no token exists', async () => {
      let capturedHeader: string | undefined

      mock.onGet('/api/test').reply(function (config) {
        capturedHeader = config.headers?.Authorization
        return [200, { ok: true }]
      })

      await client.get('/api/test')

      expect(capturedHeader).toBeUndefined()
    })
  })
})
