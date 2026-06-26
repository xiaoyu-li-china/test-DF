import * as yup from 'yup'

export const TAX_ID_REGEX = /^[0-9A-HJ-NP-RTUW-Y]{17}[0-9A-HJ-NP-RTUW-Y]$/i

export function validateTaxId(taxId: string): boolean {
  if (!taxId || taxId.length !== 18) return false
  return TAX_ID_REGEX.test(taxId)
}

export function getTaxIdErrorMessage(taxId: string): string | null {
  if (!taxId) return '请填写企业税号'
  if (taxId.length !== 18) return '税号必须为18位'
  if (!TAX_ID_REGEX.test(taxId)) return '税号格式不正确'
  return null
}

export const createInvoiceSchema = () =>
  yup.object({
    titleType: yup.string().oneOf(['personal', 'enterprise']).required('请选择抬头类型'),
    invoiceType: yup.string().oneOf(['normal', 'special']).required('请选择发票类型'),
    taxId: yup
      .string()
      .when('titleType', {
        is: 'enterprise',
        then: (s) =>
          s
            .required('请填写企业税号')
            .length(18, '税号必须为18位')
            .matches(TAX_ID_REGEX, '税号格式不正确'),
        otherwise: (s) => s.notRequired(),
      }),
    bankName: yup
      .string()
      .when(['titleType', 'invoiceType'], {
        is: (titleType: string, invoiceType: string) =>
          titleType === 'enterprise' && invoiceType === 'special',
        then: (s) => s.required('请填写开户银行'),
        otherwise: (s) => s.notRequired(),
      }),
    bankAccount: yup
      .string()
      .when(['titleType', 'invoiceType'], {
        is: (titleType: string, invoiceType: string) =>
          titleType === 'enterprise' && invoiceType === 'special',
        then: (s) => s.required('请填写银行账号'),
        otherwise: (s) => s.notRequired(),
      }),
    email: yup
      .string()
      .required('请填写邮箱地址')
      .email('邮箱格式不正确'),
    orderId: yup.string().required('请选择入住订单'),
    amount: yup.number().required(),
  })
