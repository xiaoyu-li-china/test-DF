<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useShiftStore } from '@/stores/shiftStore'
import StaffCard from './StaffCard.vue'

const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

const SHIFT_LABELS: Record<string, string> = {
  morning: '早班',
  afternoon: '午班',
  night: '夜班',
  off: '休',
}

const store = useShiftStore()
const { filteredShifts, conflictSet, currentDept } = storeToRefs(store)

const cellCache = ref<Record<string, { shifts: typeof filteredShifts.value; isConflict: boolean }>>({})

function rebuildGrid() {
  const grid: Record<string, { shifts: typeof filteredShifts.value; isConflict: boolean }> = {}
  for (const shift of filteredShifts.value) {
    if (shift.type === 'off') continue
    const key = `${shift.day}-${shift.hour}`
    if (!grid[key]) {
      grid[key] = {
        shifts: [],
        isConflict: conflictSet.value.has(key),
      }
    }
    grid[key].shifts.push(shift)
  }
  cellCache.value = grid
}

watch(
  () => [filteredShifts.value, conflictSet.value],
  () => {
    rebuildGrid()
  },
  { deep: true, immediate: true }
)

watch(
  () => currentDept.value,
  () => {
    cellCache.value = {}
    rebuildGrid()
  }
)

const gridData = computed(() => {
  return cellCache.value
})

function getCellClass(day: number, hour: number): string {
  const key = `${day}-${hour}`
  const cell = cellCache.value[key]
  if (!cell) return 'bg-[#1e2440] border border-[#2a3158]'
  if (cell.isConflict) return 'bg-[#ff4757]/20 border-2 border-[#ff4757] conflict-cell'
  const type = cell.shifts[0]?.type
  if (type === 'morning') return 'bg-[#00d68f]/15 border border-[#00d68f]/30'
  if (type === 'afternoon') return 'bg-[#3b82f6]/15 border border-[#3b82f6]/30'
  if (type === 'night') return 'bg-[#a855f7]/15 border border-[#a855f7]/30'
  return 'bg-[#374151]/30 border border-[#4b5563]/30'
}

onMounted(() => {
  rebuildGrid()
})

onUnmounted(() => {
  cellCache.value = {}
})
</script>

<template>
  <div class="shift-grid flex-1 overflow-auto">
    <table class="w-full border-collapse text-xs">
      <thead>
        <tr>
          <th class="sticky left-0 z-10 bg-[#12162b] text-[#8b92a8] font-medium p-2 w-12 text-center border border-[#2a3158]">
            时段
          </th>
          <th
            v-for="(day, di) in DAYS"
            :key="di"
            class="bg-[#12162b] text-[#c5cae0] font-semibold p-2 text-center border border-[#2a3158] min-w-[165px]"
          >
            {{ day }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="hour in HOURS" :key="hour">
          <td class="sticky left-0 z-10 bg-[#12162b] text-[#8b92a8] p-1 text-center border border-[#2a3158] font-mono text-[10px]">
            {{ String(hour).padStart(2, '0') }}:00
          </td>
          <td
            v-for="day in 7"
            :key="day - 1"
            :class="getCellClass(day - 1, hour)"
            class="p-1 transition-all duration-200 relative"
          >
            <template v-if="gridData[`${day - 1}-${hour}`]">
              <div
                v-for="shift in gridData[`${day - 1}-${hour}`].shifts"
                :key="shift.staffId + shift.type + `-${day - 1}-${hour}`"
                class="mb-0.5 last:mb-0"
              >
                <StaffCard
                  :staff-id="shift.staffId"
                  :shift-type="shift.type"
                  :label="SHIFT_LABELS[shift.type] || ''"
                  :is-conflict="gridData[`${day - 1}-${hour}`].isConflict"
                />
              </div>
            </template>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.conflict-cell {
  animation: pulse-border 2s ease-in-out infinite;
}

@keyframes pulse-border {
  0%, 100% {
    border-color: #ff4757;
    box-shadow: inset 0 0 8px rgba(255, 71, 87, 0.15);
  }
  50% {
    border-color: #ff6b81;
    box-shadow: inset 0 0 16px rgba(255, 71, 87, 0.3);
  }
}
</style>
