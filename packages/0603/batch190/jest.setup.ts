import { jest, beforeEach } from '@jest/globals'
import '@testing-library/jest-dom'

const localStorageMock: Storage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0,
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

beforeEach(() => {
  jest.clearAllMocks()
  localStorage.clear()
  ;(localStorage.getItem as jest.Mock).mockReturnValue(null)
})
