import storage from './storage'

export const isOnline = () => {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

const MOCK_DELAY = 500
const MOCK_SUCCESS_RATE = 0.7

const mockFetch = async (url, options) => {
  await new Promise(resolve => setTimeout(resolve, MOCK_DELAY))

  if (Math.random() > MOCK_SUCCESS_RATE) {
    return {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({ success: false, error: '服务器暂时不可用' })
    }
  }

  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({ 
      success: true, 
      message: '操作成功',
      timestamp: Date.now()
    })
  }
}

class ApiService {
  constructor() {
    this.baseUrl = '/api'
    this.useMock = true
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    }

    try {
      const response = this.useMock 
        ? await mockFetch(url, config)
        : await fetch(url, config)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }
      return await response.json()
    } catch (error) {
      throw error
    }
  }

  async postReport(reportData) {
    return this.request('/report', {
      method: 'POST',
      body: JSON.stringify(reportData)
    })
  }

  async uploadPhoto(photoData) {
    return this.request('/photo', {
      method: 'POST',
      body: JSON.stringify({
        id: photoData.id,
        timestamp: photoData.timestamp,
        checklistItemId: photoData.checklistItemId,
        dataSize: photoData.dataUrl.length
      })
    })
  }
}

export const api = new ApiService()
export default api
