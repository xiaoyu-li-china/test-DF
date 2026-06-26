export interface SKUItem {
  id: string
  name: string
  warehouse: string
  stock: number
  threshold: number
  updatedAt: number
}

export interface AlertItem {
  id: string
  skuId: string
  skuName: string
  warehouse: string
  currentStock: number
  threshold: number
  timestamp: number
}

export interface TrendPoint {
  timestamp: number
  skuId: string
  stock: number
}

export interface WSMessage {
  type: 'update' | 'snapshot' | 'connected' | 'disconnected'
  payload: SKUItem | SKUItem[] | null
}
