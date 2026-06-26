import type { Asset, StockInRecord, StockOutRequest, Notification, ApiResponse } from '@/types'
import { useAssetStore } from '@/stores/useAssetStore'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function getAssets(): Promise<ApiResponse<Asset[]>> {
  await delay(300)
  const assets = useAssetStore.getState().assets
  return { success: true, data: assets }
}

export async function getAssetByQrCode(qrCode: string): Promise<ApiResponse<Asset>> {
  await delay(200)
  const asset = useAssetStore.getState().getAssetByQrCode(qrCode)
  if (!asset) {
    return { success: false, message: '未找到对应资产' }
  }
  return { success: true, data: asset }
}

export async function scanStockIn(
  qrCode: string,
  quantity: number,
  operator: string
): Promise<ApiResponse<{ asset: Asset; record: StockInRecord }>> {
  await delay(500)
  const result = useAssetStore.getState().scanStockIn(qrCode, quantity, operator)
  if (!result.success || !result.asset) {
    return { success: false, message: result.message }
  }
  const records = useAssetStore.getState().stockInRecords
  return { success: true, data: { asset: result.asset, record: records[0] } }
}

export async function createStockOutRequest(
  request: Omit<StockOutRequest, 'id' | 'status' | 'createdAt'>
): Promise<ApiResponse<StockOutRequest>> {
  await delay(400)
  const newRequest = useAssetStore.getState().createStockOutRequest(request)
  return { success: true, data: newRequest }
}

export async function getStockOutRequests(): Promise<ApiResponse<StockOutRequest[]>> {
  await delay(300)
  const requests = useAssetStore.getState().stockOutRequests
  return { success: true, data: requests }
}

export async function approveStockOut(
  id: string,
  reviewer: string
): Promise<ApiResponse<{ request: StockOutRequest; asset: Asset }>> {
  await delay(500)
  const result = useAssetStore.getState().approveStockOut(id, reviewer)
  if (!result.success) {
    return { success: false, message: result.message }
  }
  const requests = useAssetStore.getState().stockOutRequests
  const request = requests.find((r) => r.id === id)
  const assets = useAssetStore.getState().assets
  const asset = assets.find((a) => a.id === request?.assetId)
  return { success: true, data: { request: request!, asset: asset! } }
}

export async function rejectStockOut(
  id: string,
  reviewer: string,
  rejectionReason: string
): Promise<ApiResponse<StockOutRequest>> {
  await delay(500)
  const result = useAssetStore.getState().rejectStockOut(id, reviewer, rejectionReason)
  if (!result.success) {
    return { success: false, message: result.message }
  }
  const requests = useAssetStore.getState().stockOutRequests
  const request = requests.find((r) => r.id === id)
  return { success: true, data: request! }
}

export async function getNotifications(): Promise<ApiResponse<Notification[]>> {
  await delay(200)
  const notifications = useAssetStore.getState().notifications
  return { success: true, data: notifications }
}

export async function markNotificationRead(id: string): Promise<ApiResponse<void>> {
  await delay(100)
  useAssetStore.getState().markNotificationRead(id)
  return { success: true }
}

export async function sendLowStockEmail(assetId: string): Promise<ApiResponse<{ emailSent: boolean; mockEmail: object }>> {
  await delay(800)
  const asset = useAssetStore.getState().assets.find((a) => a.id === assetId)
  if (!asset) {
    return { success: false, message: '资产不存在' }
  }

  const mockEmail = {
    to: 'admin@company.com',
    from: 'system@asset.com',
    subject: `【库存预警】${asset.name} 库存不足`,
    body: `尊敬的管理员：\n\n资产 ${asset.name} (${asset.qrCode}) 当前库存为 ${asset.quantity} 件，已低于预警阈值 ${asset.lowStockThreshold} 件。\n\n请及时补货。\n\n资产管理系统`,
    timestamp: new Date().toISOString(),
  }

  console.log('[MOCK EMAIL SENT]', mockEmail)

  useAssetStore.getState().addNotification({
    type: 'low_stock',
    title: '库存预警邮件已发送',
    message: `${asset.name} 库存预警邮件已发送至管理员`,
    assetId: asset.id,
    assetName: asset.name,
    emailSent: true,
  })

  return { success: true, data: { emailSent: true, mockEmail } }
}

export async function triggerNotify(assetId?: string): Promise<ApiResponse<{ triggered: boolean; notifications: Notification[] }>> {
  await delay(400)
  useAssetStore.getState().checkLowStock(assetId)
  const notifications = useAssetStore.getState().notifications.filter((n) => n.type === 'low_stock')
  return { success: true, data: { triggered: notifications.length > 0, notifications } }
}

export async function exportAssetsToCSV(
  assets: Asset[]
): Promise<ApiResponse<{ successCount: number; failedItems: Asset[]; csvContent: string }>> {
  await delay(600)

  const failedItems: Asset[] = []
  const rows: string[] = []

  const headers = ['ID', '名称', '二维码', '数量', '低库存阈值', '分类', '位置', '状态', '创建时间', '更新时间']
  rows.push(headers.join(','))

  assets.forEach((asset) => {
    if (!asset.id || !asset.name) {
      failedItems.push(asset)
      return
    }
    const statusMap = {
      in_stock: '正常',
      low_stock: '低库存',
      out_of_stock: '缺货',
    }
    const row = [
      asset.id,
      `"${asset.name.replace(/"/g, '""')}"`,
      asset.qrCode,
      asset.quantity,
      asset.lowStockThreshold,
      asset.category,
      asset.location,
      statusMap[asset.status],
      asset.createdAt,
      asset.updatedAt,
    ]
    rows.push(row.join(','))
  })

  if (failedItems.length > 0 && Math.random() > 0.7) {
    return {
      success: false,
      message: `部分条目导出失败，共 ${failedItems.length} 条`,
      data: {
        successCount: assets.length - failedItems.length,
        failedItems,
        csvContent: '',
      },
    }
  }

  const csvContent = '\uFEFF' + rows.join('\n')
  return {
    success: true,
    data: {
      successCount: assets.length - failedItems.length,
      failedItems,
      csvContent,
    },
  }
}

export async function downloadCSV(csvContent: string, filename: string): Promise<ApiResponse<void>> {
  await delay(200)
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  return { success: true }
}
