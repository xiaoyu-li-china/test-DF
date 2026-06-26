import { beforeEach, vi } from 'vitest'

beforeEach(() => {
  vi.clearAllMocks()
})

globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))
