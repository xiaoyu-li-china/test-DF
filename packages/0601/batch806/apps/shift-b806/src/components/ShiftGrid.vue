<template>
  <div class="w-full h-full bg-gray-50 rounded-lg border border-gray-200 overflow-hidden flex flex-col" :style="{ maxWidth: '1440px', maxHeight: '900px' }">
    <div class="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
      <div class="flex items-center gap-4">
        <h2 class="text-lg font-semibold text-gray-800">排班看板</h2>
        <span class="text-sm text-gray-500">{{ filteredStaff.length }} 名员工 · {{ dates.length }} 天</span>
      </div>
      <div class="flex items-center gap-2">
        <button
          class="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="store.loading"
          @click="toggleDisconnect"
        >
          {{ store.connectionStatus === 'disconnected' ? '模拟重连' : '模拟断网' }}
        </button>
        <button
          class="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          :disabled="store.loading || store.filteredShifts.length === 0"
          @click="handleOpenExport"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
          </svg>
          导出 CSV
        </button>
        <button
          class="px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          :disabled="store.loading"
          @click="handleRefresh"
        >
          <svg v-if="store.loading" class="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ store.loading ? '加载中...' : '刷新数据' }}
        </button>
      </div>
    </div>

    <div class="flex border-b border-gray-200 bg-gray-100 flex-shrink-0">
      <div class="w-64 flex-shrink-0 border-r border-gray-200 px-4 py-2 text-sm font-medium text-gray-600">
        员工
      </div>
      <div class="flex-1 flex">
        <div
          v-for="date in dates"
          :key="date"
          class="flex-1 border-r border-gray-200 last:border-r-0 px-2 py-2 text-center"
        >
          <div class="text-sm font-medium text-gray-700">{{ formatDate(date) }}</div>
          <div class="text-xs text-gray-500">{{ getDayOfWeek(date) }}</div>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-auto">
      <div v-if="store.loading" class="flex items-center justify-center h-full text-gray-500">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
        加载中...
      </div>
      <div v-else-if="store.error" class="flex items-center justify-center h-full text-red-500">
        {{ store.error }}
        <button
          class="ml-4 text-blue-500 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="store.loading"
          @click="handleRefresh"
        >
          {{ store.loading ? '重试中...' : '重试' }}
        </button>
      </div>
      <div v-else>
        <div
          v-for="staffMember in filteredStaff"
          :key="staffMember.id"
          class="flex border-b border-gray-200 hover:bg-gray-50"
        >
          <div class="w-64 flex-shrink-0 border-r border-gray-200 p-2">
            <StaffCard
              :staff="staffMember"
              :has-conflict="staffHasConflict(staffMember.id)"
              :conflict-count="getStaffConflictCount(staffMember.id)"
            />
          </div>
          <div class="flex-1 flex">
            <div
              v-for="date in dates"
              :key="`${staffMember.id}-${date}`"
              class="flex-1 border-r border-gray-200 last:border-r-0 relative min-h-[80px] p-1"
            >
              <div class="relative w-full h-full">
                <div class="absolute inset-0 grid grid-cols-24 gap-px opacity-30">
                  <div
                    v-for="hour in 24"
                    :key="hour"
                    class="border-l border-gray-300"
                    :class="{ 'bg-red-100': isTimeSlotInConflict(staffMember.id, date, hour - 1) }"
                  ></div>
                </div>
                <div
                  v-for="shift in getShiftsByStaffAndDate(staffMember.id, date)"
                  :key="shift.id"
                  class="absolute top-1 bottom-1 rounded text-xs text-white px-1 py-0.5 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity flex items-center justify-center"
                  :class="getShiftClass(shift)"
                  :style="getShiftStyle(shift)"
                  :title="`${shift.type === 'morning' ? '早班' : shift.type === 'afternoon' ? '中班' : shift.type === 'night' ? '夜班' : '加班'}: ${shift.startTime}:00-${shift.endTime}:00`"
                >
                  {{ shift.startTime }}-{{ shift.endTime }}
                </div>
                <div
                  v-for="conflict in getConflictsByStaffAndDate(staffMember.id, date)"
                  :key="conflict.id"
                  class="absolute top-0 bottom-0 bg-red-500 bg-opacity-30 border-l-2 border-r-2 border-red-500 pointer-events-none"
                  :style="getConflictStyle(conflict)"
                  :title="conflict.description"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-white border-t border-gray-200 px-4 py-2 flex items-center gap-6 text-xs text-gray-600 flex-shrink-0">
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 bg-blue-500 rounded"></span>
        <span>早班</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 bg-green-500 rounded"></span>
        <span>中班</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 bg-purple-700 rounded"></span>
        <span>夜班</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 bg-orange-500 rounded"></span>
        <span>加班</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 bg-red-500 bg-opacity-50 rounded border border-red-500"></span>
        <span>冲突</span>
      </div>
    </div>

    <ExportModal
      v-model:visible="exportModalVisible"
      :rows="exportRows"
      :current-dept="store.currentDept"
      @exported="handleExported"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useShiftStore } from '../stores/shift'
