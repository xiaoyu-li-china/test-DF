<script setup lang="ts">
import { MapPin } from 'lucide-vue-next'

const city = defineModel<string>('city', { required: true })
const district = defineModel<string>('district', { required: true })
const address = defineModel<string>('address', { required: true })
</script>

<template>
  <div class="w-full space-y-4">
    <div class="flex items-center gap-2 mb-1">
      <MapPin :size="16" class="text-gold-400" />
      <span class="text-sm font-medium text-navy-400">上门地址</span>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="relative">
        <input
          v-model="city"
          type="text"
          placeholder="城市"
          class="w-full px-4 py-3 bg-white/70 border-b-2 border-ivory-300 focus:border-gold-400 outline-none text-navy-500 placeholder:text-navy-200 transition-colors duration-300 rounded-t-lg"
        />
      </div>
      <div class="relative">
        <input
          v-model="district"
          type="text"
          placeholder="区域"
          class="w-full px-4 py-3 bg-white/70 border-b-2 border-ivory-300 focus:border-gold-400 outline-none text-navy-500 placeholder:text-navy-200 transition-colors duration-300 rounded-t-lg"
        />
      </div>
    </div>

    <div class="relative">
      <input
        v-model="address"
        type="text"
        placeholder="详细地址（街道、小区、楼栋门牌号）"
        class="w-full px-4 py-3 bg-white/70 border-b-2 border-ivory-300 focus:border-gold-400 outline-none text-navy-500 placeholder:text-navy-200 transition-colors duration-300 rounded-t-lg"
      />
    </div>
  </div>
</template>
