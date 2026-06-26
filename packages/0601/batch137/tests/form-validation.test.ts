import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  validatePhone,
  validateName,
  validateAddress,
  validateCity,
  validateDistrict,
  validatePianoBrand,
  validateVerificationCode,
  validateAppointmentForm,
} from '@/lib/validation'
import { sendSmsCode, verifySmsCode, submitAppointmentApi } from '@/lib/api'

describe('表单校验规则', () => {
  describe('手机号校验', () => {
    it('合法手机号：13800138000 通过', () => {
      expect(validatePhone('13800138000')).toBe(true)
    })

    it('合法手机号：19912345678 通过', () => {
      expect(validatePhone('19912345678')).toBe(true)
    })

    it('非法手机号：10位数字 不通过', () => {
      expect(validatePhone('1380013800')).toBe(false)
    })

    it('非法手机号：12位数字 不通过', () => {
      expect(validatePhone('138001380000')).toBe(false)
    })

    it('非法手机号：以2开头 不通过', () => {
      expect(validatePhone('23800138000')).toBe(false)
    })

    it('非法手机号：包含字母 不通过', () => {
      expect(validatePhone('138a0138000')).toBe(false)
    })

    it('非法手机号：空字符串 不通过', () => {
      expect(validatePhone('')).toBe(false)
    })

    it('非法手机号：11位但第2位为0 不通过', () => {
      expect(validatePhone('10800138000')).toBe(false)
    })

    it('非法手机号：11位但第2位为1 不通过', () => {
      expect(validatePhone('11800138000')).toBe(false)
    })

    it('非法手机号：11位但第2位为2 不通过', () => {
      expect(validatePhone('12800138000')).toBe(false)
    })
  })

  describe('姓名校验', () => {
    it('合法姓名：张三 通过', () => {
      expect(validateName('张三')).toBe(true)
    })

    it('合法姓名：欧阳震华 通过', () => {
      expect(validateName('欧阳震华')).toBe(true)
    })

    it('非法姓名：1个字 不通过', () => {
      expect(validateName('张')).toBe(false)
    })

    it('非法姓名：超过20字 不通过', () => {
      expect(validateName('这是一个非常长的名字，超过了二十个字的限制')).toBe(false)
    })

    it('非法姓名：前后空格自动trim 仍然通过', () => {
      expect(validateName('  张三  ')).toBe(true)
    })

    it('非法姓名：全空格 不通过', () => {
      expect(validateName('   ')).toBe(false)
    })
  })

  describe('地址校验', () => {
    it('合法地址：朝阳区建国路88号 通过', () => {
      expect(validateAddress('朝阳区建国路88号')).toBe(true)
    })

    it('非法地址：不足5字 不通过', () => {
      expect(validateAddress('长安街')).toBe(false)
    })

    it('非法地址：空 不通过', () => {
      expect(validateAddress('')).toBe(false)
    })
  })

  describe('城市区域校验', () => {
    it('合法城市：北京 通过', () => {
      expect(validateCity('北京')).toBe(true)
    })

    it('非法城市：1字 不通过', () => {
      expect(validateCity('京')).toBe(false)
    })

    it('合法区域：朝阳区 通过', () => {
      expect(validateDistrict('朝阳区')).toBe(true)
    })

    it('非法区域：1字 不通过', () => {
      expect(validateDistrict('朝')).toBe(false)
    })
  })

  describe('钢琴品牌校验', () => {
    it('选择了预设品牌 通过', () => {
      expect(validatePianoBrand('雅马哈')).toBe(true)
    })

    it('选择了自定义并输入了品牌名 通过', () => {
      expect(validatePianoBrand('custom', '克莱门蒂')).toBe(true)
    })

    it('选择了自定义但未输入品牌名 不通过', () => {
      expect(validatePianoBrand('custom', '')).toBe(false)
    })

    it('选择了自定义但品牌名只有1字 不通过', () => {
      expect(validatePianoBrand('custom', 'A')).toBe(false)
    })

    it('未选择品牌 不通过', () => {
      expect(validatePianoBrand('')).toBe(false)
    })
  })

  describe('验证码校验', () => {
    it('6位数字 通过', () => {
      expect(validateVerificationCode('123456')).toBe(true)
    })

    it('5位数字 不通过', () => {
      expect(validateVerificationCode('12345')).toBe(false)
    })

    it('7位数字 不通过', () => {
      expect(validateVerificationCode('1234567')).toBe(false)
    })

    it('包含字母 不通过', () => {
      expect(validateVerificationCode('12a456')).toBe(false)
    })

    it('空字符串 不通过', () => {
      expect(validateVerificationCode('')).toBe(false)
    })
  })

  describe('表单整体校验', () => {
    const validForm = {
      date: '2026-06-15',
      slotId: 'morning',
      city: '北京',
      district: '朝阳区',
      address: '建国路88号SOHO现代城',
      pianoBrand: '雅马哈',
      name: '张三',
      phone: '13800138000',
      verificationCode: '123456',
    }

    it('完整有效表单 校验通过', () => {
      const result = validateAppointmentForm(validForm)
      expect(result.valid).toBe(true)
      expect(Object.keys(result.errors)).toHaveLength(0)
    })

    it('未选日期 校验失败', () => {
      const result = validateAppointmentForm({ ...validForm, date: null })
      expect(result.valid).toBe(false)
      expect(result.errors.date).toBeDefined()
    })

    it('未选时段 校验失败', () => {
      const result = validateAppointmentForm({ ...validForm, slotId: null })
      expect(result.valid).toBe(false)
      expect(result.errors.slotId).toBeDefined()
    })

    it('手机号非法 校验失败', () => {
      const result = validateAppointmentForm({ ...validForm, phone: '12345' })
      expect(result.valid).toBe(false)
      expect(result.errors.phone).toBeDefined()
    })

    it('验证码非法 校验失败', () => {
      const result = validateAppointmentForm({ ...validForm, verificationCode: 'abc' })
      expect(result.valid).toBe(false)
      expect(result.errors.verificationCode).toBeDefined()
    })

    it('多字段非法 返回多个错误信息', () => {
      const result = validateAppointmentForm({
        ...validForm,
        date: null,
        phone: 'invalid',
        name: '张',
      })
      expect(result.valid).toBe(false)
      expect(Object.keys(result.errors).length).toBeGreaterThanOrEqual(3)
      expect(result.errors.date).toBeDefined()
      expect(result.errors.phone).toBeDefined()
      expect(result.errors.name).toBeDefined()
    })
  })
})

