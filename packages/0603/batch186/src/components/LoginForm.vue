<script setup>
import { ref, computed, watch, onUnmounted, onMounted } from 'vue'

const locale = ref('zh')

const messages = {
  zh: {
    title: '用户注册',
    subtitle: '请填写以下信息完成注册',
    emailLabel: '邮箱地址',
    emailPlaceholder: '请输入邮箱地址',
    passwordLabel: '密码',
    passwordPlaceholder: '请输入密码',
    confirmPasswordLabel: '确认密码',
    confirmPasswordPlaceholder: '请再次输入密码',
    submitBtn: '注 册',
    checking: '校验中...',
    passwordHint: '密码长度为 {min}-{max} 位',
    emailRequired: '请输入邮箱地址',
    emailInvalid: '邮箱格式不正确，请输入如 name@example.com',
    emailRegistered: '该邮箱已注册，请直接登录或使用其他邮箱',
    emailCheckFailed: '邮箱校验失败，请稍后重试',
    passwordRequired: '请输入密码',
    passwordTooShort: '密码长度不能少于 {min} 位',
    passwordTooLong: '密码长度不能超过 {max} 位',
    confirmPasswordRequired: '请确认密码',
    passwordsNotMatch: '两次输入的密码不一致',
    loadingRules: '加载校验规则中...',
    emailChecking: '邮箱校验中...'
  },
  en: {
    title: 'Sign Up',
    subtitle: 'Fill in the form to create your account',
    emailLabel: 'Email Address',
    emailPlaceholder: 'Enter your email',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter your password',
    confirmPasswordLabel: 'Confirm Password',
    confirmPasswordPlaceholder: 'Re-enter your password',
    submitBtn: 'Sign Up',
    checking: 'Checking...',
    passwordHint: 'Password must be {min}-{max} characters',
    emailRequired: 'Please enter your email',
    emailInvalid: 'Invalid email format, e.g. name@example.com',
    emailRegistered: 'This email is already registered',
    emailCheckFailed: 'Email check failed, please try again later',
    passwordRequired: 'Please enter your password',
    passwordTooShort: 'Password must be at least {min} characters',
    passwordTooLong: 'Password cannot exceed {max} characters',
    confirmPasswordRequired: 'Please confirm your password',
    passwordsNotMatch: 'Passwords do not match',
    loadingRules: 'Loading validation rules...',
    emailChecking: 'Checking email...'
  }
}

const t = (key, params = {}) => {
  let text = messages[locale.value][key] || key
  Object.keys(params).forEach(param => {
    text = text.replace(`{${param}}`, params[param])
  })
  return text
}

const toggleLocale = () => {
  locale.value = locale.value === 'zh' ? 'en' : 'zh'
}

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const emailTouched = ref(false)
const passwordTouched = ref(false)
const confirmPasswordTouched = ref(false)
const submitted = ref(false)
const emailChecking = ref(false)
const emailAsyncError = ref('')
const rulesLoading = ref(true)

const validationRules = ref({
  passwordMinLength: 6,
  passwordMaxLength: 20
})

let debounceTimer = null
let latestCheckId = 0

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

const fetchValidationRules = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        passwordMinLength: 8,
        passwordMaxLength: 16
      })
    }, 600)
  })
}

const checkEmailExists = (emailValue) => {
  return new Promise((resolve) => {
    const registeredEmails = ['admin@test.com', 'user@example.com']
    setTimeout(() => {
      resolve(registeredEmails.includes(emailValue.toLowerCase()))
    }, 800)
  })
}

onMounted(async () => {
  try {
    const rules = await fetchValidationRules()
    validationRules.value = rules
  } finally {
    rulesLoading.value = false
  }
})

const syncEmailErrors = computed(() => {
  const errors = []
  if (!email.value) {
    errors.push(t('emailRequired'))
  } else if (!emailRegex.test(email.value)) {
    errors.push(t('emailInvalid'))
  }
  return errors
})

const emailErrors = computed(() => {
  const errors = [...syncEmailErrors.value]
  if (emailAsyncError.value) {
    errors.push(emailAsyncError.value)
  }
  return errors
})

