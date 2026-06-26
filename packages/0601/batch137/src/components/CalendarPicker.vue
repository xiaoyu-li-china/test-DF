<script setup lang="ts">
import { ref, computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps<{
  modelValue: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const today = new Date()
const currentYear = ref(today.getFullYear())
const currentMonth = ref(today.getMonth())

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

const calendarDays = computed(() => {
  const firstDay = new Date(currentYear.value, currentMonth.value, 1)
  const lastDay = new Date(currentYear.value, currentMonth.value + 1, 0)
  const startPadding = firstDay.getDay()
  const daysInMonth = lastDay.getDate()

  const days: { date: string; day: number; isCurrentMonth: boolean; isPast: boolean; isToday: boolean }[] = []

  const prevMonthLastDay = new Date(currentYear.value, currentMonth.value, 0).getDate()
  for (let i = startPadding - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i
    const d = new Date(currentYear.value, currentMonth.value - 1, day)
    days.push({
      date: formatDate(d),
      day,
      isCurrentMonth: false,
      isPast: true,
      isToday: false,
    })
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(currentYear.value, currentMonth.value, i)
    const dateStr = formatDate(d)
    const todayStr = formatDate(today)
    days.push({
      date: dateStr,
      day: i,
      isCurrentMonth: true,
      isPast: dateStr < todayStr,
      isToday: dateStr === todayStr,
    })
  }

  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(currentYear.value, currentMonth.value + 1, i)
    days.push({
      date: formatDate(d),
      day: i,
      isCurrentMonth: false,
      isPast: false,
      isToday: false,
    })
  }

  return days
})

const monthLabel = computed(() => {
  return `${currentYear.value}年${currentMonth.value + 1}月`
})

const canGoPrev = computed(() => {
  return currentYear.value > today.getFullYear() ||
    (currentYear.value === today.getFullYear() && currentMonth.value > today.getMonth())
})

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function prevMonth() {
  if (!canGoPrev.value) return
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

function nextMonth() {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

function selectDay(day: { date: string; isCurrentMonth: boolean; isPast: boolean }) {
  if (!day.isCurrentMonth || day.isPast) return
  emit('update:modelValue', day.date)
}
</script>

<template>
  <div class="w-full">
    <div class="flex items-center justify-between mb-4">
      <button
        @click="prevMonth"
        :disabled="!canGoPrev"
        class="w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200"
        :class="canGoPrev ? 'text-navy-500 hover:bg-navy-50 hover:text-gold-400' : 'text-ivory-300 cursor-not-allowed'"
      >
        <ChevronLeft :size="18" />
      </button>
      <span class="font-display text-lg font-semibold text-navy-500 tracking-wide">
        {{ monthLabel }}
      </span>
      <button
        @click="nextMonth"
        class="w-9 h-9 flex items-center justify-center rounded-full text-navy-500 hover:bg-navy-50 hover:text-gold-400 transition-all duration-200"
      >
        <ChevronRight :size="18" />
      </button>
    </div>

    <div class="grid grid-cols-7 gap-1 mb-2">
      <div
        v-for="day in WEEKDAYS"
        :key="day"
        class="text-center text-xs font-medium text-navy-200 py-1"
      >
        {{ day }}
      </div>
    </div>

    <div class="grid grid-cols-7 gap-1">
      <button
        v-for="(day, idx) in calendarDays"
        :key="idx"
        @click="selectDay(day)"
        class="relative aspect-square flex items-center justify-center text-sm rounded-lg transition-all duration-200"
        :class="{
          'text-ivory-300 cursor-not-allowed': !day.isCurrentMonth || day.isPast,
          'text-navy-300 hover:bg-gold-50 hover:text-gold-500 cursor-pointer': day.isCurrentMonth && !day.isPast && modelValue !== day.date,
          'bg-navy-500 text-white font-semibold shadow-md shadow-navy-500/20': modelValue === day.date,
          'ring-2 ring-gold-400 ring-offset-2 ring-offset-ivory-100': day.isToday && modelValue !== day.date,
        }"
        :disabled="!day.isCurrentMonth || day.isPast"
      >
        {{ day.day }}
        <span
          v-if="day.isToday"
          class="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
          :class="modelValue === day.date ? 'bg-white' : 'bg-gold-400'"
        />
      </button>
    </div>
  </div>
</template>
