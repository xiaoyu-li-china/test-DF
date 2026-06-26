import React, { useState, useEffect, useCallback } from 'react'
import type { QueuedRequest } from '../api/offlineQueue'
import {
  subscribe,
  dequeueRequest,
  clearQueue,
  flushQueue,
  isNetworkOnline,
} from '../api/offlineQueue'

type FilterType = 'all' | 'pending' | 'retrying' | 'failed'

interface OfflineQueueModalProps {
  isOpen: boolean
  onClose: () => void
}

const OfflineQueueModal: React.FC<OfflineQueueModalProps> = ({ isOpen, onClose }) => {
  const [queue, setQueue] = useState<QueuedRequest[]>([])
  const [filter, setFilter] = useState<FilterType>('all')
  const [online, setOnline] = useState(isNetworkOnline())

  useEffect(() => {
    if (!isOpen) return

    const unsub = subscribe((q) => setQueue(q))
    const handleOnlineChange = () => setOnline(isNetworkOnline())

    window.addEventListener('online', handleOnlineChange)
    window.addEventListener('offline', handleOnlineChange)

    return () => {
      unsub()
      window.removeEventListener('online', handleOnlineChange)
      window.removeEventListener('offline', handleOnlineChange)
    }
  }, [isOpen])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  const filteredQueue = queue.filter((item) => {
    if (filter === 'all') return true
    return item.status === filter
  })

  const getStatusLabel = (status: QueuedRequest['status']) => {
    switch (status) {
      case 'pending':
        return '待发送'
      case 'retrying':
        return '重试中'
      case 'failed':
        return '失败'
      default:
        return status
    }
  }

  const getStatusColor = (status: QueuedRequest['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'retrying':
        return 'bg-blue-100 text-blue-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />

      <div
        className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-xl font-bold">离线队列管理</h2>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  online ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className="text-sm text-gray-600">
                {online ? '网络已连接' : '网络已断开'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex gap-2">
            {(['all', 'pending', 'retrying', 'failed'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  filter === f
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f === 'all'
                  ? `全部 (${queue.length})`
                  : `${getStatusLabel(f)} (${
                      queue.filter((i) => i.status === f).length
                    })`}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => flushQueue()}
              disabled={!online || queue.length === 0}
              className="px-3 py-1 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              立即同步
            </button>
            <button
              onClick={() => clearQueue()}
              disabled={queue.length === 0}
              className="px-3 py-1 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              清空队列
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {filteredQueue.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {filter === 'all' ? '队列为空' : '没有符合条件的记录'}
            </div>
          ) : (
            <ul className="space-y-3">
              {filteredQueue.map((item) => (
                <li
                  key={item.id}
                  className="p-3 border rounded-lg flex items-start justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 text-xs rounded ${getStatusColor(
                          item.status
                        )}`}
                      >
                        {getStatusLabel(item.status)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                      {item.retries > 0 && (
                        <span className="text-xs text-gray-500">
                          重试 {item.retries} 次
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-medium truncate">{item.url}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      <code className="bg-gray-100 px-1 rounded">
                        {JSON.stringify(item.data).slice(0, 100)}
                        {JSON.stringify(item.data).length > 100 ? '...' : ''}
                      </code>
                    </div>
                    {item.error && (
                      <div className="text-xs text-red-600 mt-1">{item.error}</div>
                    )}
                  </div>
                  <button
                    onClick={() => dequeueRequest(item.id)}
                    className="text-gray-400 hover:text-red-500 text-sm"
                  >
                    删除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-4 border-t text-xs text-gray-500 text-center">
          按 ESC 或点击遮罩关闭
        </div>
      </div>
    </div>
  )
}

export default OfflineQueueModal
