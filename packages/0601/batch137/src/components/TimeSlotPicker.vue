<script setup lang="ts">
import type { TimeSlot } from '@/lib/types'
import { Clock } from 'lucide-vue-next'

defineProps<{
  slots: TimeSlot[]
  modelValue: string | null
  disabled: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

function selectSlot(slot: TimeSlot) {
  if (!slot.available) return
  emit('update:modelValue', slot.id)
}
</script>

<template>
  <div class="w-full">
    <div class="flex items-center gap-2 mb-3">
      <Clock :size="16" class="text-gold-400" />
      <span class="text-sm font-medium text-navy-400">选择时段</span>
    </div>

    <div v-if="disabled" class="text-sm text-navy-200 italic py-2">
      请先选择日期
    </div>

    <div v-else class="flex gap-3">
      <button
        v-for="slot in slots"
        :key="slot.id"
        @click="selectSlot(slot)"
        :disabled="!slot.available"
        class="flex-1 py-3 px-2 rounded-xl text-sm font-medium transition-all duration-300 border-2"
        :class="{
          'border-ivory-300 bg-ivory-100 text-ivory-300 cursor-not-allowed': !slot.available,
          'border-gold-200 bg-gold-50 text-navy-500 hover:border-gold-400 hover:shadow-md hover:shadow-gold-100 cursor-pointer': slot.available && modelValue !== slot.id,
          'border-navy-500 bg-navy-500 text-white shadow-lg shadow-navy-500/25 scale-105': modelValue === slot.id,
        }"
      >
        <div class="font-semibold">{{ slot.label }}</div>
        <div class="text-xs mt-0.5 opacity-70">{{ slot.startTime }}-{{ slot.endTime }}</div>
      </button>
    </div>
  </div>
</template>
