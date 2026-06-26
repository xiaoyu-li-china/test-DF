<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="visible"
        class="fixed inset-0 z-50 flex items-center justify-center"
        @click.self="handleClose"
      >
        <div class="absolute inset-0 bg-black bg-opacity-50" @click="handleClose"></div>

        <div
          class="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col"
          @click.stop
        >
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h3 class="text-lg font-semibold text-gray-800">导出排班数据</h3>
              <p class="text-sm text-gray-500 mt-1">
                当前筛选：{{ currentDept || '全部科室' }} · 共 {{ rows.length }} 条记录
              </p>
            </div>
            <button
              class="text-gray-400 hover:text-gray-600 transition-colors p-1"
              @click="handleClose"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <div class="flex-1 overflow-auto p-6">
            <div class="mb-4 flex items-center justify-between">
              <div class="text-sm text-gray-600">
                预览列表（前 50 条）
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-gray-500">显示字段：</span>
                <span
                  v-for="header in visibleHeaders"
                  :key="header"
                  class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                >
                  {{ header }}
                </span>
              </div>
            </div>

            <div class="overflow-x-auto border border-gray-200 rounded-lg">
              <table class="min-w-full text-sm">
                <thead class="bg-gray-50">
                  <tr>
                    <th
                      v-for="header in headers"
                      :key="header"
                      class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200"
                    >
                      {{ header }}
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="(row, index) in displayRows" :key="index" class="hover:bg-gray-50">
                    <td
                      v-for="header in headers"
                      :key="header"
                      class="px-4 py-2 text-sm text-gray-700 whitespace-nowrap"
                      :class="{ 'text-red-600 font-medium': row['是否冲突'] === '是' && header === '是否冲突' }"
                    >
                      <span v-if="header === '是否冲突' && row[header] === '是'" class="inline-flex items-center gap-1">
                        <span class="w-2 h-2 bg-red-500 rounded-full"></span>
                        {{ row[header] }}
                      </span>
                      <span v-else>{{ row[header] }}</span>
                    </td>
                  </tr>
                  <tr v-if="rows.length === 0">
                    <td
                      :colspan="headers.length"
                      class="px-4 py-8 text-center text-gray-500"
                    >
                      暂无数据可导出
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-if="rows.length > 50" class="mt-2 text-sm text-gray-500 text-center">
              仅显示前 50 条预览，实际导出包含全部 {{ rows.length }} 条记录
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
            <button
              class="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              @click="handleClose"
            >
              取消
            </button>
            <button
              class="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              :disabled="rows.length === 0 || exporting"
              @click="handleExport"
            >
              <svg v-if="exporting" class="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
              </svg>
              {{ exporting ? '导出中...' : '导出 CSV' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import type { ExportRow } from '../utils/csvExport'
import { rowsToCSV, downloadCSV, generateFilename } from '../utils/csvExport'

interface Props {
  visible: boolean
  rows: ExportRow[]
  currentDept: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'close'): void
  (e: 'exported'): void
}>()

const exporting = ref(false)

const headers = computed<(keyof ExportRow)[]>(() => {
  if (props.rows.length === 0) {
    return ['员工姓名', '科室', '职位', '日期', '班次类型', '开始时间', '结束时间', '时长', '是否冲突', '冲突描述']
  }
  return Object.keys(props.rows[0]) as (keyof ExportRow)[]
})

const visibleHeaders = computed(() => headers.value.slice(0, 6))

const displayRows = computed(() => props.rows.slice(0, 50))

function handleClose() {
  emit('update:visible', false)
  emit('close')
}

function handleEscKey(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.visible) {
    event.preventDefault()
    event.stopPropagation()
    handleClose()
  }
}

async function handleExport() {
  if (exporting.value || props.rows.length === 0) {
    return
  }

  exporting.value = true
  try {
    const csv = rowsToCSV(props.rows)
    const filename = generateFilename(props.currentDept)
    downloadCSV(csv, filename)
    emit('exported')
    setTimeout(() => {
      handleClose()
    }, 500)
  } catch (e) {
    console.error('导出失败:', e)
  } finally {
    exporting.value = false
  }
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  }
)

onMounted(() => {
  window.addEventListener('keydown', handleEscKey, true)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleEscKey, true)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
}

.modal-enter-to .relative,
.modal-leave-from .relative {
  transform: scale(1);
}
</style>
