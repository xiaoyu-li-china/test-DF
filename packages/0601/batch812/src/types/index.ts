export interface Asset {
  id: string
  name: string
  qrCode: string
  quantity: number
  lowStockThreshold: number
  category: string
  location: string
  status: 'in_stock' | 'out_of_stock' | 'low_stock'
  createdAt: string
  updatedAt: string
}

export interface StockInRecord {
  id: string
  assetId: string
  assetName: string
  quantity: number
  operator: string
  timestamp: string
  source: 'qr_scan' | 'manual'
}

export interface StockOutRequest {
  id: string
  assetId: string
  assetName: string
  quantity: number
  requester: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  reviewedAt?: string
  reviewer?: string
  rejectionReason?: string
}

export interface Notification {
  id: string
  type: 'low_stock' | 'stock_in' | 'stock_out' | 'approval'
  title: string
  message: string
  assetId?: string
  assetName?: string
  read: boolean
  timestamp: string
  emailSent?: boolean
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
}