const passwordErrors = computed(() => {
  const errors = []
  if (!password.value) {
    errors.push(t('passwordRequired'))
  } else if (password.value.length < validationRules.value.passwordMinLength) {
    errors.push(t('passwordTooShort', { min: validationRules.value.passwordMinLength }))
  } else if (password.value.length > validationRules.value.passwordMaxLength) {
    errors.push(t('passwordTooLong', { max: validationRules.value.passwordMaxLength }))
  }
  return errors
})

const confirmPasswordErrors = computed(() => {
  const errors = []
  if (!confirmPassword.value) {
    errors.push(t('confirmPasswordRequired'))
  } else if (confirmPassword.value !== password.value) {
    errors.push(t('passwordsNotMatch'))
  }
  return errors
})

const showEmailError = computed(() => {
  return (emailTouched.value || submitted.value) && emailErrors.value.length > 0
})

const showPasswordError = computed(() => {
  return (passwordTouched.value || submitted.value) && passwordErrors.value.length > 0
})

const showConfirmPasswordError = computed(() => {
  return (confirmPasswordTouched.value || submitted.value) && confirmPasswordErrors.value.length > 0
})

const isFormValid = computed(() => {
  return emailErrors.value.length === 0
    && passwordErrors.value.length === 0
    && confirmPasswordErrors.value.length === 0
    && !emailChecking.value
    && !rulesLoading.value
})

watch(email, (newVal) => {
  emailAsyncError.value = ''
  emailChecking.value = false

  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }

  if (!newVal || !emailRegex.test(newVal)) {
    return
  }

  if (!emailTouched.value && !submitted.value) {
    emailTouched.value = true
  }

  emailChecking.value = true

  debounceTimer = setTimeout(async () => {
    const checkId = ++latestCheckId
    try {
      const exists = await checkEmailExists(newVal)
      if (checkId !== latestCheckId) return
      if (exists) {
        emailAsyncError.value = t('emailRegistered')
      }
    } catch {
      if (checkId !== latestCheckId) return
      emailAsyncError.value = t('emailCheckFailed')
    } finally {
      if (checkId === latestCheckId) {
        emailChecking.value = false
      }
    }
  }, 500)
})

onUnmounted(() => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
})

const handleEmailBlur = () => {
  emailTouched.value = true
}

const handlePasswordBlur = () => {
  passwordTouched.value = true
}

const handleConfirmPasswordBlur = () => {
  confirmPasswordTouched.value = true
}

const handleSubmit = () => {
  submitted.value = true
  emailTouched.value = true
  passwordTouched.value = true
  confirmPasswordTouched.value = true
  
  if (!isFormValid.value) {
    return
  }
  
  alert(locale.value === 'zh' 
    ? `注册成功！\n邮箱：${email.value}\n密码：${'*'.repeat(password.value.length)}`
    : `Sign up successful!\nEmail: ${email.value}\nPassword: ${'*'.repeat(password.value.length)}`
  )
  
  email.value = ''
  password.value = ''
  confirmPassword.value = ''
  emailTouched.value = false
  passwordTouched.value = false
  confirmPasswordTouched.value = false
  submitted.value = false
  emailAsyncError.value = ''
  emailChecking.value = false
}
</script>

