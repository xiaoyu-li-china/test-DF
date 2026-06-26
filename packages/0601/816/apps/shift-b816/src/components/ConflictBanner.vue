<template>
  <div v-if="conflicts.length > 0" class="conflict-banner">
    <div class="banner-icon">⚠️</div>
    <div class="banner-body">
      <div class="banner-title">发现 {{ conflicts.length }} 个排班冲突</div>
      <div class="banner-list">
        <div v-for="(c, i) in conflicts" :key="i" class="conflict-item">
          <span class="conflict-type">{{ c.type === 'double_booked' ? '重复排班' : '人员超限' }}</span>
          <span class="conflict-msg">{{ c.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Conflict } from '../services/mockApi'

defineProps<{
  conflicts: Conflict[]
}>()
</script>

<style scoped>
.conflict-banner {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #fff3e0, #ffe0b2);
  border: 1px solid #ffb74d;
  border-radius: 8px;
  margin-bottom: 12px;
  animation: slide-in 0.3s ease-out;
}

@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.banner-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.banner-body {
  flex: 1;
}

.banner-title {
  font-weight: 700;
  font-size: 14px;
  color: #e65100;
  margin-bottom: 6px;
}

.banner-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.conflict-item {
  display: flex;
  gap: 8px;
  font-size: 12px;
  line-height: 1.5;
}

.conflict-type {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 3px;
  background: #e53935;
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  flex-shrink: 0;
  align-self: flex-start;
}

.conflict-msg {
  color: #bf360c;
}
</style>
