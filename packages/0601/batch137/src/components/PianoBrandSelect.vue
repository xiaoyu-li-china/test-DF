<script setup lang="ts">
import { ref, watch } from 'vue'
import type { PianoBrand } from '@/lib/types'
import { getPianoBrands } from '@/lib/mockApi'
import { Music } from 'lucide-vue-next'

const props = defineProps<{
  modelValue: string
  customBrand: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:customBrand': [value: string]
}>()

const brands: PianoBrand[] = getPianoBrands()
const isCustom = ref(false)

watch(() => props.modelValue, (val) => {
  if (val === 'custom') {
    isCustom.value = true
  } else {
    isCustom.value = false
  }
})

function onBrandChange(e: Event) {
  const val = (e.target as HTMLSelectElement).value
  emit('update:modelValue', val)
}
</script>

<template>
  <div class="w-full space-y-3">
    <div class="flex items-center gap-2 mb-1">
      <Music :size="16" class="text-gold-400" />
      <span class="text-sm font-medium text-navy-400">钢琴品牌</span>
    </div>

    <div class="relative">
      <select
        :value="modelValue"
        @change="onBrandChange"
        class="w-full px-4 py-3 bg-white/70 border-b-2 border-ivory-300 focus:border-gold-400 outline-none text-navy-500 transition-colors duration-300 rounded-t-lg appearance-none cursor-pointer"
      >
        <option value="" disabled>请选择钢琴品牌</option>
        <option v-for="brand in brands" :key="brand.id" :value="brand.name">
          {{ brand.name }} — {{ brand.origin }}
        </option>
        <option value="custom">其他品牌（手动输入）</option>
      </select>
      <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-navy-200">
        <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
          <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>

    <transition name="slide-fade">
      <div v-if="isCustom">
        <input
          :value="customBrand"
          @input="emit('update:customBrand', ($event.target as HTMLInputElement).value)"
          type="text"
          placeholder="请输入钢琴品牌名称"
          class="w-full px-4 py-3 bg-white/70 border-b-2 border-ivory-300 focus:border-gold-400 outline-none text-navy-500 placeholder:text-navy-200 transition-colors duration-300 rounded-t-lg"
        />
      </div>
    </transition>
  </div>
</template>

<style scoped>
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}
.slide-fade-leave-active {
  transition: all 0.2s ease-in;
}
.slide-fade-enter-from {
  transform: translateY(-8px);
  opacity: 0;
}
.slide-fade-leave-to {
  transform: translateY(-8px);
  opacity: 0;
}
</style>