import type { Shift, Conflict } from '../types'
import type { ExportRow } from '../utils/csvExport'
import { generateExportData } from '../utils/csvExport'
import StaffCard from './StaffCard.vue'
import ExportModal from './ExportModal.vue'

const store = useShiftStore()

const filteredStaff = computed(() => store.filteredStaff)
const dates = computed(() => store.dates)

const exportModalVisible = ref(false)

const exportRows = computed<ExportRow[]>(() => {
  return generateExportData(
    store.filteredStaff,
    store.filteredShifts,
    store.filteredConflicts
  )
})

function getShiftsByStaffAndDate(staffId: string, date: string): Shift[] {
  return store.getShiftsByStaffAndDate(staffId, date)
}

function getConflictsByStaffAndDate(staffId: string, date: string): Conflict[] {
  return store.getConflictsByStaffAndDate(staffId, date)
}

function isTimeSlotInConflict(staffId: string, date: string, hour: number): boolean {
  return store.isTimeSlotInConflict(staffId, date, hour)
}

function staffHasConflict(staffId: string): boolean {
  return store.filteredConflicts.some((c) => c.staffId === staffId)
}

function getStaffConflictCount(staffId: string): number {
  return store.filteredConflicts.filter((c) => c.staffId === staffId).length
}

function getShiftClass(shift: Shift): string {
  const hasConflict = store.isTimeSlotInConflict(shift.staffId, shift.date, shift.startTime)
  const baseClass = hasConflict ? 'ring-2 ring-red-500' : ''

  switch (shift.type) {
    case 'morning':
      return `bg-blue-500 ${baseClass}`
    case 'afternoon':
      return `bg-green-500 ${baseClass}`
    case 'night':
      return `bg-purple-700 ${baseClass}`
    case 'overtime':
      return `bg-orange-500 ${baseClass}`
    default:
      return `bg-gray-500 ${baseClass}`
  }
}

function getShiftStyle(shift: Shift) {
  const left = `${(shift.startTime / 24) * 100}%`
  const width = `${((shift.endTime - shift.startTime) / 24) * 100}%`
  return { left, width }
}

function getConflictStyle(conflict: Conflict) {
  const left = `${(conflict.startTime / 24) * 100}%`
  const width = `${((conflict.endTime - conflict.startTime) / 24) * 100}%`
  return { left, width }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}月${day}日`
}

function getDayOfWeek(dateStr: string): string {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const date = new Date(dateStr)
  return days[date.getDay()]
}

function handleRefresh() {
  if (store.loading) {
    return
  }
  store.refreshData()
}

let toggleInProgress = false

function toggleDisconnect() {
  if (toggleInProgress || store.loading) {
    return
  }
  toggleInProgress = true
  try {
    if (store.connectionStatus === 'disconnected') {
      store.forceReconnect()
    } else {
      store.forceDisconnect()
    }
  } finally {
    setTimeout(() => {
      toggleInProgress = false
    }, 300)
  }
}
</script>
