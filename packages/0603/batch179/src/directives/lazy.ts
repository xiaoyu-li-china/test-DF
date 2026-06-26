import type { Directive, DirectiveBinding } from 'vue'

interface ObserverConfig {
  rootMargin?: string
  threshold?: number | number[]
}

interface LazyOptions extends ObserverConfig {
  src: string
  placeholder?: string
  fallback?: string
  preload?: number
  loadingText?: string
}

const DEFAULT_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTBlMGUwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuaVsOabui5ur4w8L3RleHQ+PC9zdmc+'

const DEFAULT_FALLBACK = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZmVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iI2U1NjU2NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuWKoOi9veWksei0pTwvdGV4dD48L3N2Zz4='

const DEFAULT_LOADING_TEXT = '加载中...'

const toBase64 = (str: string): string => {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'utf-8').toString('base64')
  }
  try {
    return btoa(unescape(encodeURIComponent(str)))
  } catch {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))))
  }
}

const generateLoadingPlaceholder = (text: string = DEFAULT_LOADING_TEXT): string => {
  const svg = `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#f0f2f5"/>
    <text x="50%" y="50%" font-family="Arial" font-size="14" fill="#909399" text-anchor="middle" dy=".3em">${text}</text>
  </svg>`
  return `data:image/svg+xml;base64,${toBase64(svg)}`
}

const imgCache = new Set<string>()

const observedElements = new WeakSet<HTMLImageElement>()

let observer: IntersectionObserver | null = null

let observerOptions: ObserverConfig | null = null

let observedCount = 0

const loadImage = (el: HTMLImageElement, src: string, fallback: string): void => {
  if (imgCache.has(src)) {
    el.src = src
    return
  }

  const img = new Image()
  img.onload = () => {
    el.src = src
    imgCache.add(src)
  }
  img.onerror = () => {
    el.src = fallback
  }
  img.src = src
}

const handleIntersect = (entries: IntersectionObserverEntry[]): void => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const el = entry.target as HTMLImageElement
      const src = el.dataset.src!
      const fallback = el.dataset.fallback || DEFAULT_FALLBACK
      loadImage(el, src, fallback)
      observer?.unobserve(el)
    }
  })
}

const destroyObserver = (): void => {
  if (observer) {
    observer.disconnect()
    observer = null
    observerOptions = null
  }
}

const getObserver = (options: ObserverConfig = {}): IntersectionObserver => {
  const newOptions: ObserverConfig = {
    rootMargin: options.rootMargin || '0px',
    threshold: options.threshold || 0.1
  }

  if (observer && observerOptions) {
    const optionsChanged =
      observerOptions.rootMargin !== newOptions.rootMargin ||
      observerOptions.threshold !== newOptions.threshold

    if (optionsChanged) {
      destroyObserver()
    }
  }

  if (!observer) {
    observer = new IntersectionObserver(handleIntersect, newOptions)
    observerOptions = newOptions
  }

  return observer
}

const DEFAULT_PRELOAD_DISTANCE = 100

