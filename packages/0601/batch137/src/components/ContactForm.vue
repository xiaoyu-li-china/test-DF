<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { User, Phone } from 'lucide-vue-next'
import SmsCodeInput from '@/components/SmsCodeInput.vue'

const name = defineModel<string>('name', { required: true })
const phone = defineModel<string>('phone', { required: true })
const verificationCode = defineModel<string>('verificationCode', { required: true })

const isPhoneVerified = ref(false)
const phoneTouched = ref(false)

function onPhoneInput(e: Event) {
  const val = (e.target as HTMLInputElement).value.replace(/\D/g, '')
  phone.value = val.slice(0, 11)
  phoneTouched.value = true
  verificationCode.value = ''
  isPhoneVerified.value = false
}

function onVerified(verified: boolean) {
  isPhoneVerified.value = verified
}

const phoneError = computed(() => {
  if (phone.value.length === 0) return false
  if (!phoneTouched.value) return false
  return !/^1[3-9]\d{9}$/.test(phone.value)
})
</script>

<template>
  <div class="w-full space-y-4">
    <div class="flex items-center gap-2 mb-1">
      <User :size="16" class="text-gold-400" />
      <span class="text-sm font-medium text-navy-400">联系方式</span>
    </div>

    <div class="relative">
      <input
        v-model="name"
        type="text"
        placeholder="您的姓名"
        class="w-full px-4 py-3 bg-white/70 border-b-2 border-ivory-300 focus:border-gold-400 outline-none text-navy-500 placeholder:text-navy-200 transition-colors duration-300 rounded-t-lg"
      />
    </div>

    <div class="relative">
      <div class="absolute left-4 top-1/2 -translate-y-1/2 text-navy-200">
        <Phone :size="14" />
      </div>
      <input
        :value="phone"
        @input="onPhoneInput"
        @blur="phoneTouched = true"
        type="tel"
        placeholder="手机号码"
        maxlength="11"
        class="w-full pl-10 pr-4 py-3 bg-white/70 border-b-2 outline-none text-navy-500 placeholder:text-navy-200 transition-colors duration-300 rounded-t-lg"
        :class="phoneError ? 'border-red-300 focus:border-red-400' : 'border-ivory-300 focus:border-gold-400'"
      />
    </div>
    <p v-if="phoneError" class="text-xs text-red-400 -mt-2">请输入11位有效手机号码</p>

    <SmsCodeInput
      v-if="/^1[3-9]\d{9}$/.test(phone)"
      v-model="verificationCode"
      :phone="phone"
      purpose="appointment"
      @verified="onVerified"
    />
  </div>
</template>
