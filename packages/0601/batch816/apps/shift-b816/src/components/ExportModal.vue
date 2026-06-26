<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue'
import { useShiftStore } from '@/stores/shiftStore'
import { X, Download } from 'lucide-vue-next'

const emit = defineEmits<{
  close: []
}>()

const store = useShiftStore()

const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const SHIFT_LABELS: Record<string, string> = {
  morning: '早班',
  afternoon: '午班',
  night: '夜班',
  off: '休息',
}

const listRows = computed(() => {
  const rows: { name: string; dept: string; role: string; day: string; shiftType: string; hour: string; conflict: boolean }[] = []
  for (const shift of store.filteredShifts) {
    const staff = store.getStaffById(shift.staffId)
    if (!staff) continue
    rows.push({
      name: staff.name,
      dept: staff.dept,
      role: staff.role,
      day: DAYS[shift.day] || '',
      shiftType: SHIFT_LABELS[shift.type] || shift.type,
      hour: String(shift.hour).padStart(2, '0') + ':00',
      conflict: store.hasConflict(shift.day, shift.hour),
    })
  }
  return rows
})

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

function onMaskClick() {
  emit('close')
}

function exportCSV() {
  const BOM = '\uFEFF'
  const header = '姓名,科室,角色,星期,班次,时段,是否冲突'
  const rows = listRows.value.map((r) =>
    [r.name, r.dept, r.role, r.day, r.shiftType, r.hour, r.conflict ? '是' : '否'].join(',')
  )
  const csv = BOM + header + '\n' + rows.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const dept = store.currentDept || '全部科室'
  a.download = `排班数据_${dept}_${new Date().toLocaleDateString()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center">
      <div
        class="absolute inset-0 bg-black/60 backdrop-blur-sm"
        @click="onMaskClick"
      />
      <div
        class="relative z-10 bg-[#12162b] border border-[#2a3158] rounded-xl shadow-2xl w-[780px] max-h-[640px] flex flex-col"
      >
        <div class="flex items-center justify-between px-5 py-3 border-b border-[#2a3158]">
          <h2 class="text-sm font-semibold text-[#c5cae0]">
            排班数据 · {{ store.currentDept || '全部科室' }}
            <span class="text-[#8b92a8] font-normal ml-2">{{ listRows.length }} 条记录</span>
          </h2>
          <button
            class="p-1 rounded-lg hover:bg-[#1e2440] text-[#8b92a8] hover:text-white transition-colors"
            @click="emit('close')"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="flex-1 overflow-auto px-5 py-3">
          <table class="w-full border-collapse text-xs">
            <thead class="sticky top-0 z-10">
              <tr class="bg-[#0d1021]">
                <th class="text-left p-2 text-[#8b92a8] font-medium border-b border-[#2a3158]">姓名</th>
                <th class="text-left p-2 text-[#8b92a8] font-medium border-b border-[#2a3158]">科室</th>
                <th class="text-left p-2 text-[#8b92a8] font-medium border-b border-[#2a3158]">角色</th>
                <th class="text-left p-2 text-[#8b92a8] font-medium border-b border-[#2a3158]">星期</th>
                <th class="text-left p-2 text-[#8b92a8] font-medium border-b border-[#2a3158]">班次</th>
                <th class="text-left p-2 text-[#8b92a8] font-medium border-b border-[#2a3158]">时段</th>
                <th class="text-center p-2 text-[#8b92a8] font-medium border-b border-[#2a3158]">冲突</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, i) in listRows"
                :key="i"
                class="hover:bg-[#1e2440]/60 transition-colors"
                :class="row.conflict ? 'bg-[#ff4757]/5' : ''"
              >
                <td class="p-2 text-[#c5cae0] border-b border-[#1e2440]">{{ row.name }}</td>
                <td class="p-2 text-[#8b92a8] border-b border-[#1e2440]">{{ row.dept }}</td>
                <td class="p-2 text-[#8b92a8] border-b border-[#1e2440]">{{ row.role }}</td>
                <td class="p-2 text-[#c5cae0] border-b border-[#1e2440]">{{ row.day }}</td>
                <td class="p-2 border-b border-[#1e2440]">
                  <span
                    class="px-1.5 py-0.5 rounded text-[10px] font-medium"
                    :class="{
                      'text-[#00d68f] bg-[#00d68f]/10': row.shiftType === '早班',
                      'text-[#3b82f6] bg-[#3b82f6]/10': row.shiftType === '午班',
                      'text-[#a855f7] bg-[#a855f7]/10': row.shiftType === '夜班',
                      'text-[#6b7280] bg-[#6b7280]/10': row.shiftType === '休息',
                    }"
                  >
                    {{ row.shiftType }}
                  </span>
                </td>
                <td class="p-2 text-[#8b92a8] border-b border-[#1e2440] font-mono">{{ row.hour }}</td>
                <td class="p-2 text-center border-b border-[#1e2440]">
                  <span v-if="row.conflict" class="inline-block w-2 h-2 rounded-full bg-[#ff4757]" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex items-center justify-between px-5 py-3 border-t border-[#2a3158]">
          <span class="text-[10px] text-[#4b5563]">按 Esc 或点击遮罩关闭</span>
          <button
            class="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#00d68f]/15 border border-[#00d68f]/30 text-[#00d68f] text-xs font-medium hover:bg-[#00d68f]/25 transition-all"
            @click="exportCSV"
          >
            <Download class="w-3.5 h-3.5" />
            导出 CSV
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
