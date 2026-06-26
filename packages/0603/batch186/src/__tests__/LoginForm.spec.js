import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import LoginForm from '../components/LoginForm.vue'

const flushPromises = () => new Promise(resolve => queueMicrotask(resolve))

const advanceTime = async (ms) => {
  await vi.advanceTimersByTimeAsync(ms)
  await flushPromises()
}

const mountAndWaitForRules = async () => {
  const wrapper = mount(LoginForm, { attachTo: document.body })
  await advanceTime(700)
  return wrapper
}

const setInputValue = async (wrapper, id, value) => {
  const input = wrapper.find(`#${id}`)
  await input.setValue(value)
  await input.trigger('blur')
  await flushPromises()
}

const fillValidForm = async (wrapper, emailVal = 'newuser@test.com') => {
  await setInputValue(wrapper, 'email', emailVal)
  await advanceTime(1400)
  await setInputValue(wrapper, 'password', 'validpass123')
  await setInputValue(wrapper, 'confirmPassword', 'validpass123')
}

describe('LoginForm 邮箱校验', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('邮箱为空时显示必填错误', async () => {
    const wrapper = await mountAndWaitForRules()

    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    const errors = wrapper.findAll('.error-text')
    const hasRequired = errors.some(e =>
      e.text().includes('请输入邮箱') || e.text().includes('enter your email')
    )
    expect(hasRequired).toBe(true)
  })

  it('邮箱格式错误时显示格式错误提示', async () => {
    const wrapper = await mountAndWaitForRules()

    await setInputValue(wrapper, 'email', 'invalid-email')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    const errors = wrapper.findAll('.error-text')
    const hasFormatError = errors.some(e =>
      e.text().includes('格式不正确') || e.text().includes('Invalid email')
    )
    expect(hasFormatError).toBe(true)
  })

  it('邮箱格式正确且未注册时不显示邮箱错误', async () => {
    const wrapper = await mountAndWaitForRules()

    await setInputValue(wrapper, 'email', 'newuser@test.com')
    await advanceTime(1400)

    const errors = wrapper.findAll('.error-text')
    const emailError = errors.find(e =>
      e.text().includes('邮箱') || e.text().includes('email')
    )
    expect(emailError).toBeUndefined()
  })

  it('邮箱已注册时显示已注册错误', async () => {
    const wrapper = await mountAndWaitForRules()

    await setInputValue(wrapper, 'email', 'admin@test.com')
    await advanceTime(1400)

    const errors = wrapper.findAll('.error-text')
    const hasRegistered = errors.some(e =>
      e.text().includes('已注册') || e.text().includes('already registered')
    )
    expect(hasRegistered).toBe(true)
  })

  it('邮箱输入时显示校验中状态', async () => {
    const wrapper = await mountAndWaitForRules()

    await setInputValue(wrapper, 'email', 'user@test.com')

    expect(wrapper.find('.checking-text').exists()).toBe(true)
  })
})

describe('LoginForm 密码校验', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('密码为空时显示必填错误', async () => {
    const wrapper = await mountAndWaitForRules()

    await setInputValue(wrapper, 'email', 'user@test.com')
    await advanceTime(1400)
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    const errors = wrapper.findAll('.error-text')
    const hasRequired = errors.some(e =>
      e.text().includes('请输入密码') || e.text().includes('enter your password')
    )
    expect(hasRequired).toBe(true)
  })

  it('密码长度不足时显示错误', async () => {
    const wrapper = await mountAndWaitForRules()

    await setInputValue(wrapper, 'email', 'user@test.com')
    await advanceTime(1400)
    await setInputValue(wrapper, 'password', '123')

    const errors = wrapper.findAll('.error-text')
    const hasTooShort = errors.some(e =>
      e.text().includes('不能少于') || e.text().includes('at least')
    )
    expect(hasTooShort).toBe(true)
  })

  it('密码长度超过最大值时显示错误', async () => {
    const wrapper = await mountAndWaitForRules()

    await setInputValue(wrapper, 'email', 'user@test.com')
    await advanceTime(1400)
    await setInputValue(wrapper, 'password', 'a'.repeat(20))

    const errors = wrapper.findAll('.error-text')
    const hasTooLong = errors.some(e =>
      e.text().includes('不能超过') || e.text().includes('cannot exceed')
    )
    expect(hasTooLong).toBe(true)
  })

  it('密码长度合法时不显示密码错误', async () => {
    const wrapper = await mountAndWaitForRules()

    await setInputValue(wrapper, 'email', 'user@test.com')
    await advanceTime(1400)
    await setInputValue(wrapper, 'password', 'validpass123')

    const errors = wrapper.findAll('.error-text')
    const passwordError = errors.find(e =>
      e.text().includes('密码长度') || e.text().includes('Password must') || e.text().includes('Password cannot')
    )
    expect(passwordError).toBeUndefined()
  })
})

