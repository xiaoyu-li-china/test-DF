<template>
  <Transition name="banner">
    <div v-if="!connected" class="connection-banner">
      <span class="banner-icon">⚠️</span>
      <span class="banner-text">连接中断</span>
      <span class="banner-hint">正在尝试重新连接…</span>
      <span v-if="queueLength > 0" class="queue-badge">
        {{ queueLength }} 条操作待同步
      </span>
    </div>
    <div v-else-if="queueLength > 0" class="sync-banner">
      <span class="banner-icon">📤</span>
      <span class="banner-text">正在同步</span>
      <span class="banner-hint">{{ queueLength }} 条操作正在同步到服务器…</span>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{
  connected: boolean
  queueLength: number
}>()
</script>

<style scoped>
.connection-banner {
  width: 100%;
  height: 48px;
  background: linear-gradient(90deg, #c0392b, #e74c3c);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  flex-shrink: 0;
}

.sync-banner {
  width: 100%;
  height: 48px;
  background: linear-gradient(90deg, #f39c12, #e67e22);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  flex-shrink: 0;
}

.banner-icon {
  font-size: 20px;
}

.banner-text {
  letter-spacing: 2px;
}

.banner-hint {
  font-weight: 400;
  font-size: 13px;
  opacity: 0.85;
}

.queue-badge {
  background: rgba(0, 0, 0, 0.25);
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 13px;
}

.banner-enter-active,
.banner-leave-active {
  transition: all 0.3s ease;
}

.banner-enter-from,
.banner-leave-to {
  height: 0;
  opacity: 0;
}
</style>