describe('API 层 mock fetch 测试', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('sendSmsCode 调用正确的端点和参数', async () => {
    const mockResponse = { success: true, message: '验证码已发送' }
    ;(fetch as any).mockResolvedValue({
      json: () => Promise.resolve(mockResponse),
    })

    const result = await sendSmsCode('13800138000')

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith('/api/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '13800138000' }),
    })
    expect(result).toEqual(mockResponse)
  })

  it('verifySmsCode 调用正确的端点和参数', async () => {
    const mockResponse = { success: true, message: '验证通过' }
    ;(fetch as any).mockResolvedValue({
      json: () => Promise.resolve(mockResponse),
    })

    const result = await verifySmsCode('13800138000', '123456')

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith('/api/verify-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '13800138000', code: '123456' }),
    })
    expect(result).toEqual(mockResponse)
  })

  it('submitAppointmentApi 调用正确的端点和参数', async () => {
    const mockRequest = {
      date: '2026-06-15',
      slotId: 'morning',
      address: '测试地址',
      city: '北京',
      district: '朝阳区',
      pianoBrand: '雅马哈',
      name: '张三',
      phone: '13800138000',
    }
    const mockResponse = { success: true, appointmentId: 'TN123ABC', message: '成功' }
    ;(fetch as any).mockResolvedValue({
      json: () => Promise.resolve(mockResponse),
    })

    const result = await submitAppointmentApi(mockRequest)

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith('/api/appointment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockRequest),
    })
    expect(result).toEqual(mockResponse)
  })

  it('网络错误时 API 抛出异常', async () => {
    const mockError = new Error('Network Error')
    ;(fetch as any).mockRejectedValue(mockError)

    await expect(sendSmsCode('13800138000')).rejects.toThrow('Network Error')
  })

  it('发送短信成功返回 success=true', async () => {
    ;(fetch as any).mockResolvedValue({
      json: () => Promise.resolve({ success: true, message: '验证码已发送，请注意查收' }),
    })

    const result = await sendSmsCode('13900139000')
    expect(result.success).toBe(true)
    expect(result.message).toContain('验证码已发送')
  })

  it('验证码错误返回 success=false', async () => {
    ;(fetch as any).mockResolvedValue({
      json: () => Promise.resolve({ success: false, message: '验证码错误或已过期' }),
    })

    const result = await verifySmsCode('13800138000', '000000')
    expect(result.success).toBe(false)
    expect(result.message).toContain('验证码错误')
  })
})
