import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import ShiftBoard from './ShiftBoard.vue'
import { useShiftStore } from '../stores/shiftStore'
import { resetAuthState, simulateReconnect } from '../services/mockApi'

describe('ShiftBoard - 组件卸载清理', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    resetAuthState()
    simulateReconnect()
    vi.useFakeTimers()
    vi.spyOn(window, 'setInterval').mockImplementation((() => 123) as any)
    vi.spyOn(window, 'clearInterval').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('组件卸载时调用 stopPolling 清理定时器', async () => {
    const store = useShiftStore()
    store.initMeta()

    const stopPollingSpy = vi.spyOn(store, 'stopPolling')
    vi.spyOn(store, 'startPolling').mockImplementation(() => {})
    vi.spyOn(store, 'loadShifts').mockResolvedValue(undefined)

    const wrapper = mount(ShiftBoard, {
      global: {
        plugins: [pinia],
        stubs: {
          ShiftGrid: { template: '<div class="grid-stub"></div>' },
          ConflictBanner: { template: '<div class="banner-stub"></div>' },
          ExportDialog: { template: '<div class="dialog-stub"></div>' },
        },
      },
    })

    await vi.advanceTimersByTimeAsync(100)

    await wrapper.unmount()

    expect(stopPollingSpy).toHaveBeenCalledTimes(1)
  })

  it('组件卸载时调用 reset 重置状态', async () => {
    const store = useShiftStore()
    store.initMeta()

    const resetSpy = vi.spyOn(store, 'reset')
    vi.spyOn(store, 'startPolling').mockImplementation(() => {})
    vi.spyOn(store, 'loadShifts').mockResolvedValue(undefined)

    const wrapper = mount(ShiftBoard, {
      global: {
        plugins: [pinia],
        stubs: {
          ShiftGrid: { template: '<div class="grid-stub"></div>' },
          ConflictBanner: { template: '<div class="banner-stub"></div>' },
          ExportDialog: { template: '<div class="dialog-stub"></div>' },
        },
      },
    })

    await vi.advanceTimersByTimeAsync(100)

    await wrapper.unmount()

    expect(resetSpy).toHaveBeenCalledTimes(1)
  })

  it('多次挂载/卸载不会残留定时器（clearInterval 被调用）', async () => {
    const store = useShiftStore()
    store.initMeta()

    vi.spyOn(store, 'startPolling').mockImplementation(() => {
      window.setInterval(() => {}, 5000)
    })
    vi.spyOn(store, 'stopPolling').mockImplementation(() => {
      window.clearInterval(123)
    })
    vi.spyOn(store, 'loadShifts').mockResolvedValue(undefined)

    const clearIntervalSpy = vi.spyOn(window, 'clearInterval')
    const setIntervalSpy = vi.spyOn(window, 'setInterval')

    for (let i = 0; i < 3; i++) {
      const wrapper = mount(ShiftBoard, {
        global: {
          plugins: [pinia],
          stubs: {
            ShiftGrid: { template: '<div></div>' },
            ConflictBanner: { template: '<div></div>' },
            ExportDialog: { template: '<div></div>' },
          },
        },
      })
      await vi.advanceTimersByTimeAsync(100)
      await wrapper.unmount()
    }

    expect(setIntervalSpy).toHaveBeenCalledTimes(3)
    expect(clearIntervalSpy).toHaveBeenCalledTimes(3)
  })

  it('卸载后 reset 会清空状态', async () => {
    const store = useShiftStore()
    store.initMeta()

    vi.spyOn(store, 'startPolling').mockImplementation(() => {})
    vi.spyOn(store, 'loadShifts').mockResolvedValue(undefined)

    const wrapper = mount(ShiftBoard, {
      global: {
        plugins: [pinia],
        stubs: {
          ShiftGrid: { template: '<div></div>' },
          ConflictBanner: { template: '<div></div>' },
          ExportDialog: { template: '<div></div>' },
        },
      },
    })

    await vi.advanceTimersByTimeAsync(100)

    store.shifts = [{ id: '1', staffId: 's1', date: '2026-06-02', slot: '早班', dept: '内科' }]
    store.conflicts = [{ staffId: 's1', staffName: '测试', date: '2026-06-02', slot: '早班', type: 'double_booked', message: 'test' }]
    store.currentDept = '内科'
    store.lastVersion = 5
    store.authFailed = true

    await wrapper.unmount()

    expect(store.shifts.length).toBe(0)
    expect(store.conflicts.length).toBe(0)
    expect(store.currentDept).toBe('')
    expect(store.lastVersion).toBe(0)
    expect(store.authFailed).toBe(false)
  })
})
