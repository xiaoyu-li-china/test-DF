<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { X, Calendar, Clock, MapPin, CheckCircle, AlertCircle, Search } from 'lucide-vue-next'
import CalendarPicker from '@/components/CalendarPicker.vue'
import TimeSlotPicker from '@/components/TimeSlotPicker.vue'
import SmsCodeInput from '@/components/SmsCodeInput.vue'
import {
  getAppointmentDetail,
  getAvailableSlots,
  rescheduleAppointment,
} from '@/lib/mockApi'
import type { AppointmentDetail, TimeSlot } from '@/lib/types'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'rescheduled': [appointmentId: string]
}>()

watch(() => props.modelValue, (val) => {
  if (!val) {
    resetState()
  }
})

const currentStep = ref<'query' | 'info' | 'reschedule' | 'success'>('query')
const appointmentIdInput = ref('')
const appointment = ref<AppointmentDetail | null>(null)
const queryError = ref('')
const isQuerying = ref(false)

const newDate = ref<string | null>(null)
const newSlotId = ref<string | null>(null)
const availableSlots = ref<TimeSlot[]>([])
const verificationCode = ref('')
const rescheduleError = ref('')
const isRescheduling = ref(false)

const successInfo = ref<{
  appointmentId: string
  oldDate: string
  oldSlot: string
  newDate: string
  newSlot: string
} | null>(null)

watch(newDate, (val) => {
  if (val) {
    availableSlots.value = getAvailableSlots(val)
  } else {
    availableSlots.value = []
  }
  newSlotId.value = null
})

function formatDate(d: string): string {
  const [y, m, day] = d.split('-')
  return `${y}年${parseInt(m)}月${parseInt(day)}日`
}

function resetState() {
  currentStep.value = 'query'
  appointmentIdInput.value = ''
  appointment.value = null
  queryError.value = ''
  isQuerying.value = false
  newDate.value = null
  newSlotId.value = null
  availableSlots.value = []
  verificationCode.value = ''
  rescheduleError.value = ''
  isRescheduling.value = false
  successInfo.value = null
}

async function handleQuery() {
  if (!appointmentIdInput.value.trim()) {
    queryError.value = '请输入预约编号'
    return
  }

  queryError.value = ''
  isQuerying.value = true

  await new Promise((r) => setTimeout(r, 500))

  const result = getAppointmentDetail(appointmentIdInput.value.trim().toUpperCase())
  isQuerying.value = false

  if (result) {
    appointment.value = result
    currentStep.value = 'info'
  } else {
    queryError.value = '未找到该预约记录，请检查预约编号'
  }
}

function goToReschedule() {
  currentStep.value = 'reschedule'
}

function goBack() {
  if (currentStep.value === 'info') {
    currentStep.value = 'query'
  } else if (currentStep.value === 'reschedule') {
    currentStep.value = 'info'
    newDate.value = null
    newSlotId.value = null
  }
}

function close() {
  emit('update:modelValue', false)
}

const canReschedule = computed(() => {
  return !!newDate.value && !!newSlotId.value && verificationCode.value.length === 6
})

async function handleReschedule() {
  if (!canReschedule.value || !appointment.value) return

  rescheduleError.value = ''
  isRescheduling.value = true

  await new Promise((r) => setTimeout(r, 800))

  const result = rescheduleAppointment({
    appointmentId: appointment.value.appointmentId,
    newDate: newDate.value!,
    newSlotId: newSlotId.value!,
    verificationCode: verificationCode.value,
  })

  isRescheduling.value = false

  if (result.success) {
    successInfo.value = {
      appointmentId: appointment.value.appointmentId,
      oldDate: formatDate(appointment.value.date),
      oldSlot: appointment.value.slotLabel,
      newDate: formatDate(newDate.value!),
      newSlot: result.newSlot!,
    }
    currentStep.value = 'success'
    emit('rescheduled', appointment.value.appointmentId)
  } else {
    rescheduleError.value = result.message
  }
}
</script>

