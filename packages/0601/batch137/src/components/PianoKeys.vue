<script setup lang="ts">
defineProps<{
  white?: boolean
}>()
</script>

<template>
  <div class="flex justify-center gap-0.5 select-none" aria-hidden="true">
    <template v-for="i in 14" :key="'w' + i">
      <div class="relative">
        <div
          class="w-5 h-16 sm:w-7 sm:h-20 rounded-b-sm border border-navy-100/30 shadow-sm"
          :class="white ? 'bg-ivory-100/40' : 'bg-white/90'"
        />
        <div
          v-if="![2, 5, 9, 12].includes(i)"
          class="absolute -left-1.5 top-0 w-3 h-10 sm:w-4 sm:h-12 rounded-b-sm z-10 shadow-md"
          :class="white ? 'bg-navy-500/30' : 'bg-navy-800'"
        />
      </div>
    </template>
  </div>
</template>
