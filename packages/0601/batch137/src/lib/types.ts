export interface TimeSlot {
  id: string
  label: string
  startTime: string
  endTime: string
  available: boolean
}

export interface AvailableSlotsResponse {
  date: string
  slots: TimeSlot[]
}

export interface AppointmentRequest {
  date: string
  slotId: string
  address: string
  city: string
  district: string
  pianoBrand: string
  customBrand?: string
  name: string
  phone: string
  photoUrls?: string[]
  priceEstimate?: string
}

export interface AppointmentResponse {
  success: boolean
  appointmentId: string
  message: string
}

export interface PianoBrand {
  id: string
  name: string
  origin: string
}

export interface AppointmentDetail {
  appointmentId: string
  date: string
  slotLabel: string
  city: string
  district: string
  address: string
  pianoBrand: string
  name: string
  phone: string
  photoUrls?: string[]
  priceEstimate?: string
  verificationCode?: string
}

export interface RescheduleRequest {
  appointmentId: string
  newDate: string
  newSlotId: string
  verificationCode: string
}

export interface RescheduleResponse {
  success: boolean
  message: string
  previousDate?: string
  previousSlot?: string
  newDate?: string
  newSlot?: string
}

export interface SmsCodeRequest {
  phone: string
  purpose: 'appointment' | 'reschedule'
}

export interface SmsCodeResponse {
  success: boolean
  message: string
}

export interface VerifyCodeRequest {
  phone: string
  code: string
  purpose: 'appointment' | 'reschedule'
}

export interface VerifyCodeResponse {
  success: boolean
  message: string
}

export interface PhotoUploadResponse {
  success: boolean
  url: string
  priceEstimate: string
  message: string
}