<template>
  <Teleport to="body">
    <transition name="modal-fade">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="close"
      >
        <div class="absolute inset-0 bg-navy-900/60 backdrop-blur-sm" @click="close" />

        <div class="relative w-full max-w-lg max-h-[85vh] overflow-hidden bg-ivory-50 rounded-2xl shadow-2xl shadow-navy-900/20 animate-fade-in-up">
          <button
            @click="close"
            class="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/80 text-navy-400 hover:bg-white hover:text-navy-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X :size="16" />
          </button>

          <div class="bg-gradient-to-r from-navy-500 to-navy-400 px-6 py-5">
            <h3 class="font-display text-xl text-white font-bold tracking-wide">预约改期</h3>
            <p class="text-navy-100 text-sm mt-0.5">为已有预约调整日期和时段</p>
          </div>

          <div class="p-6 overflow-y-auto max-h-[calc(85vh-120px)]">
            <div v-if="currentStep === 'query'" class="space-y-4">
              <p class="text-sm text-navy-400">
                请输入您的预约编号以查询当前预约信息
              </p>

              <div class="relative">
                <input
                  v-model="appointmentIdInput"
                  type="text"
                  placeholder="请输入预约编号（如 TN123456）"
                  class="w-full px-4 py-3 bg-white border-b-2 border-ivory-300 focus:border-gold-400 outline-none text-navy-500 placeholder:text-navy-200 transition-colors duration-300 rounded-t-lg uppercase font-mono tracking-wider"
                  @keyup.enter="handleQuery"
                />
              </div>

              <p v-if="queryError" class="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle :size="12" />
                {{ queryError }}
              </p>

              <button
                @click="handleQuery"
                :disabled="isQuerying || !appointmentIdInput.trim()"
                class="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2"
                :class="{
                  'bg-navy-500 text-white shadow-md shadow-navy-500/20 hover:shadow-lg hover:shadow-navy-500/30 cursor-pointer': appointmentIdInput.trim() && !isQuerying,
                  'bg-ivory-300 text-ivory-400 cursor-not-allowed': !appointmentIdInput.trim() || isQuerying,
                }"
              >
                <Search v-if="!isQuerying" :size="16" />
                <svg v-else class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>{{ isQuerying ? '查询中...' : '查询预约' }}</span>
              </button>
            </div>

            <div v-else-if="currentStep === 'info' && appointment" class="space-y-5">
              <div class="text-center py-2">
                <p class="text-xs text-navy-300 mb-1">当前预约</p>
                <p class="font-display text-xl font-bold text-gold-500">{{ appointment.appointmentId }}</p>
              </div>

              <div class="space-y-2 bg-white/60 rounded-xl p-4">
                <div class="flex items-center gap-2 py-2 border-b border-ivory-200">
                  <Calendar :size="14" class="text-gold-400 shrink-0" />
                  <span class="text-sm text-navy-300 w-20">预约日期</span>
                  <span class="text-sm font-medium text-navy-500">{{ formatDate(appointment.date) }}</span>
                </div>
                <div class="flex items-center gap-2 py-2 border-b border-ivory-200">
                  <Clock :size="14" class="text-gold-400 shrink-0" />
                  <span class="text-sm text-navy-300 w-20">预约时段</span>
                  <span class="text-sm font-medium text-navy-500">{{ appointment.slotLabel }}</span>
                </div>
                <div class="flex items-center gap-2 py-2 border-b border-ivory-200">
                  <MapPin :size="14" class="text-gold-400 shrink-0" />
                  <span class="text-sm text-navy-300 w-20">上门地址</span>
                  <span class="text-sm font-medium text-navy-500">{{ appointment.city }} {{ appointment.district }} {{ appointment.address }}</span>
                </div>
                <div class="flex items-center gap-2 py-2">
                  <span class="text-sm text-navy-300 w-20">联系人</span>
                  <span class="text-sm font-medium text-navy-500">{{ appointment.name }} · {{ appointment.phone }}</span>
                </div>
              </div>

              <div class="flex gap-3">
                <button
                  @click="goBack"
                  class="flex-1 py-3 rounded-xl font-medium text-sm border-2 border-navy-200 text-navy-400 hover:bg-navy-50 transition-all cursor-pointer"
                >
                  返回查询
                </button>
                <button
                  @click="goToReschedule"
                  class="flex-1 py-3 rounded-xl font-semibold text-sm bg-navy-500 text-white shadow-md shadow-navy-500/20 hover:shadow-lg hover:shadow-navy-500/30 transition-all cursor-pointer"
                >
                  申请改期
                </button>
              </div>
            </div>

            <div v-else-if="currentStep === 'reschedule'" class="space-y-6">
              <p class="text-sm text-navy-400">
                请选择新的日期和时段，并使用原预约手机号接收短信验证码
              </p>

              <div class="bg-gold-50/50 border border-gold-200/50 rounded-lg p-3">
                <p class="text-xs text-navy-300">原预约：{{ appointment?.date }} {{ appointment?.slotLabel }}</p>
              </div>

              <div class="space-y-2">
                <CalendarPicker v-model="newDate" />
              </div>

              <div class="space-y-2">
                <TimeSlotPicker
                  v-model="newSlotId"
                  :slots="availableSlots"
                  :disabled="!newDate"
                />
              </div>

              <div>
                <SmsCodeInput
                  v-if="appointment"
                  v-model="verificationCode"
                  :phone="appointment.phone.replace(/\*/g, '0')"
                  purpose="reschedule"
                />
                <p v-else class="text-xs text-navy-200 text-center py-2">请先查询预约信息</p>
              </div>

              <p v-if="rescheduleError" class="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle :size="12" />
                {{ rescheduleError }}
              </p>

              <div class="flex gap-3">
                <button
                  @click="goBack"
                  class="flex-1 py-3 rounded-xl font-medium text-sm border-2 border-navy-200 text-navy-400 hover:bg-navy-50 transition-all cursor-pointer"
                >
                  返回
                </button>
                <button
                  @click="handleReschedule"
                  :disabled="!canReschedule || isRescheduling"
                  class="flex-1 py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2"
                  :class="{
                    'bg-navy-500 text-white shadow-md shadow-navy-500/20 hover:shadow-lg hover:shadow-navy-500/30 cursor-pointer': canReschedule && !isRescheduling,
                    'bg-ivory-300 text-ivory-400 cursor-not-allowed': !canReschedule || isRescheduling,
                  }"
                >
                  <svg v-if="isRescheduling" class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>{{ isRescheduling ? '提交中...' : '确认改期' }}</span>
                </button>
              </div>
            </div>

            <div v-else-if="currentStep === 'success' && successInfo" class="space-y-5 py-4">
              <div class="text-center">
                <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                  <CheckCircle :size="32" class="text-green-500" />
                </div>
                <h4 class="font-display text-xl font-bold text-navy-500 mb-1">改期成功</h4>
                <p class="text-sm text-navy-300">预约编号 {{ successInfo.appointmentId }}</p>
              </div>

              <div class="bg-white/60 rounded-xl p-4 space-y-3">
                <div class="flex items-center justify-between py-2 border-b border-ivory-200">
                  <span class="text-sm text-navy-300">原日期</span>
                  <span class="text-sm font-medium text-navy-500 line-through">{{ successInfo.oldDate }} {{ successInfo.oldSlot }}</span>
                </div>
                <div class="flex items-center justify-between py-2">
                  <span class="text-sm text-navy-300">新日期</span>
                  <span class="text-sm font-bold text-gold-500">{{ successInfo.newDate }} {{ successInfo.newSlot }}</span>
                </div>
              </div>

              <button
                @click="close"
                class="w-full py-3 rounded-xl font-semibold text-sm bg-navy-500 text-white shadow-md shadow-navy-500/20 hover:shadow-lg hover:shadow-navy-500/30 transition-all cursor-pointer"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: all 0.3s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
.modal-fade-enter-from .relative,
.modal-fade-leave-to .relative {
  transform: translateY(20px) scale(0.95);
}
</style>
