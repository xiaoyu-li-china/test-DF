import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { act } from '@testing-library/react'
import { useCounterStore } from './useCounterStore'

describe('useCounterStore', () => {
  beforeEach(() => {
    act(() => {
      useCounterStore.setState(useCounterStore.getInitialState())
    })
  })

  it('should have initial state', () => {
    const state = useCounterStore.getState()
    expect(state.count).toBe(0)
    expect(state.loading).toBe(false)
    expect(state.error).toBeNull()
  })

  describe('increment', () => {
    it('should increment count by 1', () => {
      act(() => {
        useCounterStore.getState().increment()
      })
      expect(useCounterStore.getState().count).toBe(1)
    })

    it('should increment count multiple times', () => {
      act(() => {
        useCounterStore.getState().increment()
        useCounterStore.getState().increment()
        useCounterStore.getState().increment()
      })
      expect(useCounterStore.getState().count).toBe(3)
    })
  })

  describe('decrement', () => {
    it('should decrement count by 1', () => {
      act(() => {
        useCounterStore.getState().increment()
        useCounterStore.getState().increment()
        useCounterStore.getState().decrement()
      })
      expect(useCounterStore.getState().count).toBe(1)
    })

    it('should decrement below zero', () => {
      act(() => {
        useCounterStore.getState().decrement()
      })
      expect(useCounterStore.getState().count).toBe(-1)
    })
  })

  describe('reset', () => {
    it('should reset count to 0', () => {
      act(() => {
        useCounterStore.getState().increment()
        useCounterStore.getState().increment()
        useCounterStore.getState().reset()
      })
      expect(useCounterStore.getState().count).toBe(0)
      expect(useCounterStore.getState().error).toBeNull()
    })
  })

  describe('incrementAsync', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should increment count asynchronously', async () => {
      let promise: Promise<void> | undefined

      await act(async () => {
        promise = useCounterStore.getState().incrementAsync(5, 1000)
      })

      expect(useCounterStore.getState().loading).toBe(true)
      expect(useCounterStore.getState().count).toBe(0)

      act(() => {
        jest.advanceTimersByTime(1000)
      })

      await act(async () => {
        await promise
      })

      expect(useCounterStore.getState().loading).toBe(false)
      expect(useCounterStore.getState().count).toBe(5)
      expect(useCounterStore.getState().error).toBeNull()
    })

    it('should handle async error when amount <= 0', async () => {
      let promise: Promise<void> | undefined

      await act(async () => {
        promise = useCounterStore.getState().incrementAsync(-1, 500)
      })

      expect(useCounterStore.getState().loading).toBe(true)

      act(() => {
        jest.advanceTimersByTime(500)
      })

      await act(async () => {
        await promise
      })

      expect(useCounterStore.getState().loading).toBe(false)
      expect(useCounterStore.getState().count).toBe(0)
      expect(useCounterStore.getState().error).toBe('增量必须大于 0')
    })
  })

  describe('clearError', () => {
    it('should clear error', () => {
      act(() => {
        useCounterStore.setState({ error: 'test error' })
      })
      expect(useCounterStore.getState().error).toBe('test error')

      act(() => {
        useCounterStore.getState().clearError()
      })
      expect(useCounterStore.getState().error).toBeNull()
    })
  })

  describe('persist', () => {
    it('should persist count to localStorage', () => {
      act(() => {
        useCounterStore.getState().increment()
        useCounterStore.getState().increment()
        useCounterStore.getState().increment()
      })

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'counter-storage',
        JSON.stringify({ state: { count: 3 }, version: 0 })
      )
    })
  })
})