const parseOptions = (
  value: string | number | LazyOptions | undefined | null,
  arg?: string,
  modifiers?: DirectiveBinding['modifiers']
) => {
  let src = ''
  let placeholder: string = DEFAULT_PLACEHOLDER
  let fallback: string = DEFAULT_FALLBACK
  let rootMargin: string | undefined
  let threshold: number | number[] | undefined
  let preload: number | undefined
  let loadingText: string | undefined

  const hasPreloadModifier = modifiers?.preload

  if (arg === 'preload') {
    if (typeof value === 'string') {
      src = value
      preload = DEFAULT_PRELOAD_DISTANCE
    } else if (value && typeof value === 'object') {
      src = value.src || ''
      preload = value.preload ?? DEFAULT_PRELOAD_DISTANCE
      placeholder = value.placeholder || DEFAULT_PLACEHOLDER
      fallback = value.fallback || DEFAULT_FALLBACK
      loadingText = value.loadingText
      threshold = value.threshold
    }
    if (preload !== undefined) {
      rootMargin = `${preload}px`
    }
  } else if (hasPreloadModifier) {
    if (typeof value === 'string') {
      src = value
      preload = DEFAULT_PRELOAD_DISTANCE
    } else if (value && typeof value === 'object') {
      src = value.src || ''
      preload = value.preload ?? DEFAULT_PRELOAD_DISTANCE
      placeholder = value.placeholder || DEFAULT_PLACEHOLDER
      fallback = value.fallback || DEFAULT_FALLBACK
      loadingText = value.loadingText
      threshold = value.threshold
    }
    if (preload !== undefined && !rootMargin) {
      rootMargin = `${preload}px`
    }
  } else if (typeof value === 'string') {
    src = value
  } else if (typeof value === 'number') {
    rootMargin = `${value}px`
  } else if (value && typeof value === 'object') {
    src = value.src || ''
    placeholder = value.placeholder || DEFAULT_PLACEHOLDER
    fallback = value.fallback || DEFAULT_FALLBACK
    rootMargin = value.rootMargin
    threshold = value.threshold
    preload = value.preload
    loadingText = value.loadingText
    if (preload !== undefined && !rootMargin) {
      rootMargin = `${preload}px`
    }
  }

  if (loadingText && placeholder === DEFAULT_PLACEHOLDER) {
    placeholder = generateLoadingPlaceholder(loadingText)
  }

  return { src, placeholder, fallback, rootMargin, threshold, preload, loadingText }
}

const observeElement = (el: HTMLImageElement, rootMargin?: string, threshold?: number | number[]): void => {
  if (!('IntersectionObserver' in window)) return

  if (observedElements.has(el)) {
    observer?.unobserve(el)
    observedElements.delete(el)
    observedCount = Math.max(0, observedCount - 1)
  }

  const obs = getObserver({ rootMargin, threshold })
  obs.observe(el)
  observedElements.add(el)
  observedCount++
}

const unobserveElement = (el: HTMLImageElement): void => {
  if (!observer) return

  if (observedElements.has(el)) {
    observer.unobserve(el)
    observedElements.delete(el)
    observedCount = Math.max(0, observedCount - 1)
  }

  if (observedCount === 0) {
    destroyObserver()
  }
}

const vLazy: Directive<HTMLImageElement, string | number | LazyOptions> = {
  mounted(el: HTMLImageElement, binding: DirectiveBinding<string | number | LazyOptions>) {
    const { src, placeholder, fallback, rootMargin, threshold } = parseOptions(
      binding.value,
      binding.arg,
      binding.modifiers
    )

    if (!src) {
      console.warn('[v-lazy] 缺少图片地址')
      return
    }

    el.src = placeholder
    el.dataset.src = src
    el.dataset.fallback = fallback

    if ('IntersectionObserver' in window) {
      observeElement(el, rootMargin, threshold)
    } else {
      loadImage(el, src, fallback)
    }
  },

  updated(el: HTMLImageElement, binding: DirectiveBinding<string | number | LazyOptions>) {
    const oldOptions = parseOptions(binding.oldValue, binding.arg, binding.modifiers)
    const newOptions = parseOptions(binding.value, binding.arg, binding.modifiers)

    const srcChanged = newOptions.src && newOptions.src !== oldOptions.src
    const configChanged =
      newOptions.placeholder !== oldOptions.placeholder ||
      newOptions.fallback !== oldOptions.fallback ||
      newOptions.rootMargin !== oldOptions.rootMargin ||
      newOptions.threshold !== oldOptions.threshold

    if (!srcChanged && !configChanged) return

    if (newOptions.placeholder !== oldOptions.placeholder) {
      el.src = newOptions.placeholder
    }

    if (srcChanged) {
      el.dataset.src = newOptions.src
    }

    el.dataset.fallback = newOptions.fallback

    if ('IntersectionObserver' in window) {
      observeElement(el, newOptions.rootMargin, newOptions.threshold)
    } else if (srcChanged) {
      loadImage(el, newOptions.src, newOptions.fallback)
    }
  },

  unmounted(el: HTMLImageElement) {
    unobserveElement(el)
  }
}

export default vLazy
export type { LazyOptions }
