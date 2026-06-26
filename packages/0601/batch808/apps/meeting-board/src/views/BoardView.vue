<template>
  <div class="board">
    <ConnectionBanner :connected="store.connected" :queue-length="store.queueLength" />
    <header class="board-header">
      <h1 class="title">会议室占用看板</h1>
      <div class="stats">
        <span class="stat idle-stat">空闲 {{ store.idleCount }}</span>
        <span class="stat occupied-stat">占用 {{ store.occupiedCount }}</span>
        <span class="stat total-stat">共 {{ store.filteredRooms.length }} 间</span>
      </div>
      <div class="filter-bar">
        <input
          v-model="searchText"
          type="text"
          class="search-input"
          placeholder="搜索会议室..."
          @input="handleSearch"
        />
        <nav class="floor-nav">
          <button
            class="floor-btn"
            :class="{ active: store.filters.floor === null }"
            @click="store.setFloor(null)"
          >
            全部
          </button>
          <button
            v-for="f in store.floors"
            :key="f"
            class="floor-btn"
            :class="{ active: store.filters.floor === f }"
            @click="store.setFloor(f)"
          >
            {{ f }}F
          </button>
        </nav>
        <nav class="status-nav">
          <button
            class="status-btn"
            :class="{ active: store.filters.status === null }"
            @click="store.setStatusFilter(null)"
          >
            全部状态
          </button>
          <button
            class="status-btn idle"
            :class="{ active: store.filters.status === 'idle' }"
            @click="store.setStatusFilter('idle')"
          >
            空闲
          </button>
          <button
            class="status-btn occupied"
            :class="{ active: store.filters.status === 'occupied' }"
            @click="store.setStatusFilter('occupied')"
          >
            占用
          </button>
        </nav>
        <button class="clear-btn" @click="handleClearFilters">
          清除筛选
        </button>
      </div>
    </header>
    <main class="board-main">
      <RoomGrid :rooms="store.filteredRooms" @card-click="handleCardClick" />
    </main>
    <footer class="board-footer">
      <span>数据每 5 秒自动刷新</span>
      <span v-if="store.connected" class="status-dot online"></span>
      <span v-else class="status-dot offline"></span>
    </footer>
    <BookingModal
      :visible="store.modalVisible"
      :room="store.selectedRoom"
      :bookings="store.selectedBookings"
      @close="store.closeModal"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoomStore } from '../stores/room'
import ConnectionBanner from '../components/ConnectionBanner.vue'
import RoomGrid from '../components/RoomGrid.vue'
import BookingModal from '../components/BookingModal.vue'
import type { Room } from '../types'

const store = useRoomStore()
const searchText = ref('')

onMounted(() => {
  const floorParam = new URLSearchParams(window.location.search).get('floor')
  if (floorParam) {
    const floor = Number(floorParam)
    if (!isNaN(floor)) {
      store.setFloor(floor)
    }
  }
  store.connect()
})

onUnmounted(() => {
  store.disconnect()
})

function handleCardClick(room: Room) {
  store.openModal(room.id)
}

function handleSearch() {
  store.setSearchFilter(searchText.value)
}

function handleClearFilters() {
  searchText.value = ''
  store.clearFilters()
}
</script>

<style scoped>
.board {
  width: 1920px;
  height: 1080px;
  background: #0f1319;
  color: #ecf0f1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.board-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 32px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.title {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 2px;
  margin: 0;
  white-space: nowrap;
}

.stats {
  display: flex;
  gap: 20px;
  font-size: 14px;
}

.stat {
  padding: 4px 14px;
  border-radius: 20px;
  font-weight: 600;
}

.idle-stat {
  background: rgba(46, 204, 113, 0.15);
  color: #2ecc71;
}

.occupied-stat {
  background: rgba(231, 76, 60, 0.15);
  color: #e74c3c;
}

.total-stat {
  background: rgba(255, 255, 255, 0.06);
  color: #bdc3c7;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.search-input {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #ecf0f1;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 14px;
  width: 200px;
}

.search-input::placeholder {
  color: #7f8c8d;
}

.floor-nav,
.status-nav {
  display: flex;
  gap: 8px;
}

.floor-btn,
.status-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #bdc3c7;
  padding: 6px 18px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.floor-btn:hover,
.status-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.floor-btn.active {
  background: rgba(52, 152, 219, 0.2);
  border-color: #3498db;
  color: #3498db;
}

.status-btn.active {
  background: rgba(155, 89, 182, 0.2);
  border-color: #9b59b6;
  color: #9b59b6;
}

.status-btn.idle.active {
  background: rgba(46, 204, 113, 0.2);
  border-color: #2ecc71;
  color: #2ecc71;
}

.status-btn.occupied.active {
  background: rgba(231, 76, 60, 0.2);
  border-color: #e74c3c;
  color: #e74c3c;
}

.clear-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #95a5a6;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  margin-left: auto;
  transition: all 0.2s ease;
}

.clear-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #ecf0f1;
}

.board-main {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.board-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  font-size: 12px;
  color: #7f8c8d;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  flex-shrink: 0;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.online {
  background: #2ecc71;
  box-shadow: 0 0 6px #2ecc71;
}

.status-dot.offline {
  background: #e74c3c;
  box-shadow: 0 0 6px #e74c3c;
}
</style>
