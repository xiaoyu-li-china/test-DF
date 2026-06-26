export function validatePhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone)
}

export function validateName(name: string): boolean {
  return name.trim().length >= 2 && name.trim().length <= 20
}

export function validateAddress(address: string): boolean {
  return address.trim().length >= 5
}

export function validateCity(city: string): boolean {
  return city.trim().length >= 2
}

export function validateDistrict(district: string): boolean {
  return district.trim().length >= 2
}

export function validatePianoBrand(brand: string, customBrand?: string): boolean {
  if (brand === 'custom') {
    return customBrand !== undefined && customBrand.trim().length >= 2
  }
  return brand.trim().length > 0
}

export function validateVerificationCode(code: string): boolean {
  return /^\d{6}$/.test(code)
}

export function validateAppointmentForm(data: {
  date: string | null
  slotId: string | null
  city: string
  district: string
  address: string
  pianoBrand: string
  customBrand?: string
  name: string
  phone: string
  verificationCode: string
}): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}

  if (!data.date) errors.date = '请选择预约日期'
  if (!data.slotId) errors.slotId = '请选择预约时段'
  if (!validateCity(data.city)) errors.city = '请输入有效城市'
  if (!validateDistrict(data.district)) errors.district = '请输入有效区域'
  if (!validateAddress(data.address)) errors.address = '请输入详细地址'
  if (!validatePianoBrand(data.pianoBrand, data.customBrand)) errors.pianoBrand = '请选择或输入钢琴品牌'
  if (!validateName(data.name)) errors.name = '请输入2-20字的姓名'
  if (!validatePhone(data.phone)) errors.phone = '请输入11位有效手机号码'
  if (!validateVerificationCode(data.verificationCode)) errors.verificationCode = '请输入6位数字验证码'

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}
