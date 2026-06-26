<template>
  <div class="shift-grid">
    <div class="grid-header">
      <div class="corner-cell"></div>
      <div v-for="date in dates" :key="date" class="date-cell">
        {{ formatDate(date) }}
      </div>
    </div>
    <div v-for="slot in timeSlots" :key="slot" class="grid-row">
      <div class="slot-cell">{{ slot }}</div>
      <div
        v-for="date in dates"
        :key="`${date}-${slot}`"
        class="shift-cell"
        :class="{ conflict: store.isConflictSlot(date, slot) }"
      >
        <div class="staff-list">
          <StaffCard
            v-for="shift in getShiftsForSlot(date, slot)"
            :key="shift.id"
            :staff-id="shift.staffId"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useShiftStore } from '../stores/shiftStore'
import StaffCard from './StaffCard.vue'

const store = useShiftStore()

const props = defineProps<{
  dates: string[]
}>()

const timeSlots = computed(() => store.timeSlots)

function getShiftsForSlot(date: string, slot: string) {
  return store.shifts.filter((s) => s.date === date && s.slot === slot)
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  return `${d.getMonth() + 1}/${d.getDate()} 周${weekdays[d.getDay()]}`
}
</script>

<style scoped>
.shift-grid {
  display: flex;
  flex-direction: column;
  font-size: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.grid-header {
  display: flex;
  background: #f5f7fa;
  border-bottom: 2px solid #e0e0e0;
}

.corner-cell {
  min-width: 120px;
  padding: 8px;
  font-weight: 600;
  color: #666;
}

.date-cell {
  flex: 1;
  min-width: 110px;
  padding: 8px 4px;
  text-align: center;
  font-weight: 600;
  color: #333;
  border-left: 1px solid #e0e0e0;
}

.grid-row {
  display: flex;
  border-bottom: 1px solid #f0f0f0;
}

.grid-row:last-child {
  border-bottom: none;
}

.slot-cell {
  min-width: 120px;
  padding: 8px;
  font-weight: 500;
  color: #555;
  background: #fafbfc;
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.shift-cell {
  flex: 1;
  min-width: 110px;
  padding: 6px 4px;
  border-left: 1px solid #f0f0f0;
  min-height: 52px;
  transition: background 0.3s;
}

.shift-cell:hover {
  background: #f0f7ff;
}

.shift-cell.conflict {
  background: #fff0f0;
  border-left: 3px solid #e53935;
  animation: pulse-red 2s ease-in-out infinite;
}

@keyframes pulse-red {
  0%, 100% { background: #fff0f0; }
  50% { background: #ffe0e0; }
}

.staff-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
</style>
