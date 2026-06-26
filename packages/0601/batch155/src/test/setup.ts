import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

export const mockSystemTime = (isoString: string) => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(isoString))
}

export const restoreSystemTime = () => {
  vi.useRealTimers()
}
