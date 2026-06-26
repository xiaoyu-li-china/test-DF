import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { useUserStore } from '../../store/user'

function createTestRoutes() {
  return [
    { path: '/', name: 'Home', component: { template: '<div>Home</div>' } },
    { path: '/login', name: 'Login', component: { template: '<div>Login</div>' } },
    { path: '/403', name: 'Forbidden', component: { template: '<div>403</div>' } },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: { template: '<div>Dashboard</div>' },
      meta: { requiresAuth: true, roles: ['admin'] }
    },
    {
      path: '/profile',
      name: 'Profile',
      component: { template: '<div>Profile</div>' },
      meta: { requiresAuth: true }
    },
    {
      path: '/settings',
      name: 'Settings',
      component: { template: '<div>Settings</div>' },
      meta: { requiresAuth: true, roles: ['admin', 'manager'] }
    }
  ]
}

function setupTest() {
  const pinia = createPinia()
  setActivePinia(pinia)

  const routes = createTestRoutes()
  const router = createRouter({
    history: createMemoryHistory(),
    routes
  })

  router.beforeEach(async (to, from, next) => {
    const userStore = useUserStore()

    if (to.meta.requiresAuth) {
      if (!userStore.isLoggedIn) {
        next({
          path: '/login',
          query: { redirect: to.fullPath }
        })
        return
      }

      const isValid = await userStore.validateToken()
      if (!isValid) {
        next({
          path: '/login',
          query: { redirect: to.fullPath }
        })
        return
      }

      if (!userStore.hasRole(to.meta.roles)) {
        next({
          path: '/403',
          query: { roles: to.meta.roles?.join(',') || '' }
        })
        return
      }
    }

    next()
  })

  const userStore = useUserStore()
  return { router, userStore, pinia }
}

