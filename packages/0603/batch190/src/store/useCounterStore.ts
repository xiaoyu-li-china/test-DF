import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'

interface CounterState {
  count: number
  loading: boolean
  error: string | null
  increment: () => void
  decrement: () => void
  incrementAsync: (amount: number, delay?: number) => Promise<void>
  reset: () => void
  clearError: () => void
}

export const useCounterStore = create<CounterState>()(
  devtools(
    persist(
      (set) => ({
        count: 0,
        loading: false,
        error: null,

        increment: () =>
          set((state) => ({ count: state.count + 1 }), false, 'counter/increment'),

        decrement: () =>
          set((state) => ({ count: state.count - 1 }), false, 'counter/decrement'),

        incrementAsync: async (amount, delay = 1000) => {
          try {
            set({ loading: true, error: null }, false, 'counter/incrementAsync/pending')
            await new Promise((resolve, reject) => {
              setTimeout(() => {
                if (amount <= 0) {
                  reject(new Error('增量必须大于 0'))
                } else {
                  resolve(null)
                }
              }, delay)
            })
            set(
              (state) => ({ count: state.count + amount, loading: false }),
              false,
              'counter/incrementAsync/fulfilled'
            )
          } catch (err) {
            const message = err instanceof Error ? err.message : '异步更新失败'
            set({ loading: false, error: message }, false, 'counter/incrementAsync/rejected')
          }
        },

        reset: () =>
          set({ count: 0, error: null }, false, 'counter/reset'),

        clearError: () =>
          set({ error: null }, false, 'counter/clearError'),
      }),
      {
        name: 'counter-storage',
        partialize: (state) => ({ count: state.count }),
      }
    ),
    {
      name: 'Counter Store',
      enabled: true,
    }
  )
)
