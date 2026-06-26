import { beforeEach, vi } from 'vitest'

class MockIntersectionObserver {
  callback: IntersectionObserverCallback
  options: IntersectionObserverInit
  elements: Set<Element> = new Set()

  static mockInstances: MockIntersectionObserver[] = []

  constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit = {}) {
    this.callback = callback
    this.options = options
    MockIntersectionObserver.mockInstances.push(this)
  }

  observe(element: Element): void {
    this.elements.add(element)
  }

  unobserve(element: Element): void {
    this.elements.delete(element)
  }

  disconnect(): void {
    this.elements.clear()
  }

  takeRecords(): IntersectionObserverEntry[] {
    return []
  }

  triggerIntersect(element: Element, isIntersecting: boolean = true): void {
    const entry: IntersectionObserverEntry = {
      boundingClientRect: element.getBoundingClientRect(),
      intersectionRatio: isIntersecting ? 1 : 0,
      intersectionRect: isIntersecting ? element.getBoundingClientRect() : {} as DOMRectReadOnly,
      isIntersecting,
      rootBounds: null,
      target: element,
      time: Date.now()
    }
    this.callback([entry], this as unknown as IntersectionObserver)
  }

  static triggerAllIntersect(element: Element, isIntersecting: boolean = true): void {
    MockIntersectionObserver.mockInstances.forEach((instance) => {
      if (instance.elements.has(element)) {
        instance.triggerIntersect(element, isIntersecting)
      }
    })
  }

  static clearMockInstances(): void {
    MockIntersectionObserver.mockInstances = []
  }
}

beforeEach(() => {
  MockIntersectionObserver.clearMockInstances()
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
  window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver
  document.body.innerHTML = ''
})

export { MockIntersectionObserver }
