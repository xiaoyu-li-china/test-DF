import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useShiftStore } from './shiftStore'
import {
  resetAuthState,
  setTokenExpired,
  setRefreshShouldFail,
  getRefreshCallCount,
  simulateReconnect,
} from '../services/mockApi'

describe('shiftStore - 401 / refresh token', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    resetAuthState()
    simulateReconnect()
  })

  it('401 后自动 refreshToken，成功后重试原请求', async () => {
    const store = useShiftStore()
    store.initMeta()

    setTokenExpired(true)

    await store.loadShifts()

    expect(getRefreshCallCount()).toBe(1)
    expect(store.shifts.length).toBeGreaterThan(0)
    expect(store.authFailed).toBe(false)
    expect(store.loading).toBe(false)
  })

  it('401 后 refreshToken 失败，设置 authFailed', async () => {
    const store = useShiftStore()
    store.initMeta()

    setTokenExpired(true)
    setRefreshShouldFail(true)

    await store.loadShifts()

    expect(getRefreshCallCount()).toBe(1)
    expect(store.authFailed).toBe(true)
    expect(store.shifts.length).toBe(0)
  })

  it('并发 3 个 loadShifts 请求，仅触发 1 次 refreshToken', async () => {
    const store = useShiftStore()
    store.initMeta()

    setTokenExpired(true)

    const results = await Promise.all([
      store.loadShifts(),
      store.loadShifts(),
      store.loadShifts(),
    ])

    expect(results.length).toBe(3)
    expect(store.getRefreshCallCountInternal()).toBe(1)
    expect(getRefreshCallCount()).toBe(1)
    expect(store.shifts.length).toBeGreaterThan(0)
    expect(store.authFailed).toBe(false)
  })

  it('非 401 错误不会触发 refresh', async () => {
    const store = useShiftStore()
    store.initMeta()

    await store.loadShifts()

    expect(getRefreshCallCount()).toBe(0)
    expect(store.shifts.length).toBeGreaterThan(0)
  })
})
