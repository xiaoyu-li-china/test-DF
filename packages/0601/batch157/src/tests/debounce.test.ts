import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import InvoiceForm from '@/pages/InvoiceForm.vue'
import * as mockApi from '@/mock/api'
import type { OrderItem } from '@/types'

const mockOrders: OrderItem[] = [
  {
    id: 'ORD20260601001',
    roomNo: '201',
    checkIn: '2026-05-28',
    checkOut: '2026-06-01',
    amount: 1280.00,
    guestName: '张先生'
  }
]

const mockResponse = {
  success: true,
  message: '申请已受理',
  estimatedDays: '1-3 个工作日',
  applicationNo: 'INV202606010001ABC',
  pdfUrl: 'https://example.com/invoices/INV202606010001ABC.pdf',
}

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: InvoiceForm, name: 'invoice-form' },
      { path: '/result', component: { template: '<div>Result</div>' }, name: 'invoice-result' },
    ],
  })
}

vi.mock('@/mock/api', () => ({
  fetchOrders: vi.fn(),
  submitInvoice: vi.fn(),
}))

describe('重复申请防抖', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(mockApi.fetchOrders).mockResolvedValue(mockOrders)
  })

  it('快速连续点击提交按钮 - 只调用一次 API', async () => {
    let resolveSubmit: (response: typeof mockResponse) => void
    const submitPromise = new Promise<typeof mockResponse>((resolve) => {
      resolveSubmit = resolve
    })
    vi.mocked(mockApi.submitInvoice).mockReturnValue(submitPromise)

    const router = createTestRouter()
    const wrapper = mount(InvoiceForm, {
      global: {
        plugins: [router],
      },
    })

    await flushPromises()

    const personalBtn = wrapper.findAll('button[type="button"]').find(btn =>
      btn.text().includes('个人')
    )!
    await personalBtn.trigger('click')

    const emailInput = wrapper.find('input[type="email"]')
    await emailInput.setValue('test@example.com')

    const orderBtn = wrapper.findAll('button[type="button"]').find(btn =>
      btn.text().includes('房间 201')
    )!
    await orderBtn.trigger('click')

    const submitBtn = wrapper.find('button[type="submit"]')

    await Promise.all([
      submitBtn.trigger('click'),
      submitBtn.trigger('click'),
      submitBtn.trigger('click'),
      submitBtn.trigger('click'),
      submitBtn.trigger('click'),
    ])

    await flushPromises()

    expect(mockApi.submitInvoice).toHaveBeenCalledTimes(1)

    resolveSubmit!(mockResponse)
    await flushPromises()
  })

  it('提交过程中按钮处于 disabled 状态', async () => {
    let resolveSubmit: (response: typeof mockResponse) => void
    const submitPromise = new Promise<typeof mockResponse>((resolve) => {
      resolveSubmit = resolve
    })
    vi.mocked(mockApi.submitInvoice).mockReturnValue(submitPromise)

    const router = createTestRouter()
    const wrapper = mount(InvoiceForm, {
      global: {
        plugins: [router],
      },
    })

    await flushPromises()

    const personalBtn = wrapper.findAll('button[type="button"]').find(btn =>
      btn.text().includes('个人')
    )!
    await personalBtn.trigger('click')

    const emailInput = wrapper.find('input[type="email"]')
    await emailInput.setValue('test@example.com')

    const orderBtn = wrapper.findAll('button[type="button"]').find(btn =>
      btn.text().includes('房间 201')
    )!
    await orderBtn.trigger('click')

    const submitBtn = wrapper.find('button[type="submit"]')
    expect(submitBtn.attributes('disabled')).toBeUndefined()

    await submitBtn.trigger('click')
    await flushPromises()

    expect(submitBtn.attributes('disabled')).toBeDefined()
    expect(submitBtn.classes()).toContain('disabled:cursor-not-allowed')
    expect(submitBtn.classes()).toContain('disabled:bg-gray-300')

    expect(submitBtn.find('.animate-spin').exists()).toBe(true)
    expect(submitBtn.text()).not.toContain('提交申请')

    resolveSubmit!(mockResponse)
    await flushPromises()
  })

  it('提交完成后按钮恢复可用状态', async () => {
    vi.mocked(mockApi.submitInvoice).mockResolvedValue(mockResponse)

    const router = createTestRouter()
    const wrapper = mount(InvoiceForm, {
      global: {
        plugins: [router],
      },
    })

    await flushPromises()

    const personalBtn = wrapper.findAll('button[type="button"]').find(btn =>
      btn.text().includes('个人')
    )!
    await personalBtn.trigger('click')

    const emailInput = wrapper.find('input[type="email"]')
    await emailInput.setValue('test@example.com')

    const orderBtn = wrapper.findAll('button[type="button"]').find(btn =>
      btn.text().includes('房间 201')
    )!
    await orderBtn.trigger('click')

    const submitBtn = wrapper.find('button[type="submit"]')

    await submitBtn.trigger('click')
    await flushPromises()

    expect(mockApi.submitInvoice).toHaveBeenCalledTimes(1)
  })

  it('submitting ref 为 true 时拦截提交', async () => {
    let submitCallCount = 0
    vi.mocked(mockApi.submitInvoice).mockImplementation(() => {
      submitCallCount++
      return new Promise((resolve) => {
        setTimeout(() => resolve(mockResponse), 100)
      })
    })

    const router = createTestRouter()
    const wrapper = mount(InvoiceForm, {
      global: {
        plugins: [router],
      },
    })

    await flushPromises()

    const personalBtn = wrapper.findAll('button[type="button"]').find(btn =>
      btn.text().includes('个人')
    )!
    await personalBtn.trigger('click')

    const emailInput = wrapper.find('input[type="email"]')
    await emailInput.setValue('test@example.com')

    const orderBtn = wrapper.findAll('button[type="button"]').find(btn =>
      btn.text().includes('房间 201')
    )!
    await orderBtn.trigger('click')

    const submitBtn = wrapper.find('button[type="submit"]')

    for (let i = 0; i < 10; i++) {
      await submitBtn.trigger('click')
    }

    await flushPromises()
    expect(submitCallCount).toBe(1)

    await new Promise(resolve => setTimeout(resolve, 200))
    await flushPromises()
    expect(submitCallCount).toBe(1)
  })

  it('提交失败后按钮恢复可用', async () => {
    const mockError = new Error('网络错误')
    vi.mocked(mockApi.submitInvoice).mockRejectedValue(mockError)

    const router = createTestRouter()
    const wrapper = mount(InvoiceForm, {
      global: {
        plugins: [router],
      },
    })

    await flushPromises()

    const personalBtn = wrapper.findAll('button[type="button"]').find(btn =>
      btn.text().includes('个人')
    )!
    await personalBtn.trigger('click')

    const emailInput = wrapper.find('input[type="email"]')
    await emailInput.setValue('test@example.com')

    const orderBtn = wrapper.findAll('button[type="button"]').find(btn =>
      btn.text().includes('房间 201')
    )!
    await orderBtn.trigger('click')

    const submitBtn = wrapper.find('button[type="submit"]')

    await expect(submitBtn.trigger('click')).rejects.toThrow('网络错误')
    await flushPromises()

    expect(mockApi.submitInvoice).toHaveBeenCalledTimes(1)

    vi.mocked(mockApi.submitInvoice).mockResolvedValue(mockResponse)
    await submitBtn.trigger('click')
    await flushPromises()

    expect(mockApi.submitInvoice).toHaveBeenCalledTimes(2)
  })

  it('表单校验未通过时点击不触发 API 调用', async () => {
    vi.mocked(mockApi.submitInvoice).mockResolvedValue(mockResponse)

    const router = createTestRouter()
    const wrapper = mount(InvoiceForm, {
      global: {
        plugins: [router],
      },
    })

    await flushPromises()

    const submitBtn = wrapper.find('button[type="submit"]')

    await submitBtn.trigger('click')
    await submitBtn.trigger('click')
    await submitBtn.trigger('click')

    await flushPromises()

    expect(mockApi.submitInvoice).not.toHaveBeenCalled()
    expect(submitBtn.attributes('disabled')).toBeUndefined()
  })

  it('submitting 状态通过按钮 disabled 属性生效', async () => {
    let resolveSubmit: (response: typeof mockResponse) => void
    const submitPromise = new Promise<typeof mockResponse>((resolve) => {
      resolveSubmit = resolve
    })
    vi.mocked(mockApi.submitInvoice).mockReturnValue(submitPromise)

    const router = createTestRouter()
    const wrapper = mount(InvoiceForm, {
      global: {
        plugins: [router],
      },
    })

    await flushPromises()

    const personalBtn = wrapper.findAll('button[type="button"]').find(btn =>
      btn.text().includes('个人')
    )!
    await personalBtn.trigger('click')

    const emailInput = wrapper.find('input[type="email"]')
    await emailInput.setValue('test@example.com')

    const orderBtn = wrapper.findAll('button[type="button"]').find(btn =>
      btn.text().includes('房间 201')
    )!
    await orderBtn.trigger('click')

    const submitBtn = wrapper.find('button[type="submit"]')

    expect((submitBtn.element as HTMLButtonElement).disabled).toBe(false)

    const clickPromise = submitBtn.trigger('click')
    await flushPromises()

    expect((submitBtn.element as HTMLButtonElement).disabled).toBe(true)

    resolveSubmit!(mockResponse)
    await clickPromise
    await flushPromises()
  })
})
