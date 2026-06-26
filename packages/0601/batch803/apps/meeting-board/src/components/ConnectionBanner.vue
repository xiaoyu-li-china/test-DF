<template>
  <Transition name="banner">
    <div v-if="!connected" class="connection-banner">
      <span class="banner-icon">⚠️</span>
      <span class="banner-text">连接中断</span>
      <span class="banner-hint">正在尝试重新连接…</span>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{
  connected: boolean
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
