<template>
  <div
    class="room-card"
    :class="[room.status, { 'blink-border': isOver15Min }]"
    @click="handleClick"
  >
    <div class="card-header">
      <span class="room-name">{{ room.name }}</span>
      <span class="room-floor">{{ room.floor }}F</span>
    </div>
    <div class="card-body">
      <div class="status-badge" :class="room.status">
        {{ room.status === 'occupied' ? '占用中' : '空闲' }}
      </div>
      <div class="capacity">
        <span class="icon">👥</span>
        {{ room.capacity }}人
      </div>
    </div>
    <div v-if="room.status === 'occupied' && room.meeting" class="card-footer">
      <div class="meeting-name">{{ room.meeting }}</div>
      <div class="meeting-meta">
        <span v-if="room.endTime">预计 {{ room.endTime }} 结束</span>
        <span v-if="occupiedMinutes > 0" class="duration">
          已用 {{ occupiedMinutes }} 分钟
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Room } from '../types'

const props = defineProps<{
  room: Room
}>()

const emit = defineEmits<{
  click: [room: Room]
}>()

const now = Date.now()

const occupiedMinutes = computed(() => {
  if (props.room.status !== 'occupied' || !props.room.occupiedAt) return 0
  return Math.floor((now - props.room.occupiedAt) / 60000)
})

const isOver15Min = computed(() => {
  return props.room.status === 'occupied' && occupiedMinutes.value > 15
})

function handleClick() {
  emit('click', props.room)
}
</script>

<style scoped>
.room-card {
  background: #1a1f2e;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
  min-height: 160px;
  cursor: pointer;
}

.room-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.room-card.idle {
  border-color: #2ecc71;
  background: linear-gradient(135deg, #1a2e1a 0%, #1a1f2e 100%);
}

.room-card.occupied {
  border-color: #e74c3c;
  background: linear-gradient(135deg, #2e1a1a 0%, #1a1f2e 100%);
}

.blink-border {
  animation: blink 1s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.7);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(231, 76, 60, 0);
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.room-name {
  font-size: 22px;
  font-weight: 700;
  color: #ecf0f1;
}

.room-floor {
  font-size: 13px;
  color: #95a5a6;
  background: rgba(255, 255, 255, 0.06);
  padding: 2px 10px;
  border-radius: 20px;
}

.card-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.status-badge {
  font-size: 14px;
  font-weight: 600;
  padding: 4px 14px;
  border-radius: 20px;
}

.status-badge.idle {
  background: rgba(46, 204, 113, 0.18);
  color: #2ecc71;
}

.status-badge.occupied {
  background: rgba(231, 76, 60, 0.18);
  color: #e74c3c;
}

.capacity {
  font-size: 14px;
  color: #bdc3c7;
  display: flex;
  align-items: center;
  gap: 4px;
}

.icon {
  font-size: 16px;
}

.card-footer {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.meeting-name {
  font-size: 14px;
  color: #ecf0f1;
  font-weight: 500;
}

.meeting-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
}

.end-time {
  color: #e67e22;
}

.duration {
  color: #f39c12;
}
</style>
