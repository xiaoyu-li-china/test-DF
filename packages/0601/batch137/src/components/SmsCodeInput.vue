<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { sendSmsCode, verifySmsCode, getSmsCodeForTesting } from '@/lib/mockApi'
import { Shield, RefreshCw } from 'lucide-vue-next'

const props = defineProps<{
  phone: string
  purpose: 'appointment' | 'reschedule'
  autoSend?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'verified': [verified: boolean]
}>()

const code = defineModel<string>('modelValue', { required: true })

const countdown = ref(0)
const isSending = ref(false)
const isVerified = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
let timer: number | null = null

const canSend = computed(() => {
  return /^1[3-9]\d{9}$/.test(props.phone) && countdown.value === 0 && !isSending.value && !isVerified.value
})

const buttonText = computed(() => {
  if (isSending.value) return '发送中...'
  if (countdown.value > 0) return `${countdown.value}s 后重发`
  return '获取验证码'
})

watch(() => props.phone, () => {
  isVerified.value = false
  errorMsg.value = ''
  successMsg.value = ''
  code.value = ''
})

watch(() => props.autoSend, (val) => {
  if (val && canSend.value) {
    handleSendCode()
  }
})

async function handleSendCode() {
  if (!canSend.value) return

  isSending.value = true
  errorMsg.value = ''
  successMsg.value = ''

  await new Promise((r) => setTimeout(r, 600))

  const result = sendSmsCode({ phone: props.phone, purpose: props.purpose })

  isSending.value = false

  if (result.success) {
    const testCode = getSmsCodeForTesting(props.phone)
    successMsg.value = `验证码已发送${testCode ? `（测试码：${testCode}）` : ''}`
    countdown.value = 60

    if (timer) clearInterval(timer)
    timer = window.setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        if (timer) clearInterval(timer)
        timer = null
      }
    }, 1000)
  } else {
    errorMsg.value = result.message
  }
}

async function handleVerify() {
  if (code.value.length !== 6) {
    errorMsg.value = '请输入6位验证码'
    return
  }

  errorMsg.value = ''
  successMsg.value = ''

  const result = verifySmsCode({ phone: props.phone, code: code.value, purpose: props.purpose })

  if (result.success) {
    isVerified.value = true
    successMsg.value = '验证成功'
    emit('verified', true)
  } else {
    errorMsg.value = result.message
    emit('verified', false)
  }
}
</script>

<template>
  <div class="w-full space-y-2">
    <div class="flex items-center gap-2 mb-1">
      <Shield :size="16" class="text-gold-400" />
      <span class="text-sm font-medium text-navy-400">短信验证</span>
    </div>

    <div class="flex gap-2">
      <div class="flex-1 relative">
        <input
          v-model="code"
          type="text"
          placeholder="请输入6位验证码"
          maxlength="6"
          :disabled="isVerified"
          class="w-full px-4 py-3 bg-white/70 border-b-2 border-ivory-300 focus:border-gold-400 outline-none text-navy-500 placeholder:text-navy-200 transition-colors duration-300 rounded-t-lg tracking-widest text-center font-mono text-lg"
          @input="code = code.replace(/\D/g, '')"
        />
      </div>
      <button
        @click="handleSendCode"
        :disabled="!canSend"
        class="px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 whitespace-nowrap border-2 flex items-center gap-1"
        :class="{
          'bg-navy-500 text-white border-navy-500 shadow-md shadow-navy-500/20 hover:shadow-lg hover:shadow-navy-500/30 cursor-pointer': canSend,
          'bg-ivory-100 text-ivory-400 border-ivory-200 cursor-not-allowed': !canSend,
        }"
      >
        <RefreshCw v-if="isSending" :size="14" class="animate-spin" />
        {{ buttonText }}
      </button>
    </div>

    <div v-if="successMsg" class="text-xs text-green-600 flex items-center gap-1">
      <Shield :size="12" />
      {{ successMsg }}
    </div>
    <div v-if="errorMsg" class="text-xs text-red-400">
      {{ errorMsg }}
    </div>
  </div>
</template>
