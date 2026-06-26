import React, { useState, useEffect } from 'react'
import client from '../services/client'
import api, { isOnline } from '../services/api'
import usePhotoQueue from '../hooks/usePhotoQueue'
import useChecklist from '../hooks/useChecklist'

function ReportSync() {
  const [logs, setLogs] = useState([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [reportCount, setReportCount] = useState(0)
  const { stats, processQueue, clearCompleted } = usePhotoQueue()
  const { items, floorId, getProgress } = useChecklist()

  useEffect(() => {
    setLogs(client.getSyncLog())
  }, [])

  const refreshLogs = () => {
    setLogs(client.getSyncLog())
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const handleSyncReport = async () => {
    if (!isOnline() || isSyncing) return

    setIsSyncing(true)
    
    const reportData = {
      timestamp: Date.now(),
      floorId,
      checklist: items,
      progress: getProgress(),
      photoStats: stats
    }

    try {
      await api.postReport(reportData)
      
      setReportCount(prev => prev + 1)
      
      client.addSyncLog({
        type: 'success',
        message: `巡检报告 (${floorId}) 上报成功`
      })

      processQueue()
    } catch (error) {
      client.addSyncLog({
        type: 'error',
        message: `巡检报告 (${floorId}) 上报失败: ${error.message}`
      })
    }

    setIsSyncing(false)
    refreshLogs()
  }

  const handleManualSync = () => {
    processQueue()
    setTimeout(refreshLogs, 1000)
  }

  const handleClearLogs = () => {
    client.clearSyncLog()
    refreshLogs()
  }

  const handleSyncKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleSyncReport()
    }
  }

  return (
    <div className="report-container">
      <h2 className="page-title">报告上报</h2>

      <div className="sync-stats">
        <div className="stat-card">
          <div className="stat-value">{getProgress()}%</div>
          <div className="stat-label">检查完成度</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{reportCount}</div>
          <div className="stat-label">已上报报告</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.success}</div>
          <div className="stat-label">照片已上传</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.pending + stats.failed}</div>
          <div className="stat-label">待上传照片</div>
        </div>
      </div>

      <button
        className="primary-btn"
        onClick={handleSyncReport}
        onKeyDown={handleSyncKeyDown}
        disabled={!isOnline() || isSyncing}
        tabIndex={0}
      >
        {isSyncing ? '上报中...' : (!isOnline() ? '当前离线' : '提交巡检报告')}
      </button>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          className="primary-btn"
          onClick={handleManualSync}
          style={{ flex: 1, background: '#f7f8fa', color: '#1d2129' }}
          disabled={!isOnline()}
        >
          手动同步照片
        </button>
        <button
          className="primary-btn"
          onClick={clearCompleted}
          style={{ flex: 1, background: '#f7f8fa', color: '#1d2129' }}
        >
          清理已完成
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 500 }}>同步日志</h3>
        <button
          onClick={handleClearLogs}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: '#165DFF', 
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          清空日志
        </button>
      </div>

      <div className="sync-log">
        {logs.length === 0 ? (
          <div style={{ color: '#86909c', textAlign: 'center', padding: '20px' }}>
            暂无同步日志
          </div>
        ) : (
          logs.slice(0, 20).map((log, index) => (
            <div key={index} className="sync-log-line">
              <span className="time">[{formatTime(log.timestamp)}]</span>
              <span className={log.type}>{log.message}</span>
            </div>
          ))
        )}
      </div>

      <div style={{ 
        padding: '16px', 
        backgroundColor: '#e8f3ff', 
        borderRadius: '8px',
        fontSize: '13px',
        color: '#165DFF',
        lineHeight: '1.6'
      }}>
        <strong>使用说明:</strong>
        <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
          <li>断网时照片自动进入队列等待</li>
          <li>网络恢复后照片自动上传</li>
          <li>检查项勾选即时保存到本地</li>
          <li>所有操作支持键盘 Tab 导航</li>
        </ul>
      </div>
    </div>
  )
}

export default ReportSync
