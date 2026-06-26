import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { authApi, setTokens, logout as clearAuth, AUTH_REFRESH_EVENT } from '@/api/client'

interface User {
  id: number
  username: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  const redirectToLogin = useCallback(() => {
    setUser(null)
    if (location.pathname !== '/login') {
      navigate('/login', { replace: true })
    }
  }, [navigate, location.pathname])

  const handleRefreshFailed = useCallback(() => {
    setUser(null)
    redirectToLogin()
  }, [redirectToLogin])

  useEffect(() => {
    const handleAuthRefreshFailed = () => {
      handleRefreshFailed()
    }

    window.addEventListener(AUTH_REFRESH_EVENT, handleAuthRefreshFailed)

    return () => {
      window.removeEventListener(AUTH_REFRESH_EVENT, handleAuthRefreshFailed)
    }
  }, [handleRefreshFailed])

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token')
      if (!token) {
        setIsLoading(false)
        return
      }

      try {
        const response = await authApi.getMe()
        setUser(response.data)
      } catch (error) {
        clearAuth()
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (username: string, password: string) => {
    try {
      const response = await authApi.login(username, password)
      const { access_token, refresh_token } = response.data
      setTokens(access_token, refresh_token)

      const meResponse = await authApi.getMe()
      setUser(meResponse.data)

      navigate('/')
    } catch (error) {
      throw error
    }
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch (error) {
    } finally {
      clearAuth()
      setUser(null)
      redirectToLogin()
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
