import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const TOKEN_VALID_DURATION = 5 * 60 * 1000

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref(null)
  const roles = ref([])
  const lastValidatedAt = ref(0)

  const isLoggedIn = computed(() => !!token.value)

  function hasRole(requiredRoles) {
    if (!requiredRoles || !Array.isArray(requiredRoles) || requiredRoles.length === 0) {
      return true
    }
    return requiredRoles.some(role => roles.value.includes(role))
  }

  async function validateToken() {
    if (!token.value) {
      return false
    }

    const now = Date.now()
    if (now - lastValidatedAt.value < TOKEN_VALID_DURATION) {
      return true
    }

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token.value}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.valid) {
          lastValidatedAt.value = Date.now()
          if (data.user) {
            userInfo.value = data.user
            if (data.user.roles) {
              roles.value = data.user.roles
            }
          }
          return true
        }
      }

      logout()
      return false
    } catch (error) {
      console.error('Token validation failed:', error)
      return true
    }
  }

  function login(credentials) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockToken = 'mock-token-' + Date.now()
        const userRoles = credentials.username === 'admin' ? ['admin', 'user'] : ['user']
        token.value = mockToken
        userInfo.value = { username: credentials.username }
        roles.value = userRoles
        localStorage.setItem('token', mockToken)
        lastValidatedAt.value = Date.now()
        resolve({ success: true })
      }, 500)
    })
  }

  function logout() {
    token.value = ''
    userInfo.value = null
    roles.value = []
    lastValidatedAt.value = 0
    localStorage.removeItem('token')
  }

  return {
    token,
    userInfo,
    roles,
    lastValidatedAt,
    isLoggedIn,
    login,
    logout,
    validateToken,
    hasRole
  }
})
