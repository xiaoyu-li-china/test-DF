import { create } from 'zustand'
import type { Asset, StockInRecord, StockOutRequest, Notification } from '@/types'
import { generateId } from '@/lib/utils'

interface AssetState {
  assets: Asset[]
  stockInRecords: StockInRecord[]
  stockOutRequests: StockOutRequest[]
  notifications: Notification[]
  lowStockThreshold: number

  addAsset: (asset: Omit<Asset, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => Asset
  updateAsset: (id: string, updates: Partial<Asset>) => void
  deleteAsset: (id: string) => void
  getAssetByQrCode: (qrCode: string) => Asset | undefined

  scanStockIn: (qrCode: string, quantity: number, operator: string) => { success: boolean; message: string; asset?: Asset }
  createStockOutRequest: (request: Omit<StockOutRequest, 'id' | 'status' | 'createdAt'>) => StockOutRequest
  approveStockOut: (id: string, reviewer: string) => { success: boolean; message: string }
  rejectStockOut: (id: string, reviewer: string, rejectionReason: string) => { success: boolean; message: string }

  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  markNotificationRead: (id: string) => void
  checkLowStock: (assetId?: string) => void

  getStockInRecords: () => StockInRecord[]
  getStockOutRequests: () => StockOutRequest[]
  getPendingRequestsCount: () => number
  getLowStockAssets: () => Asset[]
}

const initialAssets: Asset[] = [
  {
    id: 'asset-001',
    name: 'MacBook Pro 14寸',
    qrCode: 'QR-ASSET-001',
    quantity: 5,
    lowStockThreshold: 2,
    category: '电子设备',
    location: 'A仓-01-01',
    status: 'in_stock',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'asset-002',
    name: '机械键盘',
    qrCode: 'QR-ASSET-002',
    quantity: 3,
    lowStockThreshold: 5,
    category: '办公设备',
    location: 'B仓-02-03',
    status: 'low_stock',
    createdAt: '2024-01-16T14:30:00Z',
    updatedAt: '2024-01-20T09:15:00Z',
  },
  {
    id: 'asset-003',
    name: '人体工学椅',
    qrCode: 'QR-ASSET-003',
    quantity: 10,
    lowStockThreshold: 3,
    category: '办公家具',
    location: 'C仓-01-02',
    status: 'in_stock',
    createdAt: '2024-01-17T08:00:00Z',
    updatedAt: '2024-01-17T08:00:00Z',
  },
  {
    id: 'asset-004',
    name: '4K显示器',
    qrCode: 'QR-ASSET-004',
    quantity: 1,
    lowStockThreshold: 2,
    category: '电子设备',
    location: 'A仓-01-02',
    status: 'low_stock',
    createdAt: '2024-01-18T11:20:00Z',
    updatedAt: '2024-01-22T16:45:00Z',
  },
  {
    id: 'asset-005',
    name: '无线鼠标',
    qrCode: 'QR-ASSET-005',
    quantity: 0,
    lowStockThreshold: 5,
    category: '办公设备',
    location: 'B仓-03-01',
    status: 'out_of_stock',
    createdAt: '2024-01-19T13:10:00Z',
    updatedAt: '2024-01-25T10:30:00Z',
  },
]

function getAssetStatus(quantity: number, threshold: number): Asset['status'] {
  if (quantity <= 0) return 'out_of_stock'
  if (quantity <= threshold) return 'low_stock'
  return 'in_stock'
}

export const useAssetStore = create<AssetState>((set, get) => ({
  assets: initialAssets,
  stockInRecords: [],
  stockOutRequests: [],
  notifications: [],
  lowStockThreshold: 5,

  addAsset: (assetData) => {
    const now = new Date().toISOString()
    const newAsset: Asset = {
      ...assetData,
      id: `asset-${generateId()}`,
      createdAt: now,
      updatedAt: now,
      status: getAssetStatus(assetData.quantity, assetData.lowStockThreshold),
    }
    set((state) => ({ assets: [...state.assets, newAsset] }))
    get().checkLowStock(newAsset.id)
    return newAsset
  },

  updateAsset: (id, updates) => {
    set((state) => ({
      assets: state.assets.map((a) =>
        a.id === id
          ? {
              ...a,
              ...updates,
              updatedAt: new Date().toISOString(),
              status: getAssetStatus(
                updates.quantity ?? a.quantity,
                updates.lowStockThreshold ?? a.lowStockThreshold
              ),
            }
          : a
      ),
    }))
    get().checkLowStock(id)
  },

  deleteAsset: (id) => {
    set((state) => ({ assets: state.assets.filter((a) => a.id !== id) }))
  },

  getAssetByQrCode: (qrCode) => {
    return get().assets.find((a) => a.qrCode === qrCode)
  },

  scanStockIn: (qrCode, quantity, operator) => {
    const asset = get().getAssetByQrCode(qrCode)
    if (!asset) {
      return { success: false, message: '未找到对应资产，请检查二维码' }
    }

    const newQuantity = asset.quantity + quantity
    get().updateAsset(asset.id, { quantity: newQuantity })

    const record: StockInRecord = {
      id: `stockin-${generateId()}`,
      assetId: asset.id,
      assetName: asset.name,
      quantity,
      operator,
      timestamp: new Date().toISOString(),
      source: 'qr_scan',
    }
    set((state) => ({ stockInRecords: [record, ...state.stockInRecords] }))

    get().addNotification({
      type: 'stock_in',
      title: '资产入库',
      message: `${asset.name} 入库 ${quantity} 件，当前库存 ${newQuantity} 件`,
      assetId: asset.id,
      assetName: asset.name,
    })

    return { success: true, message: `成功入库 ${quantity} 件 ${asset.name}`, asset: { ...asset, quantity: newQuantity } }
  },

  createStockOutRequest: (requestData) => {
    const newRequest: StockOutRequest = {
      ...requestData,
      id: `req-${generateId()}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    set((state) => ({ stockOutRequests: [newRequest, ...state.stockOutRequests] }))

    get().addNotification({
      type: 'approval',
      title: '新的出库申请',
      message: `${requestData.requester} 申请出库 ${requestData.assetName} ${requestData.quantity} 件`,
      assetId: requestData.assetId,
      assetName: requestData.assetName,
    })

    return newRequest
  },

  approveStockOut: (id, reviewer) => {
    const request = get().stockOutRequests.find((r) => r.id === id)
    if (!request) {
      return { success: false, message: '申请不存在' }
    }
    if (request.status !== 'pending') {
      return { success: false, message: '该申请已处理' }
    }

    const asset = get().assets.find((a) => a.id === request.assetId)
    if (!asset) {
      return { success: false, message: '资产不存在' }
    }
    if (asset.quantity < request.quantity) {
      return { success: false, message: '库存不足' }
    }

    const newQuantity = asset.quantity - request.quantity
    get().updateAsset(asset.id, { quantity: newQuantity })

    set((state) => ({
      stockOutRequests: state.stockOutRequests.map((r) =>
        r.id === id
          ? { ...r, status: 'approved', reviewedAt: new Date().toISOString(), reviewer }
          : r
      ),
    }))

    get().addNotification({
      type: 'stock_out',
      title: '出库申请已通过',
      message: `${request.assetName} 出库 ${request.quantity} 件，当前库存 ${newQuantity} 件`,
      assetId: request.assetId,
      assetName: request.assetName,
    })

    return { success: true, message: '已批准出库' }
  },

  rejectStockOut: (id, reviewer, rejectionReason) => {
    const request = get().stockOutRequests.find((r) => r.id === id)
    if (!request) {
      return { success: false, message: '申请不存在' }
    }
    if (request.status !== 'pending') {
      return { success: false, message: '该申请已处理' }
    }

    set((state) => ({
      stockOutRequests: state.stockOutRequests.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'rejected',
              reviewedAt: new Date().toISOString(),
              reviewer,
              rejectionReason,
            }
          : r
      ),
    }))

    get().addNotification({
      type: 'approval',
      title: '出库申请已拒绝',
      message: `${request.assetName} 出库 ${request.quantity} 件的申请已拒绝`,
      assetId: request.assetId,
      assetName: request.assetName,
    })

    return { success: true, message: '已拒绝出库' }
  },

  addNotification: (notificationData) => {
    const notification: Notification = {
      ...notificationData,
      id: `notif-${generateId()}`,
      timestamp: new Date().toISOString(),
      read: false,
    }
    set((state) => ({ notifications: [notification, ...state.notifications] }))
  },

  markNotificationRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }))
  },

  checkLowStock: (assetId) => {
    const state = get()
    const assetsToCheck = assetId
      ? state.assets.filter((a) => a.id === assetId)
      : state.assets

    assetsToCheck.forEach((asset) => {
      if (asset.quantity <= asset.lowStockThreshold && asset.quantity > 0) {
        const existingNotification = state.notifications.find(
          (n) => n.type === 'low_stock' && n.assetId === asset.id && !n.read
        )
        if (!existingNotification) {
          get().addNotification({
            type: 'low_stock',
            title: '库存预警',
            message: `${asset.name} 当前库存 ${asset.quantity} 件，低于阈值 ${asset.lowStockThreshold} 件`,
            assetId: asset.id,
            assetName: asset.name,
            emailSent: true,
          })
        }
      }
    })
  },

  getStockInRecords: () => get().stockInRecords,
  getStockOutRequests: () => get().stockOutRequests,
  getPendingRequestsCount: () => get().stockOutRequests.filter((r) => r.status === 'pending').length,
  getLowStockAssets: () => get().assets.filter((a) => a.status === 'low_stock' || a.status === 'out_of_stock'),
}))
