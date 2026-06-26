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
  },
  {
    id: 'ORD20260601002',
    roomNo: '305',
    checkIn: '2026-05-30',
    checkOut: '2026-06-01',
    amount: 860.00,
    guestName: '李女士'
  },
  {
    id: 'ORD20260530001',
    roomNo: '102',
    checkIn: '2026-05-25',
    checkOut: '2026-05-30',
    amount: 2450.00,
    guestName: '王先生'
  }
]

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: InvoiceForm },
      { path: '/result', component: { template: '<div>Result</div>' } },
    ],
  })
}

vi.mock('@/mock/api', () => ({
  fetchOrders: vi.fn(),
  submitInvoice: vi.fn(),
}))

describe('订单可选状态', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('页面加载时调用 fetchOrders 获取订单列表', async () => {
    vi.mocked(mockApi.fetchOrders).mockResolvedValue(mockOrders)

    mount(InvoiceForm, {
      global: {
        plugins: [createTestRouter()],
      },
    })

    await flushPromises()

    expect(mockApi.fetchOrders).toHaveBeenCalledTimes(1)
  })

  it('订单列表加载完成后显示所有订单', async () => {
    vi.mocked(mockApi.fetchOrders).mockResolvedValue(mockOrders)

    const wrapper = mount(InvoiceForm, {
      global: {
        plugins: [createTestRouter()],
      },
    })

    await flushPromises()

    const orderButtons = wrapper.findAll('button[type="button"]').filter(btn =>
      btn.text().includes('房间')
    )

    expect(orderButtons).toHaveLength(3)
    expect(orderButtons[0].text()).toContain('房间 201')
    expect(orderButtons[1].text()).toContain('房间 305')
    expect(orderButtons[2].text()).toContain('房间 102')
  })

  it('每个订单卡片显示正确的信息', async () => {
    vi.mocked(mockApi.fetchOrders).mockResolvedValue(mockOrders)

    const wrapper = mount(InvoiceForm, {
      global: {
        plugins: [createTestRouter()],
      },
    })

    await flushPromises()

    const firstOrder = wrapper.findAll('button[type="button"]').filter(btn =>
      btn.text().includes('房间 201')
    )[0]

    expect(firstOrder.text()).toContain('¥1280.00')
    expect(firstOrder.text()).toContain('2026-05-28 至 2026-06-01')
    expect(firstOrder.text()).toContain('入住人：张先生')
  })

  it('点击订单卡片后选中该订单', async () => {
    vi.mocked(mockApi.fetchOrders).mockResolvedValue(mockOrders)

    const wrapper = mount(InvoiceForm, {
      global: {
        plugins: [createTestRouter()],
      },
    })

    await flushPromises()

    const orderButtons = wrapper.findAll('button[type="button"]').filter(btn =>
      btn.text().includes('房间')
    )

    await orderButtons[1].trigger('click')

    expect(orderButtons[1].classes()).toContain('border-inn-brown')
    expect(orderButtons[1].classes()).toContain('bg-inn-brown/5')
  })

  it('选中订单后显示开票金额', async () => {
    vi.mocked(mockApi.fetchOrders).mockResolvedValue(mockOrders)

    const wrapper = mount(InvoiceForm, {
      global: {
        plugins: [createTestRouter()],
      },
    })

    await flushPromises()

    const orderButtons = wrapper.findAll('button[type="button"]').filter(btn =>
      btn.text().includes('房间')
    )

    expect(wrapper.text()).not.toContain('开票金额')

    await orderButtons[0].trigger('click')

    expect(wrapper.text()).toContain('开票金额')
    expect(wrapper.text()).toContain('¥1280.00')
  })

  it('切换订单时更新选中状态和金额', async () => {
    vi.mocked(mockApi.fetchOrders).mockResolvedValue(mockOrders)

    const wrapper = mount(InvoiceForm, {
      global: {
        plugins: [createTestRouter()],
      },
    })

    await flushPromises()

    const orderButtons = wrapper.findAll('button[type="button"]').filter(btn =>
      btn.text().includes('房间')
    )

    await orderButtons[0].trigger('click')
    expect(wrapper.text()).toContain('¥1280.00')
    expect(orderButtons[0].classes()).toContain('border-inn-brown')

    await orderButtons[2].trigger('click')
    expect(wrapper.text()).toContain('¥2450.00')
    expect(orderButtons[2].classes()).toContain('border-inn-brown')
    expect(orderButtons[0].classes()).not.toContain('border-inn-brown')
  })

  it('加载中显示 loading 指示器', async () => {
    let resolveFetch: (orders: OrderItem[]) => void
    const fetchPromise = new Promise<OrderItem[]>((resolve) => {
      resolveFetch = resolve
    })

    vi.mocked(mockApi.fetchOrders).mockReturnValue(fetchPromise)

    const wrapper = mount(InvoiceForm, {
      global: {
        plugins: [createTestRouter()],
      },
    })

    expect(wrapper.find('.animate-spin').exists()).toBe(true)

    resolveFetch!(mockOrders)
    await flushPromises()

    expect(wrapper.find('.animate-spin').exists()).toBe(false)
  })

  it('未选择订单时提交按钮点击显示校验错误', async () => {
    vi.mocked(mockApi.fetchOrders).mockResolvedValue(mockOrders)

    const wrapper = mount(InvoiceForm, {
      global: {
        plugins: [createTestRouter()],
      },
    })

    await flushPromises()

    const submitButton = wrapper.find('button[type="submit"]')
    await submitButton.trigger('click')

    await flushPromises()

    expect(wrapper.text()).toContain('请选择入住订单')
  })

  it('订单列表为空时不显示订单卡片', async () => {
    vi.mocked(mockApi.fetchOrders).mockResolvedValue([])

    const wrapper = mount(InvoiceForm, {
      global: {
        plugins: [createTestRouter()],
      },
    })

    await flushPromises()

    const orderButtons = wrapper.findAll('button[type="button"]').filter(btn =>
      btn.text().includes('房间')
    )

    expect(orderButtons).toHaveLength(0)
  })
})
