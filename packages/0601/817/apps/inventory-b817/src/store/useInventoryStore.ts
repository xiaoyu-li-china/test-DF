import { create } from 'zustand'
import type { SKUItem, AlertItem, TrendPoint } from '@/types'

interface InventoryState {
  skus: SKUItem[]
  alerts: AlertItem[]
  trends: TrendPoint[]
  isConnected: boolean
  setSkus: (skus: SKUItem[]) => void
  updateSku: (sku: SKUItem) => void
  applySnapshot: (skus: SKUItem[]) => void
  setConnected: (v: boolean) => void
}

const MAX_ALERTS = 50
const MAX_TREND_POINTS = 200

export const useInventoryStore = create<InventoryState>((set) => ({
  skus: [],
  alerts: [],
  trends: [],
  isConnected: true,

  setSkus: (skus) => {
    const now = Date.now()
    const newAlerts: AlertItem[] = skus
      .filter((s) => s.stock < s.threshold)
      .map((s) => ({
        id: `alert-${s.id}-${now}`,
        skuId: s.id,
        skuName: s.name,
        warehouse: s.warehouse,
        currentStock: s.stock,
        threshold: s.threshold,
        timestamp: now,
      }))

    const newTrends: TrendPoint[] = skus.map((s) => ({
      timestamp: now,
      skuId: s.id,
      stock: s.stock,
    }))

    set((state) => ({
      skus,
      alerts: [...newAlerts, ...state.alerts].slice(0, MAX_ALERTS),
      trends: [...state.trends, ...newTrends].slice(-MAX_TREND_POINTS),
    }))
  },

  updateSku: (sku) => {
    const now = Date.now()
    set((state) => {
      const skus = state.skus.map((s) => (s.id === sku.id ? sku : s))

      const newAlerts: AlertItem[] =
        sku.stock < sku.threshold
          ? [
              {
                id: `alert-${sku.id}-${now}`,
                skuId: sku.id,
                skuName: sku.name,
                warehouse: sku.warehouse,
                currentStock: sku.stock,
                threshold: sku.threshold,
                timestamp: now,
              },
            ]
          : []

      const newTrend: TrendPoint = {
        timestamp: now,
        skuId: sku.id,
        stock: sku.stock,
      }

      return {
        skus,
        alerts: [...newAlerts, ...state.alerts].slice(0, MAX_ALERTS),
        trends: [...state.trends, newTrend].slice(-MAX_TREND_POINTS),
      }
    })
  },

  applySnapshot: (skus) => {
    const now = Date.now()
    const newAlerts: AlertItem[] = skus
      .filter((s) => s.stock < s.threshold)
      .map((s) => ({
        id: `alert-${s.id}-snap-${now}`,
        skuId: s.id,
        skuName: s.name,
        warehouse: s.warehouse,
        currentStock: s.stock,
        threshold: s.threshold,
        timestamp: now,
      }))

    const newTrends: TrendPoint[] = skus.map((s) => ({
      timestamp: now,
      skuId: s.id,
      stock: s.stock,
    }))

    set((state) => ({
      skus,
      alerts: [...newAlerts, ...state.alerts].slice(0, MAX_ALERTS),
      trends: [...state.trends, ...newTrends].slice(-MAX_TREND_POINTS),
    }))
  },

  setConnected: (v) => set({ isConnected: v }),
}))
