<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-3 flex items-center gap-3 h-16">
    <div
      class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
      :class="avatarColor"
    >
      {{ initials }}
    </div>
    <div class="flex-1 min-w-0">
      <div class="font-medium text-gray-900 text-sm truncate">{{ staff.name }}</div>
      <div class="text-xs text-gray-500 truncate">{{ staff.position }} · {{ staff.department }}</div>
    </div>
    <div v-if="hasConflict" class="flex items-center gap-1">
      <span class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
      <span class="text-xs text-red-600 font-medium">{{ conflictCount }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Staff } from '../types'

interface Props {
  staff: Staff
  hasConflict?: boolean
  conflictCount?: number
}

const props = withDefaults(defineProps<Props>(), {
  hasConflict: false,
  conflictCount: 0,
})

const avatarColors = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-red-500',
]

const avatarColor = computed(() => {
  const index = props.staff.id.charCodeAt(props.staff.id.length - 1) % avatarColors.length
  return avatarColors[index]
})

const initials = computed(() => {
  return props.staff.name.slice(0, 1)
})
</script>
