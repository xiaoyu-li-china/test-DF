import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { useOfflineQueue } from '../hooks/useOfflineQueue'

const statusConfig = {
  queued: { label: '排队中', className: 'status-queued' },
  pending: { label: '同步中', className: 'status-pending' },
  synced: { label: '已同步', className: 'status-synced' },
  failed: { label: '失败', className: 'status-failed' }
}

export function ScanPage() {
  const { scanList, isOnline, pendingCount, addRecord, triggerSync, clearAll } = useOfflineQueue()
  const [barcode, setBarcode] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!barcode.trim()) return

    await addRecord(barcode.trim(), quantity)
    setBarcode('')
    setQuantity(1)
    inputRef.current?.focus()
    setActiveIndex(-1)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && scanList.length > 0) {
      e.preventDefault()
      setActiveIndex((prev) => (prev < scanList.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp' && scanList.length > 0) {
      e.preventDefault()
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : scanList.length - 1))
    } else if (e.key === 'Enter' && !e.shiftKey && activeIndex < 0) {
      handleSubmit(e as unknown as React.FormEvent)
    } else if (e.key === 'Escape') {
      setActiveIndex(-1)
      inputRef.current?.focus()
    } else if (e.ctrlKey && e.key === 's') {
      e.preventDefault()
      triggerSync()
    } else if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault()
      inputRef.current?.focus()
    }
  }

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeElement = listRef.current.querySelector(
        `[data-index="${activeIndex}"]`
      ) as HTMLElement
      activeElement?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const syncedCount = scanList.filter((r) => r.status === 'synced').length
  const queuedCount = scanList.filter((r) => r.status === 'queued').length
  const failedCount = scanList.filter((r) => r.status === 'failed').length

  return (
    <div className="scan-page">
      <header className="app-header">
        <h1>仓库盘点</h1>
        <div className="network-status">
          <span className={`status-dot ${isOnline ? 'online' : 'offline'}`}></span>
          <span>{isOnline ? '在线' : '离线'}</span>
          {pendingCount > 0 && (
            <span className="pending-badge">待同步: {pendingCount}</span>
          )}
        </div>
      </header>

      <form onSubmit={handleSubmit} className="scan-form">
        <div className="input-group">
          <label htmlFor="barcode">条码</label>
          <input
            ref={inputRef}
            id="barcode"
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="扫描或输入条码..."
            autoFocus
            autoComplete="off"
          />
        </div>
        <div className="input-group quantity-group">
          <label htmlFor="quantity">数量</label>
          <input
            id="quantity"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            onKeyDown={handleKeyDown}
          />
        </div>
        <button type="submit" className="btn-primary" disabled={!barcode.trim()}>
          添加 (Enter)
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={triggerSync}
          disabled={pendingCount === 0 || !isOnline}
        >
          手动同步 (Ctrl+S)
        </button>
      </form>

      <div className="stats-bar">
        <span>总计: {scanList.length}</span>
        <span className="stat-synced">已同步: {syncedCount}</span>
        <span className="stat-queued">排队中: {queuedCount}</span>
        <span className="stat-pending">待同步: {pendingCount}</span>
        <span className="stat-failed">失败: {failedCount}</span>
        {scanList.length > 0 && (
          <button type="button" className="btn-danger" onClick={clearAll}>
            清空
          </button>
        )}
      </div>

      <div className="scan-list-container" ref={listRef}>
        {scanList.length === 0 ? (
          <div className="empty-state">
            <p>暂无扫描记录</p>
            <p className="hint">在上方输入框扫描条码开始盘点</p>
          </div>
        ) : (
          <div className="scan-list">
            {scanList.map((record, index) => (
              <div
                key={record.id}
                data-index={index}
                className={`scan-item ${activeIndex === index ? 'active' : ''} ${record.status === 'failed' ? 'scan-item-failed' : ''}`}
                tabIndex={0}
              >
                <div className="scan-item-main">
                  <span className="barcode">{record.barcode}</span>
                  <span className="quantity">x{record.quantity}</span>
                </div>
                <div className="scan-item-meta">
                  <span className="time">{formatTime(record.timestamp)}</span>
                  <span className={`status ${statusConfig[record.status].className}`}>
                    {statusConfig[record.status].label}
                  </span>
                </div>
                {record.status === 'failed' && record.error && (
                  <div className="scan-item-error">{record.error}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="app-footer">
        <div className="keyboard-hints">
          <span><kbd>↓</kbd><kbd>↑</kbd> 浏览列表</span>
          <span><kbd>Enter</kbd> 添加</span>
          <span><kbd>Ctrl</kbd>+<kbd>S</kbd> 同步</span>
          <span><kbd>Esc</kbd> 取消选中</span>
        </div>
      </footer>
    </div>
  )
}
