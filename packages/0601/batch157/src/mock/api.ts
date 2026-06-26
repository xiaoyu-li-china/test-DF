import type { OrderItem, InvoiceRequest, InvoiceResponse } from '@/types'

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
  },
  {
    id: 'ORD20260528003',
    roomNo: '401',
    checkIn: '2026-05-26',
    checkOut: '2026-05-28',
    amount: 680.00,
    guestName: '陈女士'
  }
]

export function fetchOrders(): Promise<OrderItem[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockOrders)
    }, 300)
  })
}

export function submitInvoice(data: InvoiceRequest): Promise<InvoiceResponse> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const applicationNo = `INV${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`
      resolve({
        success: true,
        message: '申请已受理',
        estimatedDays: '1-3 个工作日',
        applicationNo,
        pdfUrl: `https://example.com/invoices/${applicationNo}.pdf`,
      })
    }, 1000)
  })
}

export function resendEmail(email: string, applicationNo: string): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        message: '已重新发送',
      })
    }, 500)
  })
}
