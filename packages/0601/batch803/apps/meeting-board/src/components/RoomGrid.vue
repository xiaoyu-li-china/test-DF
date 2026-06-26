<template>
  <div class="room-grid">
    <RoomCard v-for="room in rooms" :key="room.id" :room="room" @click="handleClick" />
  </div>
</template>

<script setup lang="ts">
import type { Room } from '../types'
import RoomCard from './RoomCard.vue'

defineProps<{
  rooms: Room[]
}>()

const emit = defineEmits<{
  cardClick: [room: Room]
}>()

function handleClick(room: Room) {
  emit('cardClick', room)
}
</script>

<style scoped>
.room-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  padding: 24px;
  flex: 1;
  align-content: start;
}
</style>
