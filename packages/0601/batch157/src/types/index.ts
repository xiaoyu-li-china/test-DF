export interface OrderItem {
  id: string
  roomNo: string
  checkIn: string
  checkOut: string
  amount: number
  guestName: string
}

export type TitleType = 'personal' | 'enterprise'
export type InvoiceType = 'normal' | 'special'

export interface InvoiceFormValues {
  titleType: TitleType
  invoiceType: InvoiceType
  taxId: string
  bankName: string
  bankAccount: string
  email: string
  orderId: string
  amount: number
}

export interface InvoiceRequest {
  titleType: TitleType
  invoiceType: InvoiceType
  taxId?: string
  bankName?: string
  bankAccount?: string
  email: string
  orderId: string
  amount: number
}

export interface InvoiceResponse {
  success: boolean
  message: string
  estimatedDays: string
  applicationNo: string
  pdfUrl: string
}
