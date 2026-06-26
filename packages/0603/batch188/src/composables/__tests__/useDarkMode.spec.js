import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { useDarkMode } from '../useDarkMode'

const THEME_KEY = 'dark-mode'
const FOLLOW_SYSTEM_KEY = 'follow-system'

describe('useDarkMode', () => {
  let matchMediaSpy
  let mediaQueryListeners = []
  let mockMatches = false

  const createTestComponent = () => {
    return defineComponent({
      setup() {
        return useDarkMode()
      },
      template: '<div />'
    })
  }

  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    mediaQueryListeners = []
    mockMatches = false

    matchMediaSpy = vi.spyOn(window, 'matchMedia').mockImplementation(() => ({
      matches: mockMatches,
      addEventListener: vi.fn((event, handler) => {
        if (event === 'change') {
          mediaQueryListeners.push(handler)
        }
      }),
      removeEventListener: vi.fn((event, handler) => {
        if (event === 'change') {
          mediaQueryListeners = mediaQueryListeners.filter((h) => h !== handler)
        }
      })
    }))
  })

  describe('初始化', () => {
    it('无存储值且系统为亮色模式时，默认跟随系统并设为亮色', async () => {
      mockMatches = false
      const wrapper = mount(createTestComponent())
      await nextTick()

      expect(wrapper.vm.followSystem).toBe(true)
      expect(wrapper.vm.isDark).toBe(false)
      expect(document.documentElement.classList.contains('dark')).toBe(false)
    })

    it('无存储值且系统为暗色模式时，默认跟随系统并设为暗色', async () => {
      mockMatches = true
      const wrapper = mount(createTestComponent())
      await nextTick()

      expect(wrapper.vm.followSystem).toBe(true)
      expect(wrapper.vm.isDark).toBe(true)
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })

    it('存储值为亮色且不跟随系统时，初始化为亮色', async () => {
      localStorage.setItem(THEME_KEY, 'false')
      localStorage.setItem(FOLLOW_SYSTEM_KEY, 'false')
      mockMatches = true

      const wrapper = mount(createTestComponent())
      await nextTick()

      expect(wrapper.vm.followSystem).toBe(false)
      expect(wrapper.vm.isDark).toBe(false)
      expect(document.documentElement.classList.contains('dark')).toBe(false)
    })

    it('存储值为暗色且不跟随系统时，初始化为暗色', async () => {
      localStorage.setItem(THEME_KEY, 'true')
      localStorage.setItem(FOLLOW_SYSTEM_KEY, 'false')
      mockMatches = false

      const wrapper = mount(createTestComponent())
      await nextTick()

      expect(wrapper.vm.followSystem).toBe(false)
      expect(wrapper.vm.isDark).toBe(true)
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })

    it('跟随系统开启时，忽略存储的主题值，使用系统主题', async () => {
      localStorage.setItem(THEME_KEY, 'false')
      localStorage.setItem(FOLLOW_SYSTEM_KEY, 'true')
      mockMatches = true

      const wrapper = mount(createTestComponent())
      await nextTick()

      expect(wrapper.vm.followSystem).toBe(true)
      expect(wrapper.vm.isDark).toBe(true)
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })
  })

  describe('toggleDarkMode', () => {
    it('从亮色切换到暗色，更新 html 类和 localStorage', async () => {
      mockMatches = false
      const wrapper = mount(createTestComponent())
      await nextTick()

      expect(wrapper.vm.isDark).toBe(false)
      expect(document.documentElement.classList.contains('dark')).toBe(false)

      wrapper.vm.toggleDarkMode()
      await nextTick()

      expect(wrapper.vm.isDark).toBe(true)
      expect(wrapper.vm.followSystem).toBe(false)
      expect(document.documentElement.classList.contains('dark')).toBe(true)
      expect(localStorage.getItem(THEME_KEY)).toBe('true')
      expect(localStorage.getItem(FOLLOW_SYSTEM_KEY)).toBe('false')
    })

    it('从暗色切换到亮色，更新 html 类和 localStorage', async () => {
      mockMatches = true
      const wrapper = mount(createTestComponent())
      await nextTick()

      expect(wrapper.vm.isDark).toBe(true)
      expect(document.documentElement.classList.contains('dark')).toBe(true)

      wrapper.vm.toggleDarkMode()
      await nextTick()

      expect(wrapper.vm.isDark).toBe(false)
      expect(wrapper.vm.followSystem).toBe(false)
      expect(document.documentElement.classList.contains('dark')).toBe(false)
      expect(localStorage.getItem(THEME_KEY)).toBe('false')
      expect(localStorage.getItem(FOLLOW_SYSTEM_KEY)).toBe('false')
    })

    it('手动切换时自动关闭跟随系统', async () => {
      mockMatches = true
      const wrapper = mount(createTestComponent())
      await nextTick()

      expect(wrapper.vm.followSystem).toBe(true)

      wrapper.vm.toggleDarkMode()
      await nextTick()

      expect(wrapper.vm.followSystem).toBe(false)
      expect(localStorage.getItem(FOLLOW_SYSTEM_KEY)).toBe('false')
    })
  })

  describe('setFollowSystem', () => {
    it('开启跟随系统，同步当前系统主题', async () => {
      localStorage.setItem(THEME_KEY, 'false')
      localStorage.setItem(FOLLOW_SYSTEM_KEY, 'false')
      mockMatches = true

      const wrapper = mount(createTestComponent())
      await nextTick()

      expect(wrapper.vm.followSystem).toBe(false)
      expect(wrapper.vm.isDark).toBe(false)

      wrapper.vm.setFollowSystem(true)
      await nextTick()

      expect(wrapper.vm.followSystem).toBe(true)
      expect(wrapper.vm.isDark).toBe(true)
      expect(document.documentElement.classList.contains('dark')).toBe(true)
      expect(localStorage.getItem(FOLLOW_SYSTEM_KEY)).toBe('true')
    })

    it('关闭跟随系统，保存当前主题到 localStorage', async () => {
      mockMatches = true
      const wrapper = mount(createTestComponent())
      await nextTick()

      expect(wrapper.vm.followSystem).toBe(true)
      expect(wrapper.vm.isDark).toBe(true)

      wrapper.vm.setFollowSystem(false)
      await nextTick()

      expect(wrapper.vm.followSystem).toBe(false)
      expect(localStorage.getItem(THEME_KEY)).toBe('true')
      expect(localStorage.getItem(FOLLOW_SYSTEM_KEY)).toBe('false')
    })
  })

  describe('系统主题变化监听', () => {
    it('跟随系统开启时，系统主题变化自动更新', async () => {
      mockMatches = false
      const wrapper = mount(createTestComponent())
      await nextTick()

      expect(wrapper.vm.followSystem).toBe(true)
      expect(wrapper.vm.isDark).toBe(false)
      expect(document.documentElement.classList.contains('dark')).toBe(false)

      mediaQueryListeners.forEach((handler) => handler({ matches: true }))
      await nextTick()

      expect(wrapper.vm.isDark).toBe(true)
      expect(document.documentElement.classList.contains('dark')).toBe(true)

      mediaQueryListeners.forEach((handler) => handler({ matches: false }))
      await nextTick()

      expect(wrapper.vm.isDark).toBe(false)
      expect(document.documentElement.classList.contains('dark')).toBe(false)
    })

    it('跟随系统关闭时，系统主题变化不影响', async () => {
      mockMatches = false
      const wrapper = mount(createTestComponent())
      await nextTick()

      wrapper.vm.toggleDarkMode()
      await nextTick()

      expect(wrapper.vm.followSystem).toBe(false)
      expect(wrapper.vm.isDark).toBe(true)

      mediaQueryListeners.forEach((handler) => handler({ matches: false }))
      await nextTick()

      expect(wrapper.vm.isDark).toBe(true)
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })
  })

  describe('组件卸载', () => {
    it('卸载时移除事件监听器', async () => {
      const wrapper = mount(createTestComponent())
      await nextTick()

      expect(mediaQueryListeners.length).toBe(1)

      wrapper.unmount()

      expect(mediaQueryListeners.length).toBe(0)
    })
  })
})
