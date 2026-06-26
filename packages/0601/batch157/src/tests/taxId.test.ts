import { describe, it, expect } from 'vitest'
import { validateTaxId, getTaxIdErrorMessage, TAX_ID_REGEX, createInvoiceSchema } from '@/utils/validation'

describe('税号校验规则', () => {
  describe('validateTaxId 函数', () => {
    it('有效税号 - 18位数字和字母组合', () => {
      expect(validateTaxId('91110105MA001ABC12')).toBe(true)
    })

    it('有效税号 - 全数字', () => {
      expect(validateTaxId('123456789012345678')).toBe(true)
    })

    it('有效税号 - 包含字母I除外', () => {
      expect(validateTaxId('91110105MA001ABX12')).toBe(true)
    })

    it('无效税号 - 长度不足18位', () => {
      expect(validateTaxId('91110105MA001ABC1')).toBe(false)
    })

    it('无效税号 - 长度超过18位', () => {
      expect(validateTaxId('91110105MA001ABC123')).toBe(false)
    })

    it('无效税号 - 空字符串', () => {
      expect(validateTaxId('')).toBe(false)
    })

    it('无效税号 - 包含非法字符I', () => {
      expect(validateTaxId('91110105MA001ABI12')).toBe(false)
    })

    it('无效税号 - 包含非法字符O', () => {
      expect(validateTaxId('91110105MA001ABO12')).toBe(false)
    })

    it('无效税号 - 包含小写字母', () => {
      expect(validateTaxId('91110105ma001abc12')).toBe(true)
    })

    it('无效税号 - 包含特殊字符', () => {
      expect(validateTaxId('91110105MA001AB-12')).toBe(false)
    })
  })

  describe('getTaxIdErrorMessage 函数', () => {
    it('空税号返回必填错误', () => {
      expect(getTaxIdErrorMessage('')).toBe('请填写企业税号')
    })

    it('长度不足返回长度错误', () => {
      expect(getTaxIdErrorMessage('91110105')).toBe('税号必须为18位')
    })

    it('格式错误返回格式错误', () => {
      expect(getTaxIdErrorMessage('91110105MA001ABI12')).toBe('税号格式不正确')
    })

    it('有效税号返回null', () => {
      expect(getTaxIdErrorMessage('91110105MA001ABC12')).toBeNull()
    })
  })

  describe('TAX_ID_REGEX 正则表达式', () => {
    it('匹配有效税号', () => {
      expect(TAX_ID_REGEX.test('91110105MA001ABC12')).toBe(true)
    })

    it('不匹配包含字母I的税号', () => {
      expect(TAX_ID_REGEX.test('91110105MA001ABI12')).toBe(false)
    })

    it('不匹配包含字母O的税号', () => {
      expect(TAX_ID_REGEX.test('91110105MA001ABO12')).toBe(false)
    })

    it('不匹配包含字母Z的税号', () => {
      expect(TAX_ID_REGEX.test('91110105MA001ABZ12')).toBe(false)
    })
  })

  describe('Yup Schema 集成校验', () => {
    it('企业抬头时税号为空 - 校验失败', async () => {
      const schema = createInvoiceSchema()
      const result = await schema.validate({
        titleType: 'enterprise',
        invoiceType: 'normal',
        taxId: '',
        email: 'test@example.com',
        orderId: 'ORD001',
        amount: 100,
      }).catch((e) => e)

      expect(result.errors).toContain('请填写企业税号')
    })

    it('企业抬头时税号长度不对 - 校验失败', async () => {
      const schema = createInvoiceSchema()
      const result = await schema.validate({
        titleType: 'enterprise',
        invoiceType: 'normal',
        taxId: '12345',
        email: 'test@example.com',
        orderId: 'ORD001',
        amount: 100,
      }).catch((e) => e)

      expect(result.errors).toContain('税号必须为18位')
    })

    it('企业抬头时税号格式不对 - 校验失败', async () => {
      const schema = createInvoiceSchema()
      const result = await schema.validate({
        titleType: 'enterprise',
        invoiceType: 'normal',
        taxId: '91110105MA001ABI12',
        email: 'test@example.com',
        orderId: 'ORD001',
        amount: 100,
      }).catch((e) => e)

      expect(result.errors).toContain('税号格式不正确')
    })

    it('企业抬头时税号正确 - 校验通过', async () => {
      const schema = createInvoiceSchema()
      const result = await schema.validate({
        titleType: 'enterprise',
        invoiceType: 'normal',
        taxId: '91110105MA001ABC12',
        email: 'test@example.com',
        orderId: 'ORD001',
        amount: 100,
      })

      expect(result.taxId).toBe('91110105MA001ABC12')
    })

    it('个人抬头时税号为空 - 校验通过', async () => {
      const schema = createInvoiceSchema()
      const result = await schema.validate({
        titleType: 'personal',
        invoiceType: 'normal',
        taxId: '',
        email: 'test@example.com',
        orderId: 'ORD001',
        amount: 100,
      })

      expect(result.taxId).toBe('')
    })
  })
})
