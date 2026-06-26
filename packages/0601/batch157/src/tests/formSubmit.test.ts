import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import InvoiceForm from '@/pages/InvoiceForm.vue'
import * as mockApi from '@/mock/api'
import type { OrderItem, InvoiceRequest } from '@/types'

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

describe('表单提交 - Mock Fetch API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(mockApi.fetchOrders).mockResolvedValue(mockOrders)
    vi.mocked(mockApi.submitInvoice).mockResolvedValue(mockResponse)
  })

  it('个人普票 - 完整填写表单后提交调用 API', async () => {
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
    expect(mockApi.submitInvoice).toHaveBeenCalledWith<[InvoiceRequest]>({
      titleType: 'personal',
      invoiceType: 'normal',
      email: 'test@example.com',
      orderId: 'ORD20260601001',
      amount: 1280,
    })
  })

  it('企业普票 - 包含税号的表单提交', async () => {
    const router = createTestRouter()
    const wrapper = mount(InvoiceForm, {
      global: {
        plugins: [router],
      },
    })

    await flushPromises()

    const enterpriseBtn = wrapper.findAll('button[type="button"]').find(btn =>
      btn.text().includes('企业')
    )!
    await enterpriseBtn.trigger('click')

    const normalBtn = wrapper.findAll('button[type="button"]').find(btn =>
      btn.text().includes('普票')
    )!
    await normalBtn.trigger('click')

    const taxIdInput = wrapper.find('input[inputmode="text"]')
    await taxIdInput.setValue('91110105MA001ABC12')

    const emailInput = wrapper.find('input[type="email"]')
    await emailInput.setValue('company@example.com')

    const orderBtn = wrapper.findAll('button[type="button"]').find(btn =>
      btn.text().includes('房间 201')
    )!
    await orderBtn.trigger('click')

    const submitBtn = wrapper.find('button[type="submit"]')
    await submitBtn.trigger('click')

    await flushPromises()

    expect(mockApi.submitInvoice).toHaveBeenCalledWith<[InvoiceRequest]>({
      titleType: 'enterprise',
      invoiceType: 'normal',
      taxId: '91110105MA001ABC12',
      email: 'company@example.com',
      orderId: 'ORD20260601001',
      amount: 1280,
    })
  })

  it('企业专票 - 包含税号和银行信息的表单提交', async () => {
    const router = createTestRouter()
    const wrapper = mount(InvoiceForm, {
      global: {
        plugins: [router],
      },
    })

    await flushPromises()

    const enterpriseBtn = wrapper.findAll('button[type="button"]').find(btn =>
      btn.text().includes('企业')
    )!
    await enterpriseBtn.trigger('click')

    const specialBtn = wrapper.findAll('button[type="button"]').find(btn =>
      btn.text().includes('专票')
    )!
    await specialBtn.trigger('click')

    const inputs = wrapper.findAll('input')
    const taxIdInput = inputs[0]
    const bankNameInput = inputs[1]
    const bankAccountInput = inputs[2]
    const emailInput = wrapper.find('input[type="email"]')

    await taxIdInput.setValue('91110105MA001ABC12')
    await bankNameInput.setValue('中国工商银行北京分行')
    await bankAccountInput.setValue('6222021234567890123')
    await emailInput.setValue('finance@company.com')

    const orderBtn = wrapper.findAll('button[type="button"]').find(btn =>
      btn.text().includes('房间 201')
    )!
    await orderBtn.trigger('click')

    const submitBtn = wrapper.find('button[type="submit"]')
    await submitBtn.trigger('click')

    await flushPromises()

    expect(mockApi.submitInvoice).toHaveBeenCalledWith<[InvoiceRequest]>({
      titleType: 'enterprise',
      invoiceType: 'special',
      taxId: '91110105MA001ABC12',
      bankName: '中国工商银行北京分行',
      bankAccount: '6222021234567890123',
      email: 'finance@company.com',
      orderId: 'ORD20260601001',
      amount: 1280,
    })
  })

  it('提交成功后跳转到结果页', async () => {
    const router = createTestRouter()
    const pushSpy = vi.spyOn(router, 'push')

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
    await router.isReady()

    expect(pushSpy).toHaveBeenCalledWith({
      path: '/result',
      query: {
        message: '申请已受理',
        estimatedDays: '1-3 个工作日',
        applicationNo: 'INV202606010001ABC',
        pdfUrl: 'https://example.com/invoices/INV202606010001ABC.pdf',
        email: 'test@example.com',
      },
    })
  })

  it('提交中显示 loading 状态，按钮禁用', async () => {
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
    expect(submitBtn.text()).toContain('提交申请')
    expect(submitBtn.attributes('disabled')).toBeUndefined()

    await submitBtn.trigger('click')
    await flushPromises()

    expect(submitBtn.find('.animate-spin').exists()).toBe(true)
    expect(submitBtn.attributes('disabled')).toBeDefined()

    resolveSubmit!(mockResponse)
    await flushPromises()
  })

  it('表单校验失败时不调用 API', async () => {
    const router = createTestRouter()
    const wrapper = mount(InvoiceForm, {
      global: {
        plugins: [router],
      },
    })

    await flushPromises()

    const submitBtn = wrapper.find('button[type="submit"]')
    await submitBtn.trigger('click')

    await flushPromises()

    expect(mockApi.submitInvoice).not.toHaveBeenCalled()
  })

  it('使用 fetch 方式模拟 API 调用', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })
    globalThis.fetch = mockFetch

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
})
