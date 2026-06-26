<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import CalendarPicker from '@/components/CalendarPicker.vue'
import TimeSlotPicker from '@/components/TimeSlotPicker.vue'
import AddressForm from '@/components/AddressForm.vue'
import PianoBrandSelect from '@/components/PianoBrandSelect.vue'
import ContactForm from '@/components/ContactForm.vue'
import PhotoUpload from '@/components/PhotoUpload.vue'
import RescheduleModal from '@/components/RescheduleModal.vue'
import PianoKeys from '@/components/PianoKeys.vue'
import { getAvailableSlots, submitAppointment } from '@/lib/mockApi'
import { validateAppointmentForm } from '@/lib/validation'
import { useViewportAdjust } from '@/composables/useViewportAdjust'
import type { TimeSlot } from '@/lib/types'
import { CalendarDays, Music, Send, Sparkles, RefreshCw } from 'lucide-vue-next'

const router = useRouter()
const { keyboardVisible } = useViewportAdjust()

const selectedDate = ref<string | null>(null)
const selectedSlotId = ref<string | null>(null)
const city = ref('')
const district = ref('')
const address = ref('')
const pianoBrand = ref('')
const customBrand = ref('')
const contactName = ref('')
const phone = ref('')
const verificationCode = ref('')
const photoUrls = ref<string[]>([])
const priceEstimate = ref('')
const isSubmitting = ref(false)
const formStep = ref(1)
const showRescheduleModal = ref(false)

const availableSlots = ref<TimeSlot[]>([])

onMounted(() => {
  window.scrollTo(0, 0)
})

watch(selectedDate, (newDate) => {
  if (newDate) {
    availableSlots.value = getAvailableSlots(newDate)
    formStep.value = 2
  } else {
    availableSlots.value = []
  }
  selectedSlotId.value = null
})

watch(selectedSlotId, (val) => {
  if (val) formStep.value = 3
})

const canSubmit = computed(() => {
  const result = validateAppointmentForm({
    date: selectedDate.value,
    slotId: selectedSlotId.value,
    city: city.value,
    district: district.value,
    address: address.value,
    pianoBrand: pianoBrand.value,
    customBrand: customBrand.value,
    name: contactName.value,
    phone: phone.value,
    verificationCode: verificationCode.value,
  })
  return result.valid
})

const formErrors = computed(() => {
  const result = validateAppointmentForm({
    date: selectedDate.value,
    slotId: selectedSlotId.value,
    city: city.value,
    district: district.value,
    address: address.value,
    pianoBrand: pianoBrand.value,
    customBrand: customBrand.value,
    name: contactName.value,
    phone: phone.value,
    verificationCode: verificationCode.value,
  })
  return result.errors
})

const phoneError = computed(() => {
  if (phone.value.length === 0) return false
  return phone.value.length > 0 && phone.value.length < 11
})

async function handleSubmit() {
  if (!canSubmit.value || isSubmitting.value) return

  isSubmitting.value = true

  await new Promise((r) => setTimeout(r, 1200))

  const result = submitAppointment({
    date: selectedDate.value!,
    slotId: selectedSlotId.value!,
    address: address.value,
    city: city.value,
    district: district.value,
    pianoBrand: pianoBrand.value,
    customBrand: customBrand.value,
    name: contactName.value,
    phone: phone.value,
    photoUrls: photoUrls.value.length > 0 ? photoUrls.value : undefined,
    priceEstimate: priceEstimate.value || undefined,
  })

  isSubmitting.value = false

  if (result.success) {
    router.push({ name: 'confirmation', query: { id: result.appointmentId } })
  }
}

function openRescheduleModal() {
  showRescheduleModal.value = true
}

function handleRescheduled(appointmentId: string) {
  console.log(`预约 ${appointmentId} 已改期`)
}
</script>

