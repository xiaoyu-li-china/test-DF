import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'

const API_BASE_URL = 'http://localhost:8000'

const TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'

export const AUTH_REFRESH_EVENT = 'auth:refresh-failed'

interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

let refreshPromise: Promise<string> | null = null

export const _resetRefreshPromise = () => {
  refreshPromise = null
}

export const _getRefreshPromise = () => {
  return refreshPromise
}

const clearTokens = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

const getAccessToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY)
}

const getRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export const setTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem(TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export const logout = () => {
  clearTokens()
  window.dispatchEvent(new CustomEvent(AUTH_REFRESH_EVENT))
}

export const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = getAccessToken()
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    (error) => {
      return Promise.reject(error)
    }
  )

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean
      }

      if (!originalRequest) {
        return Promise.reject(error)
      }

      const isRefreshEndpoint = originalRequest.url?.includes('/auth/refresh')

      if (error.response?.status === 401 && !originalRequest._retry && !isRefreshEndpoint) {
        originalRequest._retry = true

        if (!refreshPromise) {
          const refreshToken = getRefreshToken()

          if (!refreshToken) {
            clearTokens()
            window.dispatchEvent(new CustomEvent(AUTH_REFRESH_EVENT))
            return Promise.reject(error)
          }

          refreshPromise = (async () => {
            try {
              const response = await axios.post<TokenResponse>(
                `${API_BASE_URL}/auth/refresh`,
                { refresh_token: refreshToken }
              )

              const { access_token, refresh_token } = response.data
              setTokens(access_token, refresh_token)
              return access_token
            } catch (refreshError) {
              clearTokens()
              window.dispatchEvent(new CustomEvent(AUTH_REFRESH_EVENT))
              throw refreshError
            } finally {
              refreshPromise = null
            }
          })()
        }

        return refreshPromise
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`
            }
            return client(originalRequest)
          })
          .catch((err) => {
            return Promise.reject(err)
          })
      }

      if (error.response?.status === 401 && isRefreshEndpoint) {
        clearTokens()
        window.dispatchEvent(new CustomEvent(AUTH_REFRESH_EVENT))
      }

      return Promise.reject(error)
    }
  )

  return client
}

export const apiClient = createApiClient()

export const authApi = {
  login: (username: string, password: string) =>
    apiClient.post<TokenResponse>('/auth/login', { username, password }),

  logout: () => apiClient.post('/auth/logout'),

  getMe: () => apiClient.get('/auth/me'),
}

export const protectedApi = {
  getResources: () => apiClient.get('/api/protected-resources'),

  createResource: (name: string, content: string) =>
    apiClient.post('/api/protected-resources', { name, content }),
}
