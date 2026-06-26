<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAppointmentDetail } from '@/lib/mockApi'
import type { AppointmentDetail } from '@/lib/types'
import PianoKeys from '@/components/PianoKeys.vue'
import { CheckCircle, Copy, Home, Music } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const detail = ref<AppointmentDetail | null>(null)
const copied = ref(false)
const appointmentId = computed(() => (route.query.id as string) || '')

onMounted(() => {
  if (appointmentId.value) {
    detail.value = getAppointmentDetail(appointmentId.value)
  }
})

function copyId() {
  if (!appointmentId.value) return
  navigator.clipboard.writeText(appointmentId.value).then(() => {
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  })
}

function goHome() {
  router.push({ name: 'home' })
}

const formattedDate = computed(() => {
  if (!detail.value) return ''
  const [y, m, d] = detail.value.date.split('-')
  return `${y}年${parseInt(m)}月${parseInt(d)}日`
})
</script>

<template>
  <div class="min-h-screen py-8 px-4" style="padding-bottom: calc(4rem + env(safe-area-inset-bottom, 0px));">
    <div class="max-w-xl mx-auto">
      <header class="text-center mb-8 animate-fade-in-up">
        <div class="flex items-center justify-center gap-2 mb-2">
          <Music :size="24" class="text-gold-400" />
          <h1 class="font-display text-3xl font-bold text-navy-500 tracking-wide">
            Piano Tuner
          </h1>
        </div>
        <p class="text-navy-300 text-sm font-light">专业钢琴调音 · 上门服务预约</p>
        <div class="mt-4">
          <PianoKeys />
        </div>
      </header>

      <div v-if="detail" class="bg-white/60 backdrop-blur-sm rounded-2xl shadow-xl shadow-navy-500/5 border border-ivory-300/50 overflow-hidden animate-fade-in-up">
        <div class="bg-gradient-to-r from-navy-500 to-navy-400 px-6 py-8 text-center">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/15 mb-4">
            <CheckCircle :size="36" class="text-gold-300" />
          </div>
          <h2 class="font-display text-2xl text-white font-bold mb-1">预约成功</h2>
          <p class="text-navy-100 text-sm">您的调音预约已确认</p>
        </div>

        <div class="p-6 space-y-5">
          <div class="text-center py-4 bg-ivory-100/60 rounded-xl">
            <p class="text-xs text-navy-300 mb-1">预约编号</p>
            <p class="font-display text-2xl font-bold animate-shimmer tracking-wider">
              {{ detail.appointmentId }}
            </p>
            <button
              @click="copyId"
              class="mt-2 inline-flex items-center gap-1 text-xs text-navy-300 hover:text-gold-500 transition-colors"
            >
              <Copy :size="12" />
              <span>{{ copied ? '已复制' : '复制编号' }}</span>
            </button>
          </div>

          <div class="space-y-3">
            <div class="flex items-center py-2.5 border-b border-ivory-200">
              <span class="text-sm text-navy-300 w-20 shrink-0">预约日期</span>
              <span class="text-sm font-medium text-navy-500">{{ formattedDate }}</span>
            </div>
            <div class="flex items-center py-2.5 border-b border-ivory-200">
              <span class="text-sm text-navy-300 w-20 shrink-0">预约时段</span>
              <span class="text-sm font-medium text-navy-500">{{ detail.slotLabel }}</span>
            </div>
            <div class="flex items-center py-2.5 border-b border-ivory-200">
              <span class="text-sm text-navy-300 w-20 shrink-0">上门地址</span>
              <span class="text-sm font-medium text-navy-500">{{ detail.city }} {{ detail.district }} {{ detail.address }}</span>
            </div>
            <div class="flex items-center py-2.5 border-b border-ivory-200">
              <span class="text-sm text-navy-300 w-20 shrink-0">钢琴品牌</span>
              <span class="text-sm font-medium text-navy-500">{{ detail.pianoBrand }}</span>
            </div>
            <div class="flex items-center py-2.5 border-b border-ivory-200">
              <span class="text-sm text-navy-300 w-20 shrink-0">联系人</span>
              <span class="text-sm font-medium text-navy-500">{{ detail.name }}</span>
            </div>
            <div class="flex items-center py-2.5">
              <span class="text-sm text-navy-300 w-20 shrink-0">联系电话</span>
              <span class="text-sm font-medium text-navy-500">{{ detail.phone }}</span>
            </div>
          </div>

          <div class="bg-gold-50/60 border border-gold-200/50 rounded-lg p-4 text-xs text-navy-300 leading-relaxed">
            <p>调音师将在预约日当天联系您确认具体上门时间。如需修改或取消预约，请致电 <span class="text-gold-500 font-medium">400-888-6666</span>。</p>
          </div>

          <button
            @click="goHome"
            class="w-full py-3.5 rounded-xl font-semibold text-sm bg-navy-500 text-white shadow-lg shadow-navy-500/30 hover:shadow-xl hover:shadow-navy-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home :size="16" />
            <span>返回首页</span>
          </button>
        </div>
      </div>

      <div v-else class="text-center py-20 animate-fade-in-up">
        <p class="text-navy-300 text-lg mb-4">未找到预约信息</p>
        <button
          @click="goHome"
          class="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-navy-500 text-white font-medium hover:bg-navy-400 transition-colors cursor-pointer"
        >
          <Home :size="16" />
          <span>返回预约</span>
        </button>
      </div>
    </div>
  </div>
</template>
