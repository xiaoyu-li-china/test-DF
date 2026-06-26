import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Package, QrCode, ClipboardList, Bell, Download, Search, Filter, AlertTriangle, XCircle } from 'lucide-react'
import { useAssetStore } from '@/stores/useAssetStore'
import { exportAssetsToCSV, downloadCSV } from '@/api/assetApi'
import { formatDate } from '@/lib/utils'
import type { Asset } from '@/types'

export default function Home() {
  const { assets, getLowStockAssets } = useAssetStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [failedItems, setFailedItems] = useState<Asset[]>([])

  const categories = useMemo(() => {
    const cats = new Set(assets.map((a) => a.category))
    return Array.from(cats)
  }, [assets])

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesSearch =
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.qrCode.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || asset.status === statusFilter
      const matchesCategory = categoryFilter === 'all' || asset.category === categoryFilter
      return matchesSearch && matchesStatus && matchesCategory
    })
  }, [assets, searchTerm, statusFilter, categoryFilter])

  const lowStockCount = getLowStockAssets().length
  const pendingCount = useAssetStore.getState().getPendingRequestsCount()

  const handleExport = async () => {
    setExporting(true)
    setExportError(null)
    setFailedItems([])

    try {
      const result = await exportAssetsToCSV(filteredAssets)

      if (!result.success || !result.data) {
        setExportError(result.message || '导出失败')
        setFailedItems(result.data?.failedItems || [])
        return
      }

      if (result.data.failedItems.length > 0) {
        setFailedItems(result.data.failedItems)
      }

      const filename = `资产列表_${new Date().toISOString().slice(0, 10)}.csv`
      await downloadCSV(result.data.csvContent, filename)

      setFailedItems([])
    } catch (error) {
      setExportError('导出过程出错，请重试')
    } finally {
      setExporting(false)
    }
  }

  const getStatusBadge = (status: Asset['status'], isFailed: boolean = false) => {
    if (isFailed) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700 border border-red-300">
          导出失败
        </span>
      )
    }
    switch (status) {
      case 'in_stock':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
            正常
          </span>
        )
      case 'low_stock':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
            低库存
          </span>
        )
      case 'out_of_stock':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
            缺货
          </span>
        )
    }
  }

  const isFailedItem = (asset: Asset) => {
    return failedItems.some((item) => item.id === asset.id)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">资产管理系统</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/notifications"
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <Bell className="w-6 h-6" />
                {lowStockCount > 0 && (
                  <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {lowStockCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Link
            to="/stock-in"
            className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow border-2 border-transparent hover:border-blue-300"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <QrCode className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">扫码入库</p>
                <p className="text-lg font-semibold text-gray-900">QR 扫描</p>
              </div>
            </div>
          </Link>

          <Link
            to="/stock-out"
            className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow border-2 border-transparent hover:border-orange-300"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-lg">
                <ClipboardList className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">出库审批</p>
                <p className="text-lg font-semibold text-gray-900">
                  {pendingCount > 0 ? `${pendingCount} 待审批` : '无待审'}
                </p>
              </div>
            </div>
          </Link>

          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Package className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">资产总数</p>
                <p className="text-lg font-semibold text-gray-900">{assets.length} 件</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">库存预警</p>
                <p className="text-lg font-semibold text-gray-900">{lowStockCount} 件</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-lg font-semibold text-gray-900">资产列表</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="搜索名称或二维码..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                    >
                      <option value="all">全部状态</option>
                      <option value="in_stock">正常</option>
                      <option value="low_stock">低库存</option>
                      <option value="out_of_stock">缺货</option>
                    </select>
                  </div>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                  >
                    <option value="all">全部分类</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleExport}
                  disabled={exporting || filteredAssets.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {exporting ? '导出中...' : '导出 CSV'}
                </button>
              </div>
            </div>
            {exportError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{exportError}</p>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    资产名称
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    二维码
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    库存
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    分类
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    位置
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    更新时间
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAssets.map((asset) => (
                  <tr
                    key={asset.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      isFailedItem(asset) ? 'bg-red-50' : ''
                    }`}
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{asset.name}</span>
                        {isFailedItem(asset) && <XCircle className="w-4 h-4 text-red-500" />}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {asset.qrCode}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span
                        className={`font-semibold ${
                          asset.quantity <= asset.lowStockThreshold ? 'text-red-600' : 'text-gray-900'
                        }`}
                      >
                        {asset.quantity}
                      </span>
                      <span className="text-gray-400 text-sm"> / {asset.lowStockThreshold}</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {asset.category}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {asset.location}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {getStatusBadge(asset.status, isFailedItem(asset))}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(asset.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredAssets.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">暂无资产数据</p>
              </div>
            )}
          </div>
        </div>

        {failedItems.length > 0 && (
          <div className="mt-6 bg-white rounded-xl shadow-sm overflow-hidden border-2 border-red-200">
            <div className="p-4 bg-red-50 border-b border-red-200">
              <h3 className="text-lg font-semibold text-red-800 flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                导出失败条目 ({failedItems.length})
              </h3>
              <p className="text-sm text-red-600 mt-1">
                以下条目导出失败，已保留在列表中，请检查后重试
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-red-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-red-600 uppercase tracking-wider">
                      资产名称
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-red-600 uppercase tracking-wider">
                      二维码
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-red-600 uppercase tracking-wider">
                      库存
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-red-600 uppercase tracking-wider">
                      状态
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-100">
                  {failedItems.map((asset) => (
                    <tr key={asset.id} className="bg-red-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="font-medium text-red-800">{asset.name}</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-red-600">
                        {asset.qrCode}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-red-600">
                        {asset.quantity}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {getStatusBadge(asset.status, true)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
