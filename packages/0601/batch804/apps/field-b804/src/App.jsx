import React, { useState } from 'react'
import ChecklistPage from './pages/ChecklistPage'
import PhotoCapture from './pages/PhotoCapture'
import ReportSync from './pages/ReportSync'
import useNetworkStatus from './hooks/useNetworkStatus'

function App() {
  useNetworkStatus()
  const [activeTab, setActiveTab] = useState('checklist')

  const tabs = [
    { id: 'checklist', label: '检查项' },
    { id: 'photo', label: '拍照' },
    { id: 'report', label: '上报' }
  ]

  const handleKeyDown = (e, tabId) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setActiveTab(tabId)
    }
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>现场巡检系统</h1>
        <div className="network-status" id="network-status">
          <span className="status-dot online"></span>
          <span>在线</span>
        </div>
      </header>

      <nav className="tab-nav" role="tablist">
        {tabs.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            tabIndex={0}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="app-main">
        {activeTab === 'checklist' && <ChecklistPage />}
        {activeTab === 'photo' && <PhotoCapture />}
        {activeTab === 'report' && <ReportSync />}
      </main>
    </div>
  )
}

export default App
