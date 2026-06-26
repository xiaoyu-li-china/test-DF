<template>
  <div class="staff-card" :title="staff?.name">
    <span class="avatar">{{ staff?.avatar }}</span>
    <span class="name">{{ staff?.name }}</span>
    <span class="role">{{ staff?.role }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useShiftStore } from '../stores/shiftStore'

const store = useShiftStore()

const props = defineProps<{
  staffId: string
}>()

const staff = computed(() => store.getStaffById(props.staffId))
</script>

<style scoped>
.staff-card {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 4px;
  background: #e8f0fe;
  font-size: 11px;
  line-height: 1.4;
  cursor: default;
  transition: transform 0.15s;
}

.staff-card:hover {
  transform: scale(1.05);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
}

.avatar {
  font-size: 13px;
}

.name {
  font-weight: 600;
  color: #1a73e8;
}

.role {
  color: #888;
  font-size: 10px;
}
</style>
