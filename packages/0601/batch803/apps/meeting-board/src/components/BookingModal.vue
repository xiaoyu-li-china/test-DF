<template>
  <Transition name="modal">
    <div v-if="visible" class="modal-overlay" @click.self="handleClose">
      <div class="modal-container">
        <div class="modal-header">
          <h2 class="modal-title">
            <span>{{ room?.name }} 会议室</span>
            <span class="modal-subtitle">{{ room?.floor }}F · 容纳 {{ room?.capacity }} 人</span>
          </h2>
          <button class="close-btn" @click="handleClose">×</button>
        </div>
        <div class="modal-body">
          <div class="date-label">今日预订 · {{ today }}</div>
          <div class="booking-list">
            <div v-for="booking in bookings" :key="booking.id" class="booking-item">
              <div class="booking-time">
                <span class="time-start">{{ booking.startTime }}</span>
                <span class="time-sep">—</span>
                <span class="time-end">{{ booking.endTime }}</span>
              </div>
              <div class="booking-info">
                <div class="booking-title">{{ booking.title }}</div>
                <div class="booking-organizer">
                  <span class="label">组织者：</span>{{ booking.organizer }}
                </div>
                <div class="booking-attendees">
                  <span class="label">参会人：</span>
                  <span class="attendees">
                    <span
                      v-for="(name, idx) in booking.attendees"
                      :key="idx"
                      class="attendee-tag"
                    >
                      {{ name }}
                    </span>
                  </span>
                </div>
              </div>
            </div>
            <div v-if="bookings.length === 0" class="empty-state">
              今日暂无预订
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Room, Booking } from '../types'

const props = defineProps<{
  visible: boolean
  room: Room | null
  bookings: Booking[]
}>()

const emit = defineEmits<{
  close: []
}>()

const today = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})

function handleClose() {
  emit('close')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 1920px;
  height: 1080px;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-container {
  width: 640px;
  max-height: 720px;
  background: #1e2330;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.modal-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #ecf0f1;
}

.modal-subtitle {
  font-size: 13px;
  font-weight: 400;
  color: #95a5a6;
}

.close-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.06);
  color: #bdc3c7;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(231, 76, 60, 0.2);
  color: #e74c3c;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.date-label {
  font-size: 14px;
  color: #3498db;
  font-weight: 600;
  margin-bottom: 16px;
}

.booking-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.booking-item {
  display: flex;
  gap: 20px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 10px;
  border-left: 3px solid #3498db;
}

.booking-time {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 80px;
  padding-top: 2px;
}

.time-start,
.time-end {
  font-size: 14px;
  font-weight: 600;
  color: #ecf0f1;
}

.time-sep {
  font-size: 12px;
  color: #7f8c8d;
}

.booking-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.booking-title {
  font-size: 16px;
  font-weight: 600;
  color: #ecf0f1;
}

.booking-organizer,
.booking-attendees {
  font-size: 13px;
  color: #bdc3c7;
  display: flex;
  gap: 4px;
  align-items: flex-start;
}

.label {
  color: #7f8c8d;
  flex-shrink: 0;
}

.attendees {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.attendee-tag {
  background: rgba(52, 152, 219, 0.15);
  color: #3498db;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
}

.empty-state {
  text-align: center;
  padding: 40px 0;
  color: #7f8c8d;
  font-size: 14px;
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95) translateY(10px);
  opacity: 0;
}
</style>
