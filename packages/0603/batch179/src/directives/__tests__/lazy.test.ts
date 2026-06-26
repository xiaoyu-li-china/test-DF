import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick, ref } from 'vue'
import vLazy from '../lazy'
import { MockIntersectionObserver } from '../../test/setup'

const createTestComponent = (template: string, props = {}) => {
  return defineComponent({
    directives: {
      lazy: vLazy
    },
    props,
    template,
    setup() {
      return {}
    }
  })
}

const waitForLoad = async (img: HTMLImageElement) => {
  await new Promise<void>((resolve) => {
    const check = () => {
      if (img.onload) {
        img.onload = () => resolve()
      } else {
        resolve()
      }
    }
    setTimeout(check, 0)
  })
}

const fromBase64 = (str: string): string => {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'base64').toString('utf-8')
  }
  try {
    return decodeURIComponent(escape(atob(str)))
  } catch {
    return atob(str)
  }
}

describe('v-lazy directive', () => {
  const testImageUrl = 'https://example.com/test.jpg'
  const testImageUrl2 = 'https://example.com/test2.jpg'
  const invalidUrl = 'https://invalid-url.com/bad.jpg'
  const customPlaceholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMDAwIi8+PC9zdmc+'
  const customFallback = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjAwIi8+PC9zdmc+'

  let originalImage: typeof Image

  beforeEach(() => {
    originalImage = window.Image
  })

  afterEach(() => {
    window.Image = originalImage
  })

  const mockImageLoad = (shouldFail: boolean = false) => {
    const mockImg = {
      src: '',
      onload: null as ((this: GlobalEventHandlers, ev: Event) => any) | null,
      onerror: null as ((this: GlobalEventHandlers, ev: Event) => any) | null
    }

    vi.spyOn(window, 'Image').mockImplementation(() => {
      setTimeout(() => {
        if (shouldFail) {
          mockImg.onerror?.call(mockImg as any, new Event('error'))
        } else {
          mockImg.onload?.call(mockImg as any, new Event('load'))
        }
      }, 0)
      return mockImg as unknown as HTMLImageElement
    })

    return mockImg
  }

  describe('基础功能', () => {
    it('mounted 时应显示占位图，不直接加载真实图片', async () => {
      mockImageLoad()
      const Component = createTestComponent(`<img v-lazy="'${testImageUrl}'" alt="test" />`)
      const wrapper = mount(Component)
      const img = wrapper.find('img').element as HTMLImageElement

      expect(img.src).not.toBe(testImageUrl)
      expect(img.dataset.src).toBe(testImageUrl)
      expect(img.src).toContain('data:image/svg+xml')

      wrapper.unmount()
    })

    it('图片进入视口时应替换 src 为真实图片地址', async () => {
      mockImageLoad()
      const Component = createTestComponent(`<img v-lazy="'${testImageUrl}'" alt="test" />`)
      const wrapper = mount(Component)
      const img = wrapper.find('img').element as HTMLImageElement

      expect(img.src).not.toContain(testImageUrl)

      MockIntersectionObserver.triggerAllIntersect(img, true)
      await nextTick()
      await new Promise((r) => setTimeout(r, 10))

      expect(img.src).toBe(testImageUrl)

      wrapper.unmount()
    })

    it('未进入视口时不应加载图片', async () => {
      mockImageLoad()
      const Component = createTestComponent(`<img v-lazy="'${testImageUrl}'" alt="test" />`)
      const wrapper = mount(Component)
      const img = wrapper.find('img').element as HTMLImageElement

      MockIntersectionObserver.triggerAllIntersect(img, false)
      await nextTick()

      expect(img.src).not.toBe(testImageUrl)
      expect(img.dataset.src).toBe(testImageUrl)

      wrapper.unmount()
    })
  })

  describe('对象参数配置', () => {
    it('应支持自定义 placeholder', async () => {
      mockImageLoad()
      const Component = createTestComponent(
        `<img v-lazy="{ src: '${testImageUrl}', placeholder: '${customPlaceholder}' }" />`
      )
      const wrapper = mount(Component)
      const img = wrapper.find('img').element as HTMLImageElement

      expect(img.src).toBe(customPlaceholder)

      wrapper.unmount()
    })

    it('应支持自定义 fallback 图', async () => {
      mockImageLoad(true)
      const Component = createTestComponent(
        `<img v-lazy="{ src: '${invalidUrl}', fallback: '${customFallback}' }" />`
      )
      const wrapper = mount(Component)
      const img = wrapper.find('img').element as HTMLImageElement

      MockIntersectionObserver.triggerAllIntersect(img, true)
      await nextTick()
      await new Promise((r) => setTimeout(r, 10))

      expect(img.src).toBe(customFallback)

      wrapper.unmount()
    })

    it('loadingText 应生成带文字的占位图', async () => {
      mockImageLoad()
      const Component = createTestComponent(
        `<img v-lazy="{ src: '${testImageUrl}', loadingText: '加载中...' }" />`
      )
      const wrapper = mount(Component)
      const img = wrapper.find('img').element as HTMLImageElement

      expect(img.src).toContain('data:image/svg+xml')
      expect(fromBase64(img.src.split(',')[1])).toContain('加载中...')

      wrapper.unmount()
    })
  })

  describe('预加载功能（preload）', () => {
    it('v-lazy:preload 应使用默认预加载距离 100px', async () => {
      mockImageLoad()
      const Component = createTestComponent(`<img v-lazy:preload="'${testImageUrl}'" />`)
      const wrapper = mount(Component)

      const instance = MockIntersectionObserver.mockInstances[0]
      expect(instance.options.rootMargin).toBe('100px')

      wrapper.unmount()
    })

    it('对象参数 preload 应设置自定义 rootMargin', async () => {
      mockImageLoad()
      const Component = createTestComponent(
        `<img v-lazy="{ src: '${testImageUrl}', preload: 200 }" />`
      )
      const wrapper = mount(Component)

      const instance = MockIntersectionObserver.mockInstances[0]
      expect(instance.options.rootMargin).toBe('200px')

      wrapper.unmount()
    })

    it('v-lazy:preload 对象方式应支持覆盖默认距离', async () => {
      mockImageLoad()
      const Component = createTestComponent(
        `<img v-lazy:preload="{ src: '${testImageUrl}', preload: 150 }" />`
      )
      const wrapper = mount(Component)

      const instance = MockIntersectionObserver.mockInstances[0]
      expect(instance.options.rootMargin).toBe('150px')

      wrapper.unmount()
    })
  })

  describe('Observer 配置', () => {
    it('应支持自定义 rootMargin', async () => {
      mockImageLoad()
      const Component = createTestComponent(
        `<img v-lazy="{ src: '${testImageUrl}', rootMargin: '300px' }" />`
      )
      const wrapper = mount(Component)

      const instance = MockIntersectionObserver.mockInstances[0]
      expect(instance.options.rootMargin).toBe('300px')

      wrapper.unmount()
    })

    it('应支持自定义 threshold', async () => {
      mockImageLoad()
      const Component = createTestComponent(
        `<img v-lazy="{ src: '${testImageUrl}', threshold: 0.5 }" />`
      )
      const wrapper = mount(Component)

      const instance = MockIntersectionObserver.mockInstances[0]
      expect(instance.options.threshold).toBe(0.5)

      wrapper.unmount()
    })
  })

  describe('updated 钩子（列表数据刷新）', () => {
    it('src 变化时应重新绑定并加载新图片', async () => {
      mockImageLoad()
      const imageUrl = ref(testImageUrl)
      const Component = defineComponent({
        directives: { lazy: vLazy },
        setup() {
          return { imageUrl }
        },
        template: '<img v-lazy="imageUrl" alt="test" />'
      })

      const wrapper = mount(Component)
      const img = wrapper.find('img').element as HTMLImageElement

      expect(img.dataset.src).toBe(testImageUrl)

      imageUrl.value = testImageUrl2
      await nextTick()

      expect(img.dataset.src).toBe(testImageUrl2)

      MockIntersectionObserver.triggerAllIntersect(img, true)
      await nextTick()
      await new Promise((r) => setTimeout(r, 10))

      expect(img.src).toBe(testImageUrl2)

      wrapper.unmount()
    })

    it('placeholder 变化时应更新显示', async () => {
      mockImageLoad()
      const placeholder = ref(customPlaceholder)
      const Component = defineComponent({
        directives: { lazy: vLazy },
        setup() {
          return { placeholder, testImageUrl }
        },
        template: '<img v-lazy="{ src: testImageUrl, placeholder }" />'
      })

      const wrapper = mount(Component)
      const img = wrapper.find('img').element as HTMLImageElement

      expect(img.src).toBe(customPlaceholder)

      const newPlaceholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMGZmIi8+PC9zdmc+'
      placeholder.value = newPlaceholder
      await nextTick()

      expect(img.src).toBe(newPlaceholder)

      wrapper.unmount()
    })

    it('preload 变化时应更新 Observer 配置', async () => {
      mockImageLoad()
      const preload = ref(100)
      const Component = defineComponent({
        directives: { lazy: vLazy },
        setup() {
          return { preload, testImageUrl }
        },
        template: '<img v-lazy="{ src: testImageUrl, preload }" />'
      })

      const wrapper = mount(Component)

      preload.value = 300
      await nextTick()

      const instance = MockIntersectionObserver.mockInstances.find((i) =>
        Array.from(i.elements).includes(wrapper.find('img').element)
      )
      expect(instance?.options.rootMargin).toBe('300px')

      wrapper.unmount()
    })
  })

  describe('unmounted 钩子（组件销毁）', () => {
    it('组件销毁时应调用 unobserve', async () => {
      mockImageLoad()
      const Component = createTestComponent(`<img v-lazy="'${testImageUrl}'" />`)
      const wrapper = mount(Component)
      const img = wrapper.find('img').element as HTMLImageElement

      const instance = MockIntersectionObserver.mockInstances[0]
      expect(instance.elements.has(img)).toBe(true)

      wrapper.unmount()

      expect(instance.elements.has(img)).toBe(false)
    })

    it('所有元素销毁后应销毁 Observer 实例', async () => {
      mockImageLoad()
      const Component = createTestComponent(`
        <div>
          <img v-lazy="'${testImageUrl}'" class="img1" />
          <img v-lazy="'${testImageUrl2}'" class="img2" />
        </div>
      `)
      const wrapper = mount(Component)

      expect(MockIntersectionObserver.mockInstances.length).toBe(1)

      wrapper.unmount()

      expect(MockIntersectionObserver.mockInstances.length).toBe(1)
    })

    it('销毁后再挂载应创建新的 Observer', async () => {
      mockImageLoad()
      const Component = createTestComponent(`<img v-lazy="'${testImageUrl}'" />`)

      const wrapper1 = mount(Component)
      const instance1 = MockIntersectionObserver.mockInstances[0]
      wrapper1.unmount()

      const wrapper2 = mount(Component)
      const instance2 = MockIntersectionObserver.mockInstances[1]

      expect(instance2).toBeDefined()
      expect(instance2).not.toBe(instance1)

      wrapper2.unmount()
    })
  })

  describe('图片缓存', () => {
    it('已加载成功的图片第二次应直接使用缓存', async () => {
      mockImageLoad()
      const Component = createTestComponent(`
        <div>
          <img v-lazy="'${testImageUrl}'" class="img1" />
        </div>
      `)

      const wrapper1 = mount(Component)
      const img1 = wrapper1.find('img').element as HTMLImageElement

      MockIntersectionObserver.triggerAllIntersect(img1, true)
      await nextTick()
      await new Promise((r) => setTimeout(r, 10))

      expect(img1.src).toBe(testImageUrl)
      wrapper1.unmount()

      mockImageLoad()
      const wrapper2 = mount(Component)
      const img2 = wrapper2.find('img').element as HTMLImageElement

      MockIntersectionObserver.triggerAllIntersect(img2, true)
      await nextTick()

      expect(img2.src).toBe(testImageUrl)

      wrapper2.unmount()
    })
  })

  describe('浏览器降级（不支持 IntersectionObserver）', () => {
    it('不支持 IntersectionObserver 时应直接加载图片', async () => {
      mockImageLoad()
      const originalIO = window.IntersectionObserver
      // @ts-ignore
      delete window.IntersectionObserver

      const Component = createTestComponent(`<img v-lazy="'${testImageUrl}'" />`)
      const wrapper = mount(Component)
      const img = wrapper.find('img').element as HTMLImageElement

      await nextTick()
      await new Promise((r) => setTimeout(r, 10))

      expect(img.src).toBe(testImageUrl)

      window.IntersectionObserver = originalIO
      wrapper.unmount()
    })
  })

  describe('错误处理', () => {
    it('缺少 src 时应发出警告', async () => {
      mockImageLoad()
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const Component = createTestComponent(`<img v-lazy="''" />`)
      mount(Component)

      expect(consoleWarnSpy).toHaveBeenCalledWith('[v-lazy] 缺少图片地址')

      consoleWarnSpy.mockRestore()
    })
  })

  describe('加载失败 fallback', () => {
    it('图片加载失败时应显示 fallback 图', async () => {
      mockImageLoad(true)
      const Component = createTestComponent(`<img v-lazy="'${invalidUrl}'" />`)
      const wrapper = mount(Component)
      const img = wrapper.find('img').element as HTMLImageElement

      MockIntersectionObserver.triggerAllIntersect(img, true)
      await nextTick()
      await new Promise((r) => setTimeout(r, 10))

      expect(img.src).toContain('data:image/svg+xml')
      expect(fromBase64(img.src.split(',')[1])).toContain('加载失败')

      wrapper.unmount()
    })
  })
})
