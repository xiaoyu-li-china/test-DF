<script setup lang="ts">
import { ref, computed } from 'vue'
import { useShiftStore } from '@/stores/shiftStore'
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-vue-next'

const store = useShiftStore()
const expanded = ref(false)

const conflictCount = computed(() => store.filteredConflicts.length)
const hasConflicts = computed(() => conflictCount.value > 0)

const conflictSummary = computed(() => {
  if (!hasConflicts.value) return ''
  const reasons = store.filteredConflicts.map((c) => c.reason)
  const unique = [...new Set(reasons)]
  return expanded.value ? unique.join('；') : unique.slice(0, 2).join('；') + (unique.length > 2 ? '...' : '')
})
</script>

<template>
  <Transition name="banner">
    <div
      v-if="hasConflicts"
      class="conflict-banner rounded-lg mb-2 overflow-hidden"
    >
      <div class="bg-gradient-to-r from-[#ff4757]/20 via-[#ff6b81]/10 to-[#ff4757]/20 border border-[#ff4757]/30 rounded-lg">
        <div
          class="flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none"
          @click="expanded = !expanded"
        >
          <AlertTriangle class="w-4 h-4 text-[#ff4757] flex-shrink-0" />
          <span class="text-[#ff4757] text-sm font-semibold">
            {{ conflictCount }} 个排班冲突
          </span>
          <span class="text-[#ffb3b3] text-xs flex-1 truncate">
            {{ conflictSummary }}
          </span>
          <component
            :is="expanded ? ChevronUp : ChevronDown"
            class="w-3.5 h-3.5 text-[#ff4757]/70 flex-shrink-0 transition-transform"
          />
        </div>
        <Transition name="expand">
          <div v-if="expanded" class="px-4 pb-3">
            <div class="space-y-1.5">
              <div
                v-for="conflict in store.filteredConflicts"
                :key="conflict.id"
                class="flex items-center gap-2 text-xs"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-[#ff4757] flex-shrink-0" />
                <span class="text-[#ffb3b3]">{{ conflict.reason }}</span>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.banner-enter-active,
.banner-leave-active {
  transition: all 0.3s ease;
}
.banner-enter-from,
.banner-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.25s ease;
}
.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>
