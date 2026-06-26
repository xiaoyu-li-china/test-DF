<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  CheckCircle2,
  FileText,
  Clock,
  Mail,
  ArrowLeft,
  Download,
  Send,
  Loader2,
  Eye,
} from 'lucide-vue-next'
import { resendEmail } from '@/mock/api'

const route = useRoute()
const router = useRouter()

const message = computed(() => (route.query.message as string) || '申请已受理')
const estimatedDays = computed(() => (route.query.estimatedDays as string) || '1-3 个工作日')
const applicationNo = computed(() => (route.query.applicationNo as string) || '')
const pdfUrl = computed(() => (route.query.pdfUrl as string) || '')
const email = computed(() => (route.query.email as string) || '')

const resending = ref(false)
const resendSuccess = ref(false)

const goBack = () => {
  router.push('/')
}

const handleResend = async () => {
  resending.value = true
  try {
    await resendEmail(email.value, applicationNo.value)
    resendSuccess.value = true
    setTimeout(() => {
      resendSuccess.value = false
    }, 3000)
  } finally {
    resending.value = false
  }
}

const maskedEmail = computed(() => {
  if (!email.value) return ''
  const [name, domain] = email.value.split('@')
  if (!name || !domain) return email.value
  const maskedName = name.length > 2
    ? name.slice(0, 2) + '***'
    : name + '***'
  return `${maskedName}@${domain}`
})
</script>

<template>
  <div class="min-h-screen bg-inn-cream flex flex-col">
    <header class="bg-inn-brown text-white px-6 py-8 animate-fade-in-up">
      <div class="max-w-lg mx-auto text-center">
        <div class="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-4 animate-scale-in">
          <CheckCircle2 class="w-12 h-12 text-white" />
        </div>
        <h1 class="font-serif-sc text-2xl font-bold mb-1">{{ message }}</h1>
        <p class="text-white/80 text-sm">申请单号：{{ applicationNo }}</p>
      </div>
    </header>

    <main class="flex-1 max-w-lg mx-auto w-full px-4 py-6 safe-bottom">
      <div class="bg-white rounded-2xl p-6 shadow-sm animate-fade-in-up delay-100 mb-6">
        <div class="flex items-start gap-4">
          <div class="w-10 h-10 bg-inn-brown/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Clock class="w-5 h-5 text-inn-brown" />
          </div>
          <div>
            <h3 class="font-medium text-inn-dark mb-1">预计开具时间</h3>
            <p class="text-lg font-bold text-inn-brown font-serif-sc">{{ estimatedDays }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl p-6 shadow-sm animate-fade-in-up delay-200 mb-6">
        <h3 class="font-medium text-inn-dark mb-4 flex items-center gap-2">
          <FileText class="w-5 h-5 text-inn-brown" />
          温馨提示
        </h3>
        <ul class="space-y-3 text-sm text-gray-600">
          <li class="flex items-start gap-3">
            <span class="w-1.5 h-1.5 bg-inn-gold rounded-full mt-2 flex-shrink-0"></span>
            <span>电子发票开具后将自动发送至您填写的邮箱</span>
          </li>
          <li class="flex items-start gap-3">
            <span class="w-1.5 h-1.5 bg-inn-gold rounded-full mt-2 flex-shrink-0"></span>
            <span>节假日及高峰期开具时间可能略有延迟</span>
          </li>
          <li class="flex items-start gap-3">
            <span class="w-1.5 h-1.5 bg-inn-gold rounded-full mt-2 flex-shrink-0"></span>
            <span>如超过预计时间未收到，请联系前台处理</span>
          </li>
        </ul>
      </div>

      <div class="bg-inn-gold/10 rounded-2xl p-5 animate-fade-in-up delay-300 mb-6">
        <div class="flex items-start gap-4">
          <div class="w-10 h-10 bg-inn-gold/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Mail class="w-5 h-5 text-inn-brown" />
          </div>
          <div class="flex-1">
            <h3 class="font-medium text-inn-dark mb-1">发票将发送至</h3>
            <p class="text-sm text-gray-600 mb-3">{{ maskedEmail }}</p>
            <button
              type="button"
              @click="handleResend"
              :disabled="resending || resendSuccess"
              class="text-sm text-inn-brown hover:text-inn-brown-dark font-medium flex items-center gap-1.5
                     disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              <template v-if="resending">
                <Loader2 class="w-4 h-4 animate-spin" />
                <span>发送中...</span>
              </template>
              <template v-else-if="resendSuccess">
                <CheckCircle2 class="w-4 h-4 text-green-600" />
                <span class="text-green-600">已重新发送</span>
              </template>
              <template v-else>
                <Send class="w-4 h-4" />
                <span>重新发送邮件</span>
              </template>
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="pdfUrl"
        class="bg-white rounded-2xl p-6 shadow-sm animate-fade-in-up mb-6"
      >
        <h3 class="font-medium text-inn-dark mb-4 flex items-center gap-2">
          <Eye class="w-5 h-5 text-inn-brown" />
          发票预览
        </h3>
        <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 bg-inn-brown/10 rounded-lg flex items-center justify-center">
                <FileText class="w-6 h-6 text-inn-brown" />
              </div>
              <div>
                <p class="font-medium text-inn-dark">电子发票.pdf</p>
                <p class="text-xs text-gray-500">开具后可查看完整内容</p>
              </div>
            </div>
            <a
              :href="pdfUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-1.5 text-sm text-inn-brown hover:text-inn-brown-dark font-medium transition-colors"
            >
              <Download class="w-4 h-4" />
              <span>预览</span>
            </a>
          </div>
        </div>
      </div>

      <button
        type="button"
        @click="goBack"
        class="w-full h-12 bg-transparent border-2 border-inn-brown text-inn-brown rounded-xl font-medium text-base
               hover:bg-inn-brown hover:text-white active:bg-inn-brown-dark active:text-white
               transition-colors duration-200 flex items-center justify-center gap-2
               min-h-[48px] animate-fade-in-up delay-400"
      >
        <ArrowLeft class="w-5 h-5" />
        <span>返回申请页</span>
      </button>
    </main>
  </div>
</template>
