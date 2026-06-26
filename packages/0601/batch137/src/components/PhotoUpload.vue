<script setup lang="ts">
import { ref } from 'vue'
import { Camera, Upload, X, Image as ImageIcon, Sparkles } from 'lucide-vue-next'
import { uploadPianoPhoto } from '@/lib/mockApi'
import type { PhotoUploadResponse } from '@/lib/types'

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
  'update:priceEstimate': [value: string]
}>()

const props = defineProps<{
  modelValue: string[]
  priceEstimate?: string
}>()

const isDragging = ref(false)
const isUploading = ref(false)
const uploadedPhotos = ref<{ file: File; preview: string; url: string }[]>([])

function handleDragOver(e: DragEvent) {
  e.preventDefault()
  isDragging.value = true
}

function handleDragLeave(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
}

async function handleDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  const files = e.dataTransfer?.files
  if (files) {
    await handleFiles(Array.from(files))
  }
}

async function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) {
    await handleFiles(Array.from(input.files))
  }
}

async function handleFiles(files: File[]) {
  const imageFiles = files.filter((f) => f.type.startsWith('image/'))

  for (const file of imageFiles) {
    if (uploadedPhotos.value.length >= 3) break

    isUploading.value = true

    const preview = URL.createObjectURL(file)
    const tempIdx = uploadedPhotos.value.length
    uploadedPhotos.value.push({ file, preview, url: '' })

    try {
      const result: PhotoUploadResponse = await uploadPianoPhoto(file)

      uploadedPhotos.value[tempIdx].url = result.url

      const priceEstimates = uploadedPhotos.value
        .map(() => result.priceEstimate)
        .filter(Boolean)

      if (priceEstimates.length > 0) {
        const allEstimates = priceEstimates.map(parseEstimate)
        const min = Math.min(...allEstimates.map((e) => e.min))
        const max = Math.max(...allEstimates.map((e) => e.max))
        emit('update:priceEstimate', `￥${min} - ￥${max}`)
      }

      emit('update:modelValue', uploadedPhotos.value.map((p) => p.url).filter(Boolean))
    } finally {
      isUploading.value = false
    }
  }
}

function parseEstimate(str: string): { min: number; max: number } {
  const match = str.match(/￥(\d+)\s*-\s*￥(\d+)/)
  if (match) {
    return { min: parseInt(match[1]), max: parseInt(match[2]) }
  }
  return { min: 200, max: 300 }
}

function removePhoto(index: number) {
  URL.revokeObjectURL(uploadedPhotos.value[index].preview)
  uploadedPhotos.value.splice(index, 1)
  emit('update:modelValue', uploadedPhotos.value.map((p) => p.url).filter(Boolean))

  if (uploadedPhotos.value.length === 0) {
    emit('update:priceEstimate', '')
  }
}
</script>

<template>
  <div class="w-full space-y-3">
    <div class="flex items-center gap-2 mb-1">
      <Camera :size="16" class="text-gold-400" />
      <span class="text-sm font-medium text-navy-400">钢琴照片（可选，最多3张）</span>
    </div>

    <p class="text-xs text-navy-200 -mt-1">
      上传钢琴照片可辅助我们给出更准确的估价参考
    </p>

    <div v-if="priceEstimate" class="bg-gold-50/60 border border-gold-200/50 rounded-lg p-3 flex items-start gap-2">
      <Sparkles :size="14" class="text-gold-400 shrink-0 mt-0.5" />
      <div>
        <p class="text-xs text-navy-400 font-medium">参考估价</p>
        <p class="text-sm font-bold text-gold-500">{{ priceEstimate }}</p>
        <p class="text-[10px] text-navy-200 mt-0.5">* 最终以调音师现场评估为准</p>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-2">
      <div
        v-for="(photo, idx) in uploadedPhotos"
        :key="idx"
        class="relative aspect-square rounded-lg overflow-hidden bg-ivory-100 group"
      >
        <img
          :src="photo.preview"
          :alt="`钢琴照片 ${idx + 1}`"
          class="w-full h-full object-cover"
        />
        <button
          @click="removePhoto(idx)"
          class="absolute top-1 right-1 w-6 h-6 rounded-full bg-navy-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          <X :size="12" />
        </button>
        <div
          v-if="!photo.url"
          class="absolute inset-0 bg-navy-500/40 flex items-center justify-center"
        >
          <svg class="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </div>

      <label
        v-if="uploadedPhotos.length < 3"
        class="aspect-square rounded-lg border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center cursor-pointer"
        :class="{
          'border-gold-400 bg-gold-50/50 scale-105': isDragging,
          'border-ivory-300 bg-white/50 hover:border-gold-300 hover:bg-gold-50/30': !isDragging,
        }"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        @drop="handleDrop"
      >
        <input
          type="file"
          accept="image/*"
          multiple
          class="hidden"
          @change="handleFileSelect"
          :disabled="isUploading"
        />
        <Upload :size="20" class="text-navy-300 mb-1" />
        <span class="text-xs text-navy-300">
          {{ isUploading ? '上传中...' : '点击或拖拽上传' }}
        </span>
      </label>
    </div>

    <div v-if="uploadedPhotos.length === 0" class="text-center">
      <p class="text-xs text-navy-200 flex items-center justify-center gap-1">
        <ImageIcon :size="12" />
        支持 JPG、PNG 格式，单张不超过 10MB
      </p>
    </div>
  </div>
</template>
