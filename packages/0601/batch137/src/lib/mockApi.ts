import type {
  PianoBrand,
  TimeSlot,
  AppointmentRequest,
  AppointmentResponse,
  AppointmentDetail,
  RescheduleRequest,
  RescheduleResponse,
  SmsCodeRequest,
  SmsCodeResponse,
  VerifyCodeRequest,
  VerifyCodeResponse,
  PhotoUploadResponse,
} from '@/lib/types'

const PIANO_BRANDS: PianoBrand[] = [
  { id: 'yamaha', name: '雅马哈 (Yamaha)', origin: '日本' },
  { id: 'kawai', name: '卡瓦依 (Kawai)', origin: '日本' },
  { id: 'steinway', name: '施坦威 (Steinway)', origin: '德国' },
  { id: 'pearlriver', name: '珠江 (Pearl River)', origin: '中国' },
  { id: 'xinghai', name: '星海 (Xinghai)', origin: '中国' },
  { id: 'hailun', name: '海伦 (Hailun)', origin: '中国' },
  { id: 'bosendorfer', name: '贝森朵夫 (Bösendorfer)', origin: '奥地利' },
  { id: 'fazioli', name: '法奇奥里 (Fazioli)', origin: '意大利' },
  { id: 'knsburg', name: '英昌 (Young Chang)', origin: '韩国' },
  { id: 'samick', name: '三益 (Samick)', origin: '韩国' },
]

const SLOT_TEMPLATES: Omit<TimeSlot, 'available'>[] = [
  { id: 'morning', label: '上午', startTime: '09:00', endTime: '12:00' },
  { id: 'afternoon', label: '下午', startTime: '13:00', endTime: '17:00' },
  { id: 'evening', label: '傍晚', startTime: '18:00', endTime: '20:00' },
]

const bookedSlots: Record<string, string[]> = {}
const smsCodes: Record<string, { code: string; expires: number; purpose: string }> = {}

function getBookedSlotsForDate(dateStr: string): string[] {
  if (!bookedSlots[dateStr]) {
    const seed = dateStr.split('-').reduce((a, b) => a + parseInt(b), 0)
    const count = seed % 4
    const slots = [...SLOT_TEMPLATES]
    const booked: string[] = []
    for (let i = 0; i < count; i++) {
      booked.push(slots[i].id)
    }
    bookedSlots[dateStr] = booked
  }
  return bookedSlots[dateStr]
}

export function getPianoBrands(): PianoBrand[] {
  return PIANO_BRANDS
}

export function getAvailableSlots(date: string): TimeSlot[] {
  const booked = getBookedSlotsForDate(date)
  return SLOT_TEMPLATES.map((slot) => ({
    ...slot,
    available: !booked.includes(slot.id),
  }))
}

export function submitAppointment(request: AppointmentRequest): AppointmentResponse {
  const id = 'TN' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase()

  const existing = bookedSlots[request.date] || []
  bookedSlots[request.date] = [...existing, request.slotId]

  const detail: AppointmentDetail = {
    appointmentId: id,
    date: request.date,
    slotLabel: SLOT_TEMPLATES.find((s) => s.id === request.slotId)?.label || '',
    city: request.city,
    district: request.district,
    address: request.address,
    pianoBrand: request.customBrand || request.pianoBrand,
    name: request.name,
    phone: request.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
    photoUrls: request.photoUrls,
    priceEstimate: request.priceEstimate,
  }

  localStorage.setItem(`appointment_${id}`, JSON.stringify(detail))

  return {
    success: true,
    appointmentId: id,
    message: '预约提交成功',
  }
}

export function getAppointmentDetail(id: string): AppointmentDetail | null {
  const stored = localStorage.getItem(`appointment_${id}`)
  if (!stored) return null
  return JSON.parse(stored) as AppointmentDetail
}

export function sendSmsCode(request: SmsCodeRequest): SmsCodeResponse {
  if (!/^1[3-9]\d{9}$/.test(request.phone)) {
    return { success: false, message: '手机号格式不正确' }
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString()
  smsCodes[request.phone] = {
    code,
    expires: Date.now() + 5 * 60 * 1000,
    purpose: request.purpose,
  }

  console.log(`[SMS Mock] 发送验证码到 ${request.phone}: ${code}`)

  return {
    success: true,
    message: `验证码已发送（测试用码：${code}）`,
  }
}

export function verifySmsCode(request: VerifyCodeRequest): VerifyCodeResponse {
  const stored = smsCodes[request.phone]
  if (!stored) {
    return { success: false, message: '验证码不存在或已过期' }
  }

  if (stored.purpose !== request.purpose) {
    return { success: false, message: '验证码用途不匹配' }
  }

  if (Date.now() > stored.expires) {
    delete smsCodes[request.phone]
    return { success: false, message: '验证码已过期' }
  }

  if (stored.code !== request.code) {
    return { success: false, message: '验证码错误' }
  }

  delete smsCodes[request.phone]

  return {
    success: true,
    message: '验证成功',
  }
}

export function uploadPianoPhoto(file: File): Promise<PhotoUploadResponse> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const priceEstimates = ['￥200 - ￥300', '￥300 - ￥500', '￥500 - ￥800', '￥800 - ￥1200']
      const randomEstimate = priceEstimates[Math.floor(Math.random() * priceEstimates.length)]
      const mockUrl = `https://mock.piano-photo.example.com/${Date.now()}-${file.name}`

      resolve({
        success: true,
        url: mockUrl,
        priceEstimate: randomEstimate,
        message: '照片上传成功，已根据照片给出参考估价',
      })
    }, 800)
  })
}

export function rescheduleAppointment(request: RescheduleRequest): RescheduleResponse {
  const appointment = getAppointmentDetail(request.appointmentId)
  if (!appointment) {
    return { success: false, message: '预约不存在' }
  }

  const newSlots = getAvailableSlots(request.newDate)
  const targetSlot = newSlots.find((s) => s.id === request.newSlotId)
  if (!targetSlot || !targetSlot.available) {
    return { success: false, message: '所选时段已被预约，请选择其他时段' }
  }

  const previousDate = appointment.date
  const previousSlot = appointment.slotLabel

  const previousDateBooked = bookedSlots[previousDate] || []
  const previousSlotId = SLOT_TEMPLATES.find((s) => s.label === previousSlot)?.id
  if (previousSlotId) {
    bookedSlots[previousDate] = previousDateBooked.filter((id) => id !== previousSlotId)
  }

  const existing = bookedSlots[request.newDate] || []
  bookedSlots[request.newDate] = [...existing, request.newSlotId]

  appointment.date = request.newDate
  appointment.slotLabel = targetSlot.label

  localStorage.setItem(`appointment_${request.appointmentId}`, JSON.stringify(appointment))

  return {
    success: true,
    message: '改期成功',
    previousDate,
    previousSlot,
    newDate: request.newDate,
    newSlot: targetSlot.label,
  }
}

export function getSmsCodeForTesting(phone: string): string | null {
  return smsCodes[phone]?.code || null
}
