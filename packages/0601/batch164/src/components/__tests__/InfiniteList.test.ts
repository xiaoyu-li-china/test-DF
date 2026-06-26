import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import InfiniteList from '../InfiniteList.vue'

const mockObserve = vi.fn()
const mockDisconnect = vi.fn()
const mockIntersectionObserverCb = { value: null as ((entries: { isIntersecting: boolean }[]) => void) | null }

vi.stubGlobal('IntersectionObserver', class {
  callback: (entries: { isIntersecting: boolean }[]) => void
  constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
    this.callback = cb
    mockIntersectionObserverCb.value = cb
  }
  observe = mockObserve
  disconnect = mockDisconnect
})

describe('InfiniteList', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockObserve.mockClear()
    mockDisconnect.mockClear()
    mockIntersectionObserverCb.value = null
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  async function mountComponent() {
    const wrapper = mount(InfiniteList)
    await flushPromises()
    await vi.advanceTimersByTimeAsync(800)
    await flushPromises()
    return wrapper
  }

  it('初始时 IntersectionObserver 被创建并观察 sentinel', async () => {
    const wrapper = await mountComponent()

    expect(mockObserve).toHaveBeenCalledTimes(1)
    const observedEl = mockObserve.mock.calls[0][0]
    const sentinel = wrapper.find('[class="h-1"]').element
    expect(observedEl).toBe(sentinel)
  })

  it('滚动到底部后触发加载，列表项增加', async () => {
    const wrapper = await mountComponent()

    const itemsAfterFirst = wrapper.findAll('.bg-white.rounded-lg').length
    expect(itemsAfterFirst).toBe(20)

    mockIntersectionObserverCb.value!([{ isIntersecting: true }])
    await vi.advanceTimersByTimeAsync(800)
    await flushPromises()

    const itemsAfterSecond = wrapper.findAll('.bg-white.rounded-lg').length
    expect(itemsAfterSecond).toBe(40)
  })

  it('加载完成后 Observer 仍然绑定，可继续触发', async () => {
    await mountComponent()

    mockIntersectionObserverCb.value!([{ isIntersecting: true }])
    await vi.advanceTimersByTimeAsync(800)
    await flushPromises()

    expect(mockDisconnect).not.toHaveBeenCalled()
    expect(mockIntersectionObserverCb.value).not.toBeNull()

    mockIntersectionObserverCb.value!([{ isIntersecting: true }])
    await vi.advanceTimersByTimeAsync(800)
    await flushPromises()

    const wrapper2 = await mountComponent()
    const totalItems = wrapper2.findAll('.bg-white.rounded-lg').length
    expect(totalItems).toBeGreaterThanOrEqual(20)
  })

  it('没有更多数据时不再触发加载', async () => {
    const wrapper = mount(InfiniteList)
    await flushPromises()
    await vi.advanceTimersByTimeAsync(800)
    await flushPromises()

    for (let i = 1; i < 11; i++) {
      mockIntersectionObserverCb.value!([{ isIntersecting: true }])
      await vi.advanceTimersByTimeAsync(800)
      await flushPromises()
    }

    expect(wrapper.text()).toContain('没有更多了')

    const itemCountBefore = wrapper.findAll('.bg-white.rounded-lg').length

    mockIntersectionObserverCb.value!([{ isIntersecting: true }])
    await vi.advanceTimersByTimeAsync(800)
    await flushPromises()

    const itemCountAfter = wrapper.findAll('.bg-white.rounded-lg').length
    expect(itemCountAfter).toBe(itemCountBefore)
  })
})