describe('路由守卫测试', () => {
  let fetchMock

  beforeEach(() => {
    fetchMock = vi.spyOn(global, 'fetch').mockImplementation(async () => ({
      ok: true,
      json: async () => ({ valid: true, user: { username: 'test', roles: ['user'] } })
    }))
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  describe('公开页面', () => {
    it('未登录用户可以访问首页', async () => {
      const { router, userStore } = setupTest()
      userStore.logout()

      await router.push('/')
      await router.isReady()

      expect(router.currentRoute.value.name).toBe('Home')
    })

    it('未登录用户可以访问登录页', async () => {
      const { router, userStore } = setupTest()
      userStore.logout()

      await router.push('/login')
      await router.isReady()

      expect(router.currentRoute.value.name).toBe('Login')
    })
  })

  describe('登录检查', () => {
    it('未登录访问需要认证的页面，跳转至 /login 并保存 redirect', async () => {
      const { router, userStore } = setupTest()
      userStore.logout()

      await router.push('/dashboard')
      await router.isReady()

      expect(router.currentRoute.value.name).toBe('Login')
      expect(router.currentRoute.value.query.redirect).toBe('/dashboard')
    })

    it('未登录访问带 query 的需要认证页面，redirect 保留完整路径', async () => {
      const { router, userStore } = setupTest()
      userStore.logout()

      await router.push('/dashboard?id=123&tab=info')
      await router.isReady()

      expect(router.currentRoute.value.name).toBe('Login')
      expect(router.currentRoute.value.query.redirect).toBe('/dashboard?id=123&tab=info')
    })

    it('已登录用户可以访问需要认证的页面', async () => {
      const { router, userStore } = setupTest()
      userStore.token = 'valid-token'
      userStore.roles = ['admin', 'user']
      userStore.userInfo = { username: 'admin' }

      fetchMock.mockImplementation(async () => ({
        ok: true,
        json: async () => ({ valid: true, user: { username: 'admin', roles: ['admin', 'user'] } })
      }))

      await router.push('/dashboard')
      await router.isReady()

      expect(router.currentRoute.value.name).toBe('Dashboard')
    })
  })

  describe('Token 有效性验证', () => {
    it('token 验证有效时，允许访问受保护页面', async () => {
      const { router, userStore } = setupTest()
      userStore.token = 'valid-token'
      userStore.roles = ['user']
      userStore.userInfo = { username: 'user' }

      fetchMock.mockImplementation(async () => ({
        ok: true,
        json: async () => ({ valid: true, user: { username: 'user', roles: ['user'] } })
      }))

      await router.push('/profile')
      await router.isReady()

      expect(router.currentRoute.value.name).toBe('Profile')
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/auth/verify',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer valid-token'
          })
        })
      )
    })

    it('token 验证返回无效时，清除本地存储并跳转登录', async () => {
      const { router, userStore } = setupTest()
      userStore.token = 'expired-token'
      userStore.roles = ['user']
      userStore.userInfo = { username: 'user' }

      fetchMock.mockImplementation(async () => ({
        ok: true,
        json: async () => ({ valid: false })
      }))

      await router.push('/profile')
      await router.isReady()

      expect(router.currentRoute.value.name).toBe('Login')
      expect(userStore.token).toBe('')
      expect(userStore.isLoggedIn).toBe(false)
      expect(localStorage.getItem('token')).toBeNull()
    })

    it('token 验证返回 401 时，清除本地存储并跳转登录', async () => {
      const { router, userStore } = setupTest()
      userStore.token = 'invalid-token'
      userStore.roles = ['user']
      userStore.userInfo = { username: 'user' }

      fetchMock.mockImplementation(async () => ({
        ok: false,
        status: 401
      }))

      await router.push('/profile')
      await router.isReady()

      expect(router.currentRoute.value.name).toBe('Login')
      expect(userStore.token).toBe('')
    })

    it('token 验证网络异常时，放行继续访问', async () => {
      const { router, userStore } = setupTest()
      userStore.token = 'valid-token'
      userStore.roles = ['admin']
      userStore.userInfo = { username: 'admin' }

      fetchMock.mockImplementation(async () => {
        throw new Error('Network error')
      })

      await router.push('/dashboard')
      await router.isReady()

      expect(router.currentRoute.value.name).toBe('Dashboard')
      expect(userStore.token).toBe('valid-token')
    })

    it('5 分钟内重复访问，跳过 token 验证网络请求', async () => {
      const { router, userStore } = setupTest()
      userStore.token = 'valid-token'
      userStore.roles = ['user']
      userStore.userInfo = { username: 'user' }
      userStore.lastValidatedAt = Date.now()

      await router.push('/profile')
      await router.isReady()

      expect(router.currentRoute.value.name).toBe('Profile')
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe('角色权限校验', () => {
    it('用户有 required 角色时，允许访问', async () => {
      const { router, userStore } = setupTest()
      userStore.token = 'valid-token'
      userStore.roles = ['admin']
      userStore.userInfo = { username: 'admin' }
      userStore.lastValidatedAt = Date.now()

      await router.push('/dashboard')
      await router.isReady()

      expect(router.currentRoute.value.name).toBe('Dashboard')
    })

    it('用户无 required 角色时，跳转至 /403', async () => {
      const { router, userStore } = setupTest()
      userStore.token = 'valid-token'
      userStore.roles = ['user']
      userStore.userInfo = { username: 'user' }
      userStore.lastValidatedAt = Date.now()

      await router.push('/dashboard')
      await router.isReady()

      expect(router.currentRoute.value.name).toBe('Forbidden')
      expect(router.currentRoute.value.query.roles).toBe('admin')
    })

    it('路由未配置 roles 时，所有登录用户均可访问', async () => {
      const { router, userStore } = setupTest()
      userStore.token = 'valid-token'
      userStore.roles = ['user']
      userStore.userInfo = { username: 'user' }
      userStore.lastValidatedAt = Date.now()

      await router.push('/profile')
      await router.isReady()

      expect(router.currentRoute.value.name).toBe('Profile')
    })

    it('多个 required 角色，用户有其中之一即可访问', async () => {
      const { router, userStore } = setupTest()
      userStore.token = 'valid-token'
      userStore.roles = ['manager', 'user']
      userStore.userInfo = { username: 'manager' }
      userStore.lastValidatedAt = Date.now()

      await router.push('/settings')
      await router.isReady()

      expect(router.currentRoute.value.name).toBe('Settings')
    })

    it('多个 required 角色，用户一个都没有时跳转 403', async () => {
      const { router, userStore } = setupTest()
      userStore.token = 'valid-token'
      userStore.roles = ['user']
      userStore.userInfo = { username: 'user' }
      userStore.lastValidatedAt = Date.now()

      await router.push('/settings')
      await router.isReady()

      expect(router.currentRoute.value.name).toBe('Forbidden')
      expect(router.currentRoute.value.query.roles).toBe('admin,manager')
    })
  })

  describe('完整链路', () => {
    it('未登录 -> 访问 dashboard -> 跳转登录 -> 登录后跳转回 dashboard', async () => {
      const { router, userStore } = setupTest()
      userStore.logout()

      await router.push('/dashboard')
      await router.isReady()
      expect(router.currentRoute.value.name).toBe('Login')
      expect(router.currentRoute.value.query.redirect).toBe('/dashboard')

      userStore.token = 'new-token'
      userStore.roles = ['admin']
      userStore.userInfo = { username: 'admin' }
      userStore.lastValidatedAt = Date.now()

      const redirectPath = router.currentRoute.value.query.redirect || '/'
      await router.push(redirectPath)
      await router.isReady()

      expect(router.currentRoute.value.name).toBe('Dashboard')
    })
  })
})
