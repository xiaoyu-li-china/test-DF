import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, QrCode, Package, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { scanStockIn, getAssetByQrCode } from '@/api/assetApi'
import { useAssetStore } from '@/stores/useAssetStore'
import type { Asset } from '@/types'

export default function StockIn() {
  const navigate = useNavigate()
  const { assets } = useAssetStore()
  const [qrCode, setQrCode] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [operator, setOperator] = useState('管理员')
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    asset?: Asset
  } | null>(null)
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>
    if (qrCode) {
      setPreviewLoading(true)
      timeoutId = setTimeout(async () => {
        const response = await getAssetByQrCode(qrCode)
        if (response.success && response.data) {
          setPreviewAsset(response.data)
        } else {
          setPreviewAsset(null)
        }
        setPreviewLoading(false)
      }, 300)
    } else {
      setPreviewAsset(null)
    }
    return () => clearTimeout(timeoutId)
  }, [qrCode])

  const handleScan = async () => {
    if (!qrCode.trim()) {
      setResult({ success: false, message: '请输入二维码' })
      return
    }

    setScanning(true)
    setResult(null)

    try {
      const response = await scanStockIn(qrCode.trim(), quantity, operator)
      if (response.success && response.data) {
        setResult({
          success: true,
          message: `成功入库 ${quantity} 件 ${response.data.asset.name}`,
          asset: response.data.asset,
        })
        setQrCode('')
        setQuantity(1)
      } else {
        setResult({ success: false, message: response.message || '入库失败' })
      }
    } catch (error) {
      setResult({ success: false, message: '操作失败，请重试' })
    } finally {
      setScanning(false)
    }
  }

  const quickScan = async (code: string) => {
    setQrCode(code)
    setQuantity(1)
    setScanning(true)
    setResult(null)

    try {
      const response = await scanStockIn(code, 1, operator)
      if (response.success && response.data) {
        setResult({
          success: true,
          message: `成功入库 1 件 ${response.data.asset.name}`,
          asset: response.data.asset,
        })
        setQrCode('')
      } else {
        setResult({ success: false, message: response.message || '入库失败' })
      }
    } catch (error) {
      setResult({ success: false, message: '操作失败，请重试' })
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <QrCode className="w-6 h-6 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">扫码入库</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                扫描二维码
              </label>
              <div className="relative">
                <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={qrCode}
                  onChange={(e) => setQrCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                  placeholder="输入或扫描二维码..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                />
              </div>
            </div>

            {previewLoading && (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">正在识别资产...</span>
              </div>
            )}

            {previewAsset && !scanning && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <Package className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">{previewAsset.name}</p>
                    <p className="text-sm text-blue-700">
                      当前库存: {previewAsset.quantity} 件
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  入库数量
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  操作员
                </label>
                <input
                  type="text"
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <button
              onClick={handleScan}
              disabled={scanning || !qrCode.trim()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {scanning ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <QrCode className="w-5 h-5" />
                  确认入库
                </>
              )}
            </button>

            {result && (
              <div
                className={`p-4 rounded-lg flex items-start gap-3 ${
                  result.success
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                )}
                <div>
                  <p
                    className={`font-medium ${
                      result.success ? 'text-green-800' : 'text-red-800'
                    }`}
                  >
                    {result.success ? '入库成功' : '入库失败'}
                  </p>
                  <p
                    className={`text-sm mt-1 ${
                      result.success ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {result.message}
                  </p>
                  {result.asset && (
                    <p className="text-sm text-green-600 mt-2">
                      当前库存: {result.asset.quantity} 件
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">快捷测试二维码</h3>
            <div className="grid grid-cols-2 gap-2">
              {assets.slice(0, 4).map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => quickScan(asset.qrCode)}
                  disabled={scanning}
                  className="p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors disabled:opacity-50"
                >
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {asset.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{asset.qrCode}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 text-gray-600 hover:text-gray-900 font-medium"
          >
            返回资产列表
          </button>
        </div>
      </main>
    </div>
  )
}