<template>
  <div class="login-card">
    <div class="locale-switch">
      <button type="button" class="locale-btn" @click="toggleLocale">
        {{ locale === 'zh' ? 'EN' : '中文' }}
      </button>
    </div>
    
    <h2 class="login-title">{{ t('title') }}</h2>
    <p class="login-subtitle">{{ t('subtitle') }}</p>
    
    <div v-if="rulesLoading" class="loading-rules">
      <span class="rules-spinner"></span>
      <span>{{ t('loadingRules') }}</span>
    </div>
    
    <form @submit.prevent="handleSubmit" class="login-form" novalidate>
      <div class="form-group">
        <label for="email" class="form-label">{{ t('emailLabel') }}</label>
        <div class="input-wrapper">
          <input
            id="email"
            v-model="email"
            type="email"
            class="form-input"
            :class="{ 'input-error': showEmailError, 'input-checking': emailChecking }"
            :placeholder="t('emailPlaceholder')"
            @blur="handleEmailBlur"
            autocomplete="email"
          />
          <span v-if="emailChecking" class="checking-spinner"></span>
        </div>
        <div v-if="emailChecking" class="checking-messages">
          <p class="checking-text">{{ t('emailChecking') }}</p>
        </div>
        <div v-else-if="showEmailError" class="error-messages">
          <p v-for="(error, index) in emailErrors" :key="index" class="error-text">
            {{ error }}
          </p>
        </div>
      </div>
      
      <div class="form-group">
        <label for="password" class="form-label">{{ t('passwordLabel') }}</label>
        <input
          id="password"
          v-model="password"
          type="password"
          class="form-input"
          :class="{ 'input-error': showPasswordError }"
          :placeholder="t('passwordPlaceholder')"
          @blur="handlePasswordBlur"
          autocomplete="new-password"
        />
        <div v-if="showPasswordError" class="error-messages">
          <p v-for="(error, index) in passwordErrors" :key="index" class="error-text">
            {{ error }}
          </p>
        </div>
        <p class="hint-text">{{ t('passwordHint', { min: validationRules.passwordMinLength, max: validationRules.passwordMaxLength }) }}</p>
      </div>
      
      <div class="form-group">
        <label for="confirmPassword" class="form-label">{{ t('confirmPasswordLabel') }}</label>
        <input
          id="confirmPassword"
          v-model="confirmPassword"
          type="password"
          class="form-input"
          :class="{ 'input-error': showConfirmPasswordError }"
          :placeholder="t('confirmPasswordPlaceholder')"
          @blur="handleConfirmPasswordBlur"
          autocomplete="new-password"
        />
        <div v-if="showConfirmPasswordError" class="error-messages">
          <p v-for="(error, index) in confirmPasswordErrors" :key="index" class="error-text">
            {{ error }}
          </p>
        </div>
      </div>
      
      <button 
        type="submit" 
        class="submit-btn"
        :class="{ 'btn-disabled': !isFormValid, 'btn-checking': emailChecking || rulesLoading }"
        :disabled="!isFormValid"
      >
        {{ emailChecking || rulesLoading ? t('checking') : t('submitBtn') }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.login-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 40px 32px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 100%;
  position: relative;
}

.locale-switch {
  position: absolute;
  top: 20px;
  right: 20px;
}

.locale-btn {
  padding: 6px 14px;
  background: transparent;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  font-size: 13px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
}

.locale-btn:hover {
  border-color: #667eea;
  color: #667eea;
}

.login-title {
  font-size: 28px;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 8px;
  text-align: center;
}

.login-subtitle {
  font-size: 14px;
  color: #6b7280;
  text-align: center;
  margin-bottom: 24px;
}

.loading-rules {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: #f0f4ff;
  border-radius: 8px;
  margin-bottom: 20px;
  color: #667eea;
  font-size: 14px;
}

.rules-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e5e7eb;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-wrapper .form-input {
  width: 100%;
  padding-right: 40px;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.form-input {
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 15px;
  transition: all 0.2s ease;
  outline: none;
}

.form-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.input-error {
  border-color: #ef4444;
}

.input-error:focus {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.input-checking {
  border-color: #667eea;
}

.input-checking:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.checking-spinner {
  position: absolute;
  right: 12px;
  width: 18px;
  height: 18px;
  border: 2px solid #e5e7eb;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.checking-messages {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.checking-text {
  color: #667eea;
  font-size: 13px;
  margin: 0;
}

.error-messages {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.error-text {
  color: #ef4444;
  font-size: 13px;
  margin: 0;
}

.hint-text {
  color: #9ca3af;
  font-size: 12px;
  margin: 0;
}

.submit-btn {
  padding: 14px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 8px;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
}

.submit-btn:active:not(:disabled) {
  transform: translateY(0);
}

.btn-disabled {
  background: #d1d5db;
  cursor: not-allowed;
  opacity: 0.7;
}

.btn-checking {
  cursor: not-allowed;
}
</style>
