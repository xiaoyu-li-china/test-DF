<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="modal-overlay" @click.self="handleClose">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3 class="modal-title">导出排班数据</h3>
            <button class="close-btn" @click="handleClose">×</button>
          </div>
          <div class="modal-body">
            <div class="export-summary">
              <p>当前筛选：<strong>{{ filterText }}</strong></p>
              <p>共 <strong>{{ totalCount }}</strong> 条排班记录</p>
            </div>
            <div class="preview-box">
              <div class="preview-header">
                <span class="preview-title">数据预览（前 5 条）</span>
              </div>
              <table class="preview-table">
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>班次</th>
                    <th>姓名</th>
                    <th>科室</th>
                    <th>职位</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in previewData" :key="row.id">
                    <td>{{ row.date }}</td>
                    <td>{{ row.slot }}</td>
                    <td>{{ row.staffName }}</td>
                    <td>{{ row.dept }}</td>
                    <td>{{ row.role }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" @click="handleClose">取消</button>
            <button class="btn-primary" @click="handleExport">
              导出 CSV
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import type { Shift } from '../services/mockApi'
import { useShiftStore } from '../stores/shiftStore'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'export'): void
}>()

const store = useShiftStore()

const filterText = computed(() => {
  if (store.currentDept) {
    return store.currentDept
  }
  return '全部科室'
})

const totalCount = computed(() => store.shifts.length)

const previewData = computed(() => {
  return store.shifts.slice(0, 5).map((s) => {
    const staff = store.getStaffById(s.staffId)
    return {
      id: s.id,
      date: s.date,
      slot: s.slot,
      staffName: staff?.name || s.staffId,
      dept: s.dept,
      role: staff?.role || '-',
    }
  })
})

function handleClose() {
  emit('close')
}

function handleExport() {
  emit('export')
  emit('close')
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.visible) {
    handleClose()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-content {
  width: 640px;
  max-width: 90vw;
  max-height: 85vh;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.95);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}

.modal-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.close-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  font-size: 20px;
  color: #999;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f5f5f5;
  color: #666;
}

.modal-body {
  padding: 20px;
  overflow: auto;
  flex: 1;
}

.export-summary {
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 14px;
  color: #555;
}

.export-summary p {
  margin: 4px 0;
}

.export-summary strong {
  color: #1a73e8;
}

.preview-box {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
}

.preview-header {
  padding: 10px 14px;
  background: #f5f7fa;
  border-bottom: 1px solid #e0e0e0;
}

.preview-title {
  font-size: 13px;
  font-weight: 600;
  color: #666;
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.preview-table th,
.preview-table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid #f0f0f0;
}

.preview-table th {
  background: #fafbfc;
  font-weight: 600;
  color: #666;
}

.preview-table td {
  color: #444;
}

.preview-table tr:last-child td {
  border-bottom: none;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid #eee;
}

.btn-secondary,
.btn-primary {
  padding: 8px 20px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  border: 1px solid #ddd;
  background: #fff;
  color: #666;
}

.btn-secondary:hover {
  background: #f5f5f5;
}

.btn-primary {
  border: none;
  background: #1a73e8;
  color: #fff;
}

.btn-primary:hover {
  background: #1557b0;
}
</style>
