import { useState, useEffect } from 'react'

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      updateNetworkUI(true)
    }
    
    const handleOffline = () => {
      setIsOnline(false)
      updateNetworkUI(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const updateNetworkUI = (online) => {
    const statusEl = document.getElementById('network-status')
    if (statusEl) {
      const dot = statusEl.querySelector('.status-dot')
      const text = statusEl.querySelector('span:last-child')
      if (dot) {
        dot.className = `status-dot ${online ? 'online' : 'offline'}`
      }
      if (text) {
        text.textContent = online ? '在线' : '离线'
      }
    }
  }

  return isOnline
}

export default useNetworkStatus
