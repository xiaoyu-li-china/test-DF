import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ClipboardList,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  User,
  FileText,
  Loader2,
} from 'lucide-react'
import {
  approveStockOut,
  rejectStockOut,
  createStockOutRequest,
} from '@/api/assetApi'
import { useAssetStore } from '@/stores/useAssetStore'
import { formatDate } from '@/lib/utils'
import type { StockOutRequest } from '@/types'

export default function StockOut() {
  const { assets, stockOutRequests } = useAssetStore()
  const [activeTab, setActiveTab] = useState<'pending' | 'new'>('pending')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [newRequest, setNewRequest] = useState({
    assetId: '',
    quantity: 1,
    requester: '',
    reason: '',
  })
  const [creating, setCreating] = useState(false)

  const pendingRequests = stockOutRequests.filter((r) => r.status === 'pending')
  const selectedAsset = assets.find((a) => a.id === newRequest.assetId)

  const handleApprove = async (id: string) => {
    setProcessingId(id)
    setMessage(null)

    try {
      const response = await approveStockOut(id, '审批员')
      if (response.success) {
        setMessage({ type: 'success', text: '已批准出库申请' })
      } else {
        setMessage({ type: 'error', text: response.message || '操作失败' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '操作失败，请重试' })
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (id: string) => {
    if (!rejectionReason.trim()) {
      setMessage({ type: 'error', text: '请填写拒绝原因' })
      return
    }

    setRejectingId(id)
    setMessage(null)

    try {
      const response = await rejectStockOut(id, '审批员', rejectionReason)
      if (response.success) {
        setMessage({ type: 'success', text: '已拒绝出库申请' })
        setRejectionReason('')
        setRejectingId(null)
      } else {
        setMessage({ type: 'error', text: response.message || '操作失败' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '操作失败，请重试' })
    } finally {
      if (rejectingId) setRejectingId(null)
    }
  }

  const handleCreateRequest = async () => {
    if (!newRequest.assetId || !newRequest.requester.trim() || !newRequest.reason.trim()) {
      setMessage({ type: 'error', text: '请填写完整信息' })
      return
    }

    if (selectedAsset && newRequest.quantity > selectedAsset.quantity) {
      setMessage({ type: 'error', text: '申请数量超过库存' })
      return
    }

    setCreating(true)
    setMessage(null)

    try {
      const asset = assets.find((a) => a.id === newRequest.assetId)
      if (!asset) {
        setMessage({ type: 'error', text: '资产不存在' })
        return
      }

      const response = await createStockOutRequest({
        assetId: newRequest.assetId,
        assetName: asset.name,
        quantity: newRequest.quantity,
        requester: newRequest.requester,
        reason: newRequest.reason,
      })

      if (response.success) {
        setMessage({ type: 'success', text: '出库申请已提交，等待审批' })
        setNewRequest({ assetId: '', quantity: 1, requester: '', reason: '' })
        setActiveTab('pending')
      } else {
        setMessage({ type: 'error', text: response.message || '提交失败' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '提交失败，请重试' })
    } finally {
      setCreating(false)
    }
  }

  const getStatusBadge = (status: StockOutRequest['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
            <Clock className="w-3 h-3" />
            待审批
          </span>
        )
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3" />
            已批准
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
            <XCircle className="w-3 h-3" />
            已拒绝
          </span>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <ClipboardList className="w-6 h-6 text-orange-600" />
              <h1 className="text-xl font-bold text-gray-900">出库审批</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('pending')}
                className={`flex-1 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'pending'
                    ? 'border-orange-500 text-orange-600 bg-orange-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                待审批 ({pendingRequests.length})
              </button>
              <button
                onClick={() => setActiveTab('new')}
                className={`flex-1 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'new'
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                新建申请
              </button>
            </nav>
          </div>

          {message && (
            <div
              className={`mx-4 mt-4 p-3 rounded-lg flex items-center gap-2 ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
              <span
                className={`text-sm ${
                  message.type === 'success' ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {message.text}
              </span>
            </div>
          )}

          {activeTab === 'pending' && (
            <div className="p-6">
              {pendingRequests.length === 0 ? (
                <div className="text-center py-12">
                  <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">暂无待审批的出库申请</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-orange-100 rounded-lg">
                            <Package className="w-5 h-5 text-orange-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {request.assetName}
                            </h4>
                            <p className="text-sm text-gray-500 mt-1">
                              申请数量: <span className="font-semibold">{request.quantity}</span> 件
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <User className="w-4 h-4" />
                          <span>申请人: {request.requester}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <FileText className="w-4 h-4" />
                          <span className="truncate">事由: {request.reason}</span>
                        </div>
                      </div>

                      <p className="mt-2 text-xs text-gray-400">
                        申请时间: {formatDate(request.createdAt)}
                      </p>

                      {rejectingId === request.id ? (
                        <div className="mt-4 space-y-3">
                          <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="请输入拒绝原因..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleReject(request.id)}
                              disabled={!rejectionReason.trim()}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {rejectingId === request.id && rejectingId ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                '确认拒绝'
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setRejectingId(null)
                                setRejectionReason('')
                              }}
                              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 flex gap-3">
                          <button
                            onClick={() => handleApprove(request.id)}
                            disabled={processingId === request.id}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {processingId === request.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            批准出库
                          </button>
                          <button
                            onClick={() => setRejectingId(request.id)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50"
                          >
                            <XCircle className="w-4 h-4" />
                            拒绝申请
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {stockOutRequests.filter((r) => r.status !== 'pending').length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-4">历史记录</h3>
                  <div className="space-y-3">
                    {stockOutRequests
                      .filter((r) => r.status !== 'pending')
                      .slice(0, 5)
                      .map((request) => (
                        <div
                          key={request.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {request.assetName} · {request.quantity} 件
                            </p>
                            <p className="text-xs text-gray-500">
                              {request.requester} · {formatDate(request.createdAt)}
                            </p>
                            {request.rejectionReason && (
                              <p className="text-xs text-red-600 mt-1">
                                拒绝原因: {request.rejectionReason}
                              </p>
                            )}
                          </div>
                          {getStatusBadge(request.status)}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'new' && (
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择资产
                </label>
                <select
                  value={newRequest.assetId}
                  onChange={(e) => setNewRequest({ ...newRequest, assetId: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">请选择资产...</option>
                  {assets
                    .filter((a) => a.quantity > 0)
                    .map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.name} (库存: {asset.quantity} 件)
                      </option>
                    ))}
                </select>
              </div>

              {selectedAsset && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">{selectedAsset.name}</span> 当前库存{' '}
                    <span className="font-bold">{selectedAsset.quantity}</span> 件
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    申请数量
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedAsset?.quantity || 999}
                    value={newRequest.quantity}
                    onChange={(e) =>
                      setNewRequest({
                        ...newRequest,
                        quantity: Math.max(
                          1,
                          Math.min(selectedAsset?.quantity || 999, parseInt(e.target.value) || 1)
                        ),
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    申请人
                  </label>
                  <input
                    type="text"
                    value={newRequest.requester}
                    onChange={(e) => setNewRequest({ ...newRequest, requester: e.target.value })}
                    placeholder="请输入姓名"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  出库事由
                </label>
                <textarea
                  value={newRequest.reason}
                  onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
                  placeholder="请说明出库用途..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <button
                onClick={handleCreateRequest}
                disabled={creating}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    提交中...
                  </>
                ) : (
                  <>
                    <ClipboardList className="w-5 h-5" />
                    提交出库申请
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
