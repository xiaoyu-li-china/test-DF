import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useAssetStore } from '@/stores/useAssetStore'

describe('Asset Store', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    const initialState = useAssetStore.getState()
    useAssetStore.setState(initialState, true)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should have initial assets', () => {
    const { assets } = useAssetStore.getState()
    expect(assets.length).toBe(5)
  })

  it('should scan stock in successfully', () => {
    const { scanStockIn, assets } = useAssetStore.getState()
    const initialAsset = assets[0]
    const initialQuantity = initialAsset.quantity

    const result = scanStockIn(initialAsset.qrCode, 1, '测试员')

    expect(result.success).toBe(true)
    expect(result.asset?.quantity).toBe(initialQuantity + 1)

    const updatedAsset = useAssetStore.getState().assets.find((a) => a.id === initialAsset.id)
    expect(updatedAsset?.quantity).toBe(initialQuantity + 1)
  })

  it('should fail scan stock in for invalid QR code', () => {
    const { scanStockIn } = useAssetStore.getState()
    const result = scanStockIn('INVALID-QR', 1, '测试员')
    expect(result.success).toBe(false)
  })

  it('should create stock out request', () => {
    const { createStockOutRequest, assets, stockOutRequests } = useAssetStore.getState()
    const asset = assets[0]
    const initialCount = stockOutRequests.length

    const request = createStockOutRequest({
      assetId: asset.id,
      assetName: asset.name,
      quantity: 1,
      requester: '张三',
      reason: '项目使用',
    })

    expect(request.status).toBe('pending')
    expect(useAssetStore.getState().stockOutRequests.length).toBe(initialCount + 1)
  })

  it('should approve stock out and decrease quantity', () => {
    const { createStockOutRequest, approveStockOut, assets } = useAssetStore.getState()
    const asset = assets[0]
    const initialQuantity = asset.quantity

    const request = createStockOutRequest({
      assetId: asset.id,
      assetName: asset.name,
      quantity: 1,
      requester: '张三',
      reason: '项目使用',
    })

    const result = approveStockOut(request.id, '审批员')

    expect(result.success).toBe(true)

    const updatedAsset = useAssetStore.getState().assets.find((a) => a.id === asset.id)
    expect(updatedAsset?.quantity).toBe(initialQuantity - 1)

    const updatedRequest = useAssetStore.getState().stockOutRequests.find((r) => r.id === request.id)
    expect(updatedRequest?.status).toBe('approved')
  })

  it('should reject stock out and NOT decrease quantity', () => {
    const { createStockOutRequest, rejectStockOut, assets } = useAssetStore.getState()
    const asset = assets[0]
    const initialQuantity = asset.quantity

    const request = createStockOutRequest({
      assetId: asset.id,
      assetName: asset.name,
      quantity: 1,
      requester: '张三',
      reason: '项目使用',
    })

    const result = rejectStockOut(request.id, '审批员', '库存不足')

    expect(result.success).toBe(true)

    const updatedAsset = useAssetStore.getState().assets.find((a) => a.id === asset.id)
    expect(updatedAsset?.quantity).toBe(initialQuantity)

    const updatedRequest = useAssetStore.getState().stockOutRequests.find((r) => r.id === request.id)
    expect(updatedRequest?.status).toBe('rejected')
    expect(updatedRequest?.rejectionReason).toBe('库存不足')
  })

  it('should add low stock notification', () => {
    const { checkLowStock, notifications } = useAssetStore.getState()
    const initialCount = notifications.length

    checkLowStock()

    expect(useAssetStore.getState().notifications.length).toBeGreaterThan(initialCount)
  })

  it('should update asset status based on quantity', () => {
    const { updateAsset, assets } = useAssetStore.getState()
    const asset = assets[0]

    updateAsset(asset.id, { quantity: 0 })

    const updatedAsset = useAssetStore.getState().assets.find((a) => a.id === asset.id)
    expect(updatedAsset?.status).toBe('out_of_stock')
  })
})
