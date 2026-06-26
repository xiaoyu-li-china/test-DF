<template>
  <div class="min-h-screen bg-gray-100 flex flex-col">
    <ConflictBanner />

    <header class="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold text-gray-800">医院排班管理系统</h1>
          <p class="text-sm text-gray-500 mt-1">实时排班看板 · 冲突自动检测</p>
        </div>
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <label class="text-sm font-medium text-gray-600">科室筛选：</label>
            <select
              :value="currentDept || ''"
              @change="handleDeptChange"
              :disabled="store.loading"
              class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">全部科室</option>
              <option v-for="dept in departments" :key="dept" :value="dept">{{ dept }}</option>
            </select>
          </div>
          <div class="flex items-center gap-2">
            <span
              class="w-2 h-2 rounded-full"
              :class="connectionStatus === 'connected' ? 'bg-green-500' : connectionStatus === 'reconnecting' ? 'bg-yellow-500' : 'bg-red-500'"
            ></span>
            <span class="text-sm text-gray-600">{{ statusText }}</span>
          </div>
        </div>
      </div>
    </header>

    <main class="flex-1 p-6 flex items-start justify-center">
      <ShiftGrid />
    </main>

    <footer class="bg-white border-t border-gray-200 px-6 py-3 text-center text-sm text-gray-500">
      <div class="flex items-center justify-center gap-6">
        <span>URL 参数示例: <code class="bg-gray-100 px-2 py-0.5 rounded">?dept=内科</code></span>
        <span v-if="currentDept">当前筛选: <span class="font-medium text-blue-600">{{ currentDept }}</span></span>
        <span>冲突总数: <span class="font-medium text-red-600">{{ conflictCount }}</span></span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useShiftStore } from '../stores/shift'
import ShiftGrid from '../components/ShiftGrid.vue'
import ConflictBanner from '../components/ConflictBanner.vue'

const store = useShiftStore()
const route = useRoute()
const router = useRouter()

const departments = computed(() => store.departments)
const currentDept = computed(() => store.currentDept)
const connectionStatus = computed(() => store.connectionStatus)
const conflictCount = computed(() => store.filteredConflicts.length)

const statusText = computed(() => {
  switch (connectionStatus.value) {
    case 'connected':
      return '在线'
    case 'reconnecting':
      return '重连中...'
    case 'disconnected':
      return '离线'
    default:
      return '未知'
  }
})

function handleDeptChange(event: Event) {
  if (store.loading) {
    return
  }
  const target = event.target as HTMLSelectElement
  const dept = target.value || null
  if (dept === currentDept.value) {
    return
  }
  store.setDepartment(dept)
  updateUrlParam(dept)
}

function updateUrlParam(dept: string | null) {
  const query = { ...route.query }
  if (dept) {
    query.dept = dept
  } else {
    delete query.dept
  }
  router.replace({ query })
}

function initFromUrl() {
  const deptParam = route.query.dept as string | undefined
  if (deptParam && departments.value.includes(deptParam)) {
    store.setDepartment(deptParam)
  } else {
    store.setDepartment(null)
  }
}

onMounted(() => {
  store.init()
  initFromUrl()
})

watch(
  () => route.query.dept,
  (newDept) => {
    if (store.loading) {
      return
    }
    if (newDept !== undefined) {
      const deptStr = String(newDept)
      if (departments.value.includes(deptStr) && deptStr !== currentDept.value) {
        store.setDepartment(deptStr)
      }
    } else if (currentDept.value !== null) {
      store.setDepartment(null)
    }
  }
)
</script>
