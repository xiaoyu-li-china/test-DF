import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Bell,
  AlertTriangle,
  Package,
  ClipboardList,
  CheckCircle,
  Mail,
  Loader2,
} from 'lucide-react'
import { markNotificationRead, sendLowStockEmail, triggerNotify } from '@/api/assetApi'
import { useAssetStore } from '@/stores/useAssetStore'
import { formatDate } from '@/lib/utils'
import type { Notification } from '@/types'

export default function Notifications() {
  const { notifications, getLowStockAssets } = useAssetStore()
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null)
  const [triggering, setTriggering] = useState(false)
  const [emailResult, setEmailResult] = useState<{
    success: boolean
    message: string
    assetName?: string
  } | null>(null)

  const unreadCount = notifications.filter((n) => !n.read).length
  const lowStockAssets = getLowStockAssets()

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id)
  }

  const handleSendEmail = async (assetId: string, assetName: string) => {
    setSendingEmailId(assetId)
    setEmailResult(null)

    try {
      const response = await sendLowStockEmail(assetId)
      if (response.success) {
        setEmailResult({
          success: true,
          message: `库存预警邮件已发送至管理员`,
          assetName,
        })
      } else {
        setEmailResult({ success: false, message: response.message || '发送失败' })
      }
    } catch (error) {
      setEmailResult({ success: false, message: '发送失败，请重试' })
    } finally {
      setSendingEmailId(null)
    }
  }

  const handleTriggerNotify = async () => {
    setTriggering(true)
    setEmailResult(null)

    try {
      const response = await triggerNotify()
      if (response.success && response.data) {
        if (response.data.triggered) {
          setEmailResult({
            success: true,
            message: `已触发库存预警检查，共 ${response.data.notifications.length} 条预警通知`,
          })
        } else {
          setEmailResult({
            success: true,
            message: '库存检查完成，当前无需要预警的资产',
          })
        }
      }
    } catch (error) {
      setEmailResult({ success: false, message: '触发失败，请重试' })
    } finally {
      setTriggering(false)
    }
  }

  const getTypeIcon = (type: Notification['type']) => {
    switch (type) {
      case 'low_stock':
        return <AlertTriangle className="w-5 h-5 text-red-600" />
      case 'stock_in':
        return <Package className="w-5 h-5 text-green-600" />
      case 'stock_out':
        return <Package className="w-5 h-5 text-blue-600" />
      case 'approval':
        return <ClipboardList className="w-5 h-5 text-orange-600" />
    }
  }

  const getTypeLabel = (type: Notification['type']) => {
    switch (type) {
      case 'low_stock':
        return '库存预警'
      case 'stock_in':
        return '入库通知'
      case 'stock_out':
        return '出库通知'
      case 'approval':
        return '审批通知'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <Bell className="w-6 h-6 text-purple-600" />
                <h1 className="text-xl font-bold text-gray-900">通知中心</h1>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-medium rounded-full">
                    {unreadCount} 未读
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">库存预警管理</h2>

            {emailResult && (
              <div
                className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
                  emailResult.success
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                {emailResult.success ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                )}
                <span
                  className={`text-sm ${
                    emailResult.success ? 'text-green-700' : 'text-red-700'
                  }`}
                >
                  {emailResult.message}
                </span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleTriggerNotify}
                disabled={triggering}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {triggering ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Bell className="w-4 h-4" />
                )}
                触发 /api/notify 检查
              </button>
            </div>

            {lowStockAssets.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">当前低库存资产 ({lowStockAssets.length})</h3>
                <div className="space-y-2">
                  {lowStockAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <div>
                          <p className="text-sm font-medium text-red-900">{asset.name}</p>
                          <p className="text-xs text-red-700">
                            库存: {asset.quantity} / 阈值: {asset.lowStockThreshold}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSendEmail(asset.id, asset.name)}
                        disabled={sendingEmailId === asset.id}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-md text-xs font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {sendingEmailId === asset.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Mail className="w-3 h-3" />
                        )}
                        发送邮件
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">通知列表</h2>

            {notifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">暂无通知</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => !notification.read && handleMarkRead(notification.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      notification.read
                        ? 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        {getTypeIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-500">
                            {getTypeLabel(notification.type)}
                          </span>
                          {notification.emailSent && (
                            <span className="flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                              <Mail className="w-3 h-3" />
                              已发邮件
                            </span>
                          )}
                          {!notification.read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full" />
                          )}
                        </div>
                        <h4
                          className={`font-medium mt-1 ${
                            notification.read ? 'text-gray-600' : 'text-gray-900'
                          }`}
                        >
                          {notification.title}
                        </h4>
                        <p
                          className={`text-sm mt-1 ${
                            notification.read ? 'text-gray-500' : 'text-gray-700'
                          }`}
                        >
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {formatDate(notification.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <h3 className="text-sm font-medium text-blue-800 mb-2">API 接口说明</h3>
          <div className="space-y-2 text-xs text-blue-700">
            <p>
              <code className="bg-blue-100 px-1.5 py-0.5 rounded">/api/notify</code> - 触发库存预警检查，发送邮件通知
            </p>
            <p>
              <code className="bg-blue-100 px-1.5 py-0.5 rounded">console.log('[MOCK EMAIL SENT]')</code> - 邮件 mock 输出
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
