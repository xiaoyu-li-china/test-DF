<template>
  <div class="max-w-2xl mx-auto px-4 py-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">无限滚动列表</h1>
      <span class="text-sm text-gray-500">当前第 {{ page }} 页 / 共 {{ totalPages }} 页</span>
    </div>

    <div class="relative">
      <div
        ref="scrollContainerRef"
        @scroll="handleScroll"
        class="h-[600px] overflow-y-auto border border-gray-200 rounded-lg bg-gray-50"
      >
        <div class="space-y-3 p-4">
          <div
            v-for="item in items"
            :key="item.id"
            class="bg-white rounded-lg shadow-sm border border-gray-100 p-4 h-[72px] flex items-center hover:shadow-md transition-shadow"
          >
            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
              {{ item.id }}
            </div>
            <div class="ml-4 flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-800 truncate">{{ item.title }}</p>
              <p class="text-xs text-gray-400 mt-1">{{ item.subtitle }}</p>
            </div>
            <span class="text-xs text-gray-300 shrink-0">{{ item.time }}</span>
          </div>
        </div>

        <div ref="sentinelRef" class="h-1"></div>

        <div class="py-6 text-center text-sm">
          <span v-if="loading" class="text-indigo-500">正在加载...</span>
          <span v-else-if="noMore" class="text-gray-400">没有更多了</span>
        </div>
      </div>

      <button
        v-show="showBackTop"
        @click="scrollToTop"
        class="absolute bottom-4 right-4 w-11 h-11 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:text-indigo-500 hover:border-indigo-200 transition-all active:scale-95"
        type="button"
        aria-label="回到顶部"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="18 15 12 9 6 15"></polyline>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'

interface ListItem {
  id: number
  title: string
  subtitle: string
  time: string
}

const PAGE_SIZE = 20
const TOTAL_ITEMS = 200

const items = ref<ListItem[]>([])
const loading = ref(false)
const noMore = ref(false)
const page = ref(0)
const sentinelRef = ref<HTMLElement | null>(null)
const scrollContainerRef = ref<HTMLElement | null>(null)
const showBackTop = ref(false)

const totalPages = computed(() => Math.ceil(TOTAL_ITEMS / PAGE_SIZE))

let observer: IntersectionObserver | null = null

function formatTime(index: number): string {
  const h = String(8 + Math.floor(index / 6) % 12).padStart(2, '0')
  const m = String((index * 7) % 60).padStart(2, '0')
  return `${h}:${m}`
}

async function fetchPage(pageNum: number): Promise<ListItem[]> {
  await new Promise((r) => setTimeout(r, 800))

  const start = (pageNum - 1) * PAGE_SIZE
  const end = Math.min(start + PAGE_SIZE, TOTAL_ITEMS)
  if (start >= TOTAL_ITEMS) return []

  const result: ListItem[] = []
  for (let i = start; i < end; i++) {
    result.push({
      id: i + 1,
      title: `列表项 #${i + 1} — 数据内容展示`,
      subtitle: `分类标签 · 热度 ${Math.floor(Math.random() * 9999)}`,
      time: formatTime(i),
    })
  }
  return result
}

async function loadMore() {
  if (loading.value || noMore.value) return

  const container = scrollContainerRef.value!
  const prevScrollHeight = container.scrollHeight
  const prevScrollTop = container.scrollTop

  loading.value = true
  page.value += 1

  const newItems = await fetchPage(page.value)
  items.value.push(...newItems)

  if (newItems.length < PAGE_SIZE) {
    noMore.value = true
  }

  loading.value = false

  await nextTick()
  requestAnimationFrame(() => {
    const heightDelta = container.scrollHeight - prevScrollHeight
    if (heightDelta > 0) {
      container.scrollTop = prevScrollTop + heightDelta
    }
  })
}

function handleScroll() {
  const container = scrollContainerRef.value
  if (!container) return
  showBackTop.value = container.scrollTop > 500
}

function scrollToTop() {
  const container = scrollContainerRef.value
  if (!container) return
  container.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  loadMore()

  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        loadMore()
      }
    },
    { root: scrollContainerRef.value, rootMargin: '200px' },
  )

  if (sentinelRef.value) {
    observer.observe(sentinelRef.value)
  }
})

onBeforeUnmount(() => {
  observer?.disconnect()
})
</script>
