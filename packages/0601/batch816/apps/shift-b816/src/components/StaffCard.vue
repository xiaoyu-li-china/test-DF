<script setup lang="ts">
import { computed } from 'vue'
import { useShiftStore } from '@/stores/shiftStore'
import type { ShiftType } from '@/services/types'

const props = defineProps<{
  staffId: string
  shiftType: ShiftType
  label: string
  isConflict: boolean
}>()

const store = useShiftStore()

const staff = computed(() => store.getStaffById(props.staffId))

const typeColors: Record<string, string> = {
  morning: 'text-[#00d68f] bg-[#00d68f]/10',
  afternoon: 'text-[#3b82f6] bg-[#3b82f6]/10',
  night: 'text-[#a855f7] bg-[#a855f7]/10',
  off: 'text-[#6b7280] bg-[#6b7280]/10',
}
</script>

<template>
  <div
    v-if="staff"
    class="flex items-center gap-1.5 px-1.5 py-0.5 rounded transition-all duration-200 hover:-translate-y-px hover:shadow-md cursor-default group"
    :class="isConflict ? 'bg-[#ff4757]/10' : ''"
  >
    <img
      :src="staff.avatar"
      :alt="staff.name"
      class="w-5 h-5 rounded-full border border-[#3a4170] flex-shrink-0"
    />
    <span
      class="text-[11px] truncate max-w-[60px] group-hover:text-white transition-colors"
      :class="isConflict ? 'text-[#ff4757]' : 'text-[#c5cae0]'"
    >
      {{ staff.name }}
    </span>
    <span
      class="text-[9px] px-1 py-0.5 rounded font-medium flex-shrink-0"
      :class="typeColors[shiftType]"
    >
      {{ label }}
    </span>
  </div>
</template>
