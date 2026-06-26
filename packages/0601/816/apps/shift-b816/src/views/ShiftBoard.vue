<template>
  <div class="board-container">
    <div v-if="store.syncInterrupted" class="sync-banner">
      <span class="sync-icon">🔌</span>
      <span class="sync-text">同步中断 — 数据可能不是最新</span>
      <button class="sync-retry-btn" @click="handleReconnect">重新连接</button>
    </div>

    <header class="board-header">
      <h1 class="board-title">排班看板 B816</h1>
      <div class="header-controls">
        <label class="dept-filter">
          <span>科室筛选：</span>
          <select v-model="selectedDept" @change="onDeptChange" class="dept-select">
            <option value="">全部科室</option>
            <option v-for="dept in store.departments" :key="dept" :value="dept">{{ dept }}</option>
          </select>
        </label>
        <div class="header-actions">
          <button class="action-btn export-btn" @click="showExportDialog = true">
            📥 导出 CSV
          </button>
          <button class="action-btn disconnect-btn" @click="store.disconnect()">
            模拟断线
          </button>
          <span class="status-dot" :class="{ online: store.connected, offline: !store.connected }">
            {{ store.connected ? '在线' : '离线' }}
          </span>
        </div>
      </div>
    </header>

    <ConflictBanner :conflicts="store.conflicts" />

    <div v-if="store.loading" class="loading-overlay">
      <div class="spinner"></div>
      <span>加载中…</span>
    </div>

    <div v-else class="grid-wrapper">
      <ShiftGrid :dates="dates" />
    </div>

    <footer class="board-footer">
      <span>版本 v{{ store.lastVersion }}</span>
      <span v-if="store.currentDept">当前筛选：{{ store.currentDept }}</span>
      <span>共 {{ store.shifts.length }} 条排班</span>
    </footer>

    <ExportDialog
      :visible="showExportDialog"
      @close="showExportDialog = false"
      @export="handleExport"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useShiftStore } from '../stores/shiftStore'
import ShiftGrid from '../components/ShiftGrid.vue'
import ConflictBanner from '../components/ConflictBanner.vue'
import ExportDialog from '../components/ExportDialog.vue'

const store = useShiftStore()

const selectedDept = ref('')
const showExportDialog = ref(false)

const dates = computed(() => {
  const result: string[] = []
  const now = new Date()
  for (let i = 0; i < 7; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() + i)
    result.push(d.toISOString().slice(0, 10))
  }
  return result
})

function onDeptChange() {
  const dept = selectedDept.value || undefined
  store.loadShifts(dept)
  const url = new URL(window.location.href)
  if (selectedDept.value) {
    url.searchParams.set('dept', selectedDept.value)
  } else {
    url.searchParams.delete('dept')
  }
  window.history.replaceState({}, '', url.toString())
}

async function handleReconnect() {
  await store.reconnect()
}

function generateCsv(): string {
  const headers = ['日期', '班次', '姓名', '科室', '职位', '人员ID']
  const rows = store.shifts.map((s) => {
    const staff = store.getStaffById(s.staffId)
    return [
      s.date,
      s.slot,
      staff?.name || s.staffId,
      s.dept,
      staff?.role || '',
      s.staffId,
    ]
  })
  const allRows = [headers, ...rows]
  const BOM = '\uFEFF'
  return BOM + allRows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
}

function handleExport() {
  const csv = generateCsv()
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  const deptPart = store.currentDept ? `_${store.currentDept}` : ''
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  link.setAttribute('href', url)
  link.setAttribute('download', `排班表${deptPart}_${dateStr}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function readDeptFromUrl(): string {
  const params = new URLSearchParams(window.location.search)
  return params.get('dept') || ''
}

onMounted(async () => {
  store.initMeta()
  const dept = readDeptFromUrl()
  selectedDept.value = dept
  await store.loadShifts(dept || undefined)
  store.startPolling(5000)
})

onUnmounted(() => {
  store.stopPolling()
  store.reset()
})
</script>

<style scoped>
.board-container {
  max-width: 1440px;
  min-height: 900px;
  margin: 0 auto;
  padding: 16px 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: #f4f6f9;
  color: #333;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.sync-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 10px 24px;
  background: #d32f2f;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  animation: banner-drop 0.4s ease-out;
  box-shadow: 0 2px 8px rgba(211, 47, 47, 0.4);
}

@keyframes banner-drop {
  from {
    transform: translateY(-100%);
  }
  to {
    transform: translateY(0);
  }
}

.sync-icon {
  font-size: 18px;
}

.sync-text {
  flex: 1;
  text-align: center;
}

.sync-retry-btn {
  padding: 4px 16px;
  border: 1px solid #fff;
  border-radius: 4px;
  background: transparent;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}

.sync-retry-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.board-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid #e0e0e0;
}

.board-title {
  font-size: 22px;
  font-weight: 700;
  color: #1a237e;
  margin: 0;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 20px;
}

.dept-filter {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #555;
}

.dept-select {
  padding: 4px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 13px;
  background: #fff;
  cursor: pointer;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.action-btn {
  padding: 4px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: #fff;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.export-btn:hover {
  background: #e8f0fe;
  border-color: #1a73e8;
  color: #1a73e8;
}

.disconnect-btn:hover {
  background: #ffebee;
  border-color: #e53935;
  color: #c62828;
}

.status-dot {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
}

.status-dot.online {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-dot.offline {
  background: #ffebee;
  color: #c62828;
}

.loading-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 12px;
  color: #999;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e0e0e0;
  border-top-color: #1a73e8;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.grid-wrapper {
  flex: 1;
  overflow: auto;
}

.board-footer {
  display: flex;
  gap: 20px;
  padding-top: 12px;
  margin-top: 12px;
  border-top: 1px solid #e0e0e0;
  font-size: 11px;
  color: #999;
}
</style>
