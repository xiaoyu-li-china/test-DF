import type { AppointmentRequest, AppointmentResponse } from '@/lib/types'
import { submitAppointment as mockSubmit } from '@/lib/mockApi'

export async function sendSmsCode(phone: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch('/api/send-sms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  })
  return response.json()
}

export async function verifySmsCode(phone: string, code: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch('/api/verify-sms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code }),
  })
  return response.json()
}

export async function submitAppointmentApi(request: AppointmentRequest): Promise<AppointmentResponse> {
  const response = await fetch('/api/appointment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  return response.json()
}

export function submitAppointmentFallback(request: AppointmentRequest): AppointmentResponse {
  return mockSubmit(request)
}