<template>
  <div class="min-h-screen py-8 px-4" style="padding-bottom: calc(8rem + env(safe-area-inset-bottom, 0px));">
    <div class="max-w-xl mx-auto">
      <header class="text-center mb-8 animate-fade-in-up" v-show="!keyboardVisible">
        <div class="flex items-center justify-center gap-2 mb-2">
          <Music :size="24" class="text-gold-400" />
          <h1 class="font-display text-3xl font-bold text-navy-500 tracking-wide">
            Piano Tuner
          </h1>
        </div>
        <p class="text-navy-300 text-sm font-light">专业钢琴调音 · 上门服务预约</p>
        <div class="mt-4">
          <PianoKeys />
        </div>
      </header>

      <div class="flex justify-center gap-3 mb-6" v-show="!keyboardVisible">
        <button
          @click="openRescheduleModal"
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-navy-500 bg-white/70 border border-ivory-300 hover:bg-gold-50 hover:border-gold-300 transition-all cursor-pointer"
        >
          <RefreshCw :size="12" />
          <span>已有预约？申请改期</span>
        </button>
      </div>

      <div class="bg-white/60 backdrop-blur-sm rounded-2xl shadow-xl shadow-navy-500/5 border border-ivory-300/50 overflow-hidden">
        <div class="bg-navy-500 px-6 py-4">
          <div class="flex items-center gap-3">
            <CalendarDays :size="20" class="text-gold-300" />
            <h2 class="font-display text-lg text-white font-semibold tracking-wide">预约信息</h2>
          </div>
          <div class="flex items-center gap-2 mt-3">
            <div
              v-for="s in 5"
              :key="s"
              class="flex-1 h-1 rounded-full transition-all duration-500"
              :class="formStep >= s ? 'bg-gold-400' : 'bg-navy-300/30'"
            />
          </div>
        </div>

        <div class="p-6 space-y-8">
          <section class="animate-fade-in-up">
            <div class="flex items-center gap-2 mb-4">
              <span class="w-6 h-6 rounded-full bg-navy-500 text-white text-xs flex items-center justify-center font-semibold">1</span>
              <span class="text-sm font-medium text-navy-500">选择预约日期</span>
            </div>
            <CalendarPicker v-model="selectedDate" />
          </section>

          <section class="animate-fade-in-up-delay-1">
            <div class="flex items-center gap-2 mb-4">
              <span
                class="w-6 h-6 rounded-full text-xs flex items-center justify-center font-semibold transition-all duration-300"
                :class="formStep >= 2 ? 'bg-navy-500 text-white' : 'bg-ivory-300 text-navy-200'"
              >2</span>
              <span
                class="text-sm font-medium transition-colors duration-300"
                :class="formStep >= 2 ? 'text-navy-500' : 'text-navy-200'"
              >选择时段</span>
            </div>
            <TimeSlotPicker
              v-model="selectedSlotId"
              :slots="availableSlots"
              :disabled="!selectedDate"
            />
          </section>

          <section class="animate-fade-in-up-delay-2">
            <div class="flex items-center gap-2 mb-4">
              <span
                class="w-6 h-6 rounded-full text-xs flex items-center justify-center font-semibold transition-all duration-300"
                :class="formStep >= 3 ? 'bg-navy-500 text-white' : 'bg-ivory-300 text-navy-200'"
              >3</span>
              <span
                class="text-sm font-medium transition-colors duration-300"
                :class="formStep >= 3 ? 'text-navy-500' : 'text-navy-200'"
              >填写信息</span>
            </div>

            <div class="space-y-6">
              <AddressForm v-model:city="city" v-model:district="district" v-model:address="address" />

              <PianoBrandSelect v-model="pianoBrand" v-model:custom-brand="customBrand" />

              <PhotoUpload
                v-model="photoUrls"
                v-model:price-estimate="priceEstimate"
              />

              <ContactForm
                v-model:name="contactName"
                v-model:phone="phone"
                v-model:verification-code="verificationCode"
              />

              <div v-if="Object.keys(formErrors).length > 0" class="space-y-1 text-xs text-red-400">
                <p v-for="(msg, key) in formErrors" :key="key" v-show="false">
                  {{ msg }}
                </p>
              </div>
            </div>
          </section>

          <div class="pt-2">
            <button
              @click="handleSubmit"
              :disabled="!canSubmit || isSubmitting"
              class="w-full py-4 rounded-xl font-semibold text-base transition-all duration-300 flex items-center justify-center gap-2"
              :class="{
                'bg-navy-500 text-white shadow-lg shadow-navy-500/30 hover:shadow-xl hover:shadow-navy-500/40 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer': canSubmit && !isSubmitting,
                'bg-ivory-300 text-ivory-400 cursor-not-allowed': !canSubmit || isSubmitting,
              }"
            >
              <template v-if="isSubmitting">
                <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>提交中...</span>
              </template>
              <template v-else>
                <Send :size="18" />
                <span>提交预约</span>
              </template>
            </button>
          </div>
        </div>
      </div>

      <footer class="text-center mt-8 text-navy-200 text-xs font-light">
        <div class="flex items-center justify-center gap-1">
          <Sparkles :size="12" class="text-gold-300" />
          <span>专业调音 · 品质保障 · 上门服务</span>
          <Sparkles :size="12" class="text-gold-300" />
        </div>
      </footer>
    </div>

    <RescheduleModal
      v-model="showRescheduleModal"
      @rescheduled="handleRescheduled"
    />
  </div>
</template>