describe('LoginForm 确认密码校验', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('确认密码为空时显示必填错误', async () => {
    const wrapper = await mountAndWaitForRules()

    await setInputValue(wrapper, 'email', 'user@test.com')
    await advanceTime(1400)
    await setInputValue(wrapper, 'password', 'validpass123')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    const errors = wrapper.findAll('.error-text')
    const hasConfirmRequired = errors.some(e =>
      e.text().includes('确认密码') || e.text().includes('confirm')
    )
    expect(hasConfirmRequired).toBe(true)
  })

  it('确认密码与密码不一致时显示错误', async () => {
    const wrapper = await mountAndWaitForRules()

    await setInputValue(wrapper, 'email', 'user@test.com')
    await advanceTime(1400)
    await setInputValue(wrapper, 'password', 'validpass123')
    await setInputValue(wrapper, 'confirmPassword', 'different123')

    const errors = wrapper.findAll('.error-text')
    const hasMismatch = errors.some(e =>
      e.text().includes('不一致') || e.text().includes('do not match')
    )
    expect(hasMismatch).toBe(true)
  })

  it('确认密码与密码一致时不显示错误', async () => {
    const wrapper = await mountAndWaitForRules()

    await setInputValue(wrapper, 'email', 'user@test.com')
    await advanceTime(1400)
    await setInputValue(wrapper, 'password', 'validpass123')
    await setInputValue(wrapper, 'confirmPassword', 'validpass123')

    const errors = wrapper.findAll('.error-text')
    const mismatchError = errors.find(e =>
      e.text().includes('不一致') || e.text().includes('do not match')
    )
    expect(mismatchError).toBeUndefined()
  })
})

describe('LoginForm 提交控制', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('表单校验未通过时提交按钮禁用', async () => {
    const wrapper = await mountAndWaitForRules()

    const submitBtn = wrapper.find('.submit-btn')
    expect(submitBtn.element.disabled).toBe(true)
  })

  it('所有字段合法时提交按钮可用', async () => {
    const wrapper = await mountAndWaitForRules()

    await fillValidForm(wrapper)

    const submitBtn = wrapper.find('.submit-btn')
    expect(submitBtn.element.disabled).toBe(false)
  })

  it('提交成功后清空表单', async () => {
    const wrapper = await mountAndWaitForRules()

    vi.spyOn(window, 'alert').mockImplementation(() => {})

    await fillValidForm(wrapper)
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.find('#email').element.value).toBe('')
    expect(wrapper.find('#password').element.value).toBe('')
    expect(wrapper.find('#confirmPassword').element.value).toBe('')

    window.alert.mockRestore()
  })
})

describe('LoginForm i18n 切换', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('点击语言切换按钮后界面文案切换为英文', async () => {
    const wrapper = await mountAndWaitForRules()

    expect(wrapper.find('.login-title').text()).toBe('用户注册')

    await wrapper.find('.locale-btn').trigger('click')
    await flushPromises()

    expect(wrapper.find('.login-title').text()).toBe('Sign Up')
    expect(wrapper.find('.login-subtitle').text()).toBe('Fill in the form to create your account')
  })

  it('切换为英文后邮箱格式错误显示英文', async () => {
    const wrapper = await mountAndWaitForRules()

    await wrapper.find('.locale-btn').trigger('click')
    await flushPromises()

    await setInputValue(wrapper, 'email', 'bad')

    const errors = wrapper.findAll('.error-text')
    const hasEnglishError = errors.some(e =>
      e.text().includes('Invalid email')
    )
    expect(hasEnglishError).toBe(true)
  })

  it('切换为英文后密码长度错误显示英文', async () => {
    const wrapper = await mountAndWaitForRules()

    await wrapper.find('.locale-btn').trigger('click')
    await flushPromises()

    await setInputValue(wrapper, 'password', '12')

    const errors = wrapper.findAll('.error-text')
    const hasEnglishError = errors.some(e =>
      e.text().includes('at least')
    )
    expect(hasEnglishError).toBe(true)
  })
})

describe('LoginForm 动态校验规则', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('页面加载时显示规则加载提示', () => {
    const wrapper = mount(LoginForm, { attachTo: document.body })
    expect(wrapper.find('.loading-rules').exists()).toBe(true)
  })

  it('规则加载完成后提示消失', async () => {
    const wrapper = await mountAndWaitForRules()

    expect(wrapper.find('.loading-rules').exists()).toBe(false)
  })

  it('使用后端返回的规则校验密码（min=8），7位密码应报错', async () => {
    const wrapper = await mountAndWaitForRules()

    await setInputValue(wrapper, 'email', 'user@test.com')
    await advanceTime(1400)
    await setInputValue(wrapper, 'password', '1234567')

    const errors = wrapper.findAll('.error-text')
    const hasTooShort = errors.some(e =>
      e.text().includes('8')
    )
    expect(hasTooShort).toBe(true)
  })

  it('密码提示文字显示后端返回的规则范围 8-16', async () => {
    const wrapper = await mountAndWaitForRules()

    const hintText = wrapper.find('.hint-text').text()
    expect(hintText).toContain('8')
    expect(hintText).toContain('16')
  })
})
