<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useShiftStore } from '@/stores/shiftStore'
import { useSyncStore } from '@/stores/syncStore'
import { getDepartments } from '@/services/mockApi'
import ShiftGrid from '@/components/ShiftGrid.vue'
import ConflictBanner from '@/components/ConflictBanner.vue'
import ExportModal from '@/components/ExportModal.vue'
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Filter,
  Users,
  Calendar,
  Activity,
  Download,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const shiftStore = useShiftStore()
const syncStore = useSyncStore()

const departments = getDepartments()
const showExportModal = ref(false)

const selectedDept = computed({
  get: () => shiftStore.currentDept,
  set: (val: string) => {
    shiftStore.setDept(val)
    const query: Record<string, string> = {}
    if (val) query.dept = val
    router.replace({ query })
  },
})

const totalStaff = computed(() => shiftStore.filteredStaff.length)
const totalConflicts = computed(() => shiftStore.filteredConflicts.length)
const onlineStaffCount = computed(() =>
  shiftStore.filteredStaff.filter((s) => s.role === '主任' || s.role === '护士长').length
)

watch(
  () => route.query.dept,
  (dept) => {
    if (typeof dept === 'string' && dept !== shiftStore.currentDept) {
      shiftStore.setDept(dept)
    }
  },
  { immediate: true }
)

onMounted(async () => {
  syncStore.initNetworkListeners()
  await shiftStore.fetchData(shiftStore.currentDept || undefined)
  const dept = route.query.dept as string
  if (dept) shiftStore.setDept(dept)
})

onUnmounted(() => {
  syncStore.destroyNetworkListeners()
})
</script>

<template>
  <div class="min-h-screen bg-[#0d1021] text-white flex flex-col" style="min-width: 1440px">
    <Transition name="sync-bar">
      <div
        v-if="!syncStore.isOnline"
        class="sync-interrupt-bar flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#ff4757] via-[#ff6b81] to-[#ff4757] text-white text-sm font-semibold"
      >
        <WifiOff class="w-4 h-4 animate-pulse" />
        <span>同步中断</span>
        <span class="text-white/70 text-xs">— 数据将在重连后自动同步</span>
      </div>
    </Transition>

    <header class="flex items-center justify-between px-6 py-3 bg-[#12162b] border-b border-[#2a3158]">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <Calendar class="w-5 h-5 text-[#00d68f]" />
          <h1 class="text-lg font-bold tracking-wide">排班看板 B816</h1>
        </div>
        <div class="flex items-center gap-1.5">
          <div
            class="w-2 h-2 rounded-full"
            :class="syncStore.isOnline ? 'bg-[#00d68f] shadow-[0_0_6px_#00d68f]' : 'bg-[#ff4757] shadow-[0_0_6px_#ff4757] animate-pulse'"
          />
          <span class="text-xs" :class="syncStore.isOnline ? 'text-[#00d68f]' : 'text-[#ff4757]'">
            {{ syncStore.syncStatusText }}
          </span>
        </div>
      </div>

      <div class="flex items-center gap-6">
        <div class="flex items-center gap-2 text-xs text-[#8b92a8]">
          <Users class="w-3.5 h-3.5" />
          <span>{{ totalStaff }} 人</span>
        </div>
        <div class="flex items-center gap-2 text-xs" :class="totalConflicts > 0 ? 'text-[#ff4757]' : 'text-[#8b92a8]'">
          <Activity class="w-3.5 h-3.5" />
          <span>{{ totalConflicts }} 冲突</span>
        </div>

        <div class="relative">
          <Filter class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8b92a8] pointer-events-none" />
          <select
            v-model="selectedDept"
            class="appearance-none bg-[#1e2440] border border-[#3a4170] rounded-lg pl-8 pr-8 py-1.5 text-sm text-[#c5cae0] focus:outline-none focus:border-[#00d68f]/50 cursor-pointer transition-colors"
          >
            <option value="">全部科室</option>
            <option v-for="dept in departments" :key="dept" :value="dept">{{ dept }}</option>
          </select>
        </div>

        <button
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e2440] border border-[#3a4170] text-xs text-[#8b92a8] hover:text-[#c5cae0] hover:border-[#00d68f]/30 transition-all"
          @click="shiftStore.fetchData(shiftStore.currentDept || undefined)"
        >
          <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': shiftStore.loading }" />
          刷新
        </button>

        <button
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00d68f]/10 border border-[#00d68f]/20 text-xs text-[#00d68f] hover:bg-[#00d68f]/20 transition-all"
          @click="showExportModal = true"
        >
          <Download class="w-3.5 h-3.5" />
          导出 CSV
        </button>
      </div>
    </header>

    <main class="flex-1 flex flex-col p-4 overflow-hidden">
      <ConflictBanner />

      <div class="flex-1 rounded-lg overflow-hidden">
        <ShiftGrid />
      </div>
    </main>

    <footer class="flex items-center justify-between px-6 py-2 bg-[#12162b] border-t border-[#2a3158] text-[10px] text-[#4b5563]">
      <span>Shift Board B816 · 1440×900</span>
      <span>
        <template v-if="syncStore.isOnline">
          <Wifi class="w-3 h-3 inline text-[#00d68f] mr-1" />
          最后同步 {{ new Date(syncStore.lastSyncTime).toLocaleTimeString() }}
        </template>
        <template v-else>
          <WifiOff class="w-3 h-3 inline text-[#ff4757] mr-1" />
          离线 · 等待 {{ syncStore.pendingUpdates.length }} 条更新
        </template>
      </span>
    </footer>

    <ExportModal v-if="showExportModal" @close="showExportModal = false" />
  </div>
</template>

<style scoped>
.sync-interrupt-bar {
  animation: bar-glow 2s ease-in-out infinite;
}

@keyframes bar-glow {
  0%, 100% { opacity: 0.95; }
  50% { opacity: 1; filter: brightness(1.15); }
}

.sync-bar-enter-active,
.sync-bar-leave-active {
  transition: all 0.3s ease;
}
.sync-bar-enter-from,
.sync-bar-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}
</style>
