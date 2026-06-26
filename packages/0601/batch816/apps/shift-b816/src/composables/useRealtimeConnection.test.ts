import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { useRealtimeConnection } from '@/composables/useRealtimeConnection'

describe('useRealtimeConnection - 组件卸载清理', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(window, 'setInterval')
    vi.spyOn(window, 'clearInterval')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('组件挂载时初始化连接状态', () => {
    const TestComponent = defineComponent({
      setup() {
        const { isConnected } = useRealtimeConnection()
        return { isConnected }
      },
      template: '<div>{{ isConnected }}</div>',
    })

    const wrapper = mount(TestComponent)
    expect(wrapper.vm.isConnected).toBe(true)
  })

  it('组件卸载时 timer 被清理', async () => {
    const TestComponent = defineComponent({
      setup() {
        const { startReconnectTimer, reconnectTimerId } = useRealtimeConnection({
          reconnectInterval: 1000,
        })
        return { startReconnectTimer, reconnectTimerId }
      },
      template: '<div>test</div>',
    })

    const wrapper = mount(TestComponent)
    ;(wrapper.vm as any).startReconnectTimer()

    expect(window.setInterval).toHaveBeenCalledTimes(1)

    const timerId = (wrapper.vm as any).reconnectTimerId
    expect(timerId).not.toBeNull()

    wrapper.unmount()

    expect(window.clearInterval).toHaveBeenCalledWith(timerId)
  })

  it('startReconnectTimer 会先清除已有 timer', () => {
    const TestComponent = defineComponent({
      setup() {
        const { startReconnectTimer, reconnectTimerId } = useRealtimeConnection({
          reconnectInterval: 1000,
        })
        return { startReconnectTimer, reconnectTimerId }
      },
      template: '<div>test</div>',
    })

    const wrapper = mount(TestComponent)
    ;(wrapper.vm as any).startReconnectTimer()
    ;(wrapper.vm as any).startReconnectTimer()

    expect(window.setInterval).toHaveBeenCalledTimes(2)
    expect(window.clearInterval).toHaveBeenCalledTimes(1)
  })

  it('cleanup 同时清理 timer 和 websocket', () => {
    const mockClose = vi.fn()
    const TestComponent = defineComponent({
      setup() {
        const { cleanup, wsInstance } = useRealtimeConnection()
        return { cleanup, wsInstance }
      },
      template: '<div>test</div>',
    })

    const wrapper = mount(TestComponent)
    ;(wrapper.vm as any).wsInstance = { close: mockClose } as any

    ;(wrapper.vm as any).cleanup()

    expect(mockClose).toHaveBeenCalled()
  })

  it('onUnmounted 自动调用 cleanup', () => {
    const mockClose = vi.fn()
    const TestComponent = defineComponent({
      setup() {
        const { startReconnectTimer, wsInstance } = useRealtimeConnection({
          reconnectInterval: 1000,
        })
        return { startReconnectTimer, wsInstance }
      },
      template: '<div>test</div>',
    })

    const wrapper = mount(TestComponent)
    ;(wrapper.vm as any).startReconnectTimer()
    ;(wrapper.vm as any).wsInstance = { close: mockClose } as any

    wrapper.unmount()

    expect(window.clearInterval).toHaveBeenCalled()
    expect(mockClose).toHaveBeenCalled()
  })
})
