<script setup>
import { ref } from 'vue'
import Calendar from './components/Calendar.vue'

const selectedDate = ref(null)
const dateRange = ref({ start: null, end: null })

const handleDateSelect = (date) => {
  selectedDate.value = date
}

const handleRangeSelect = (range) => {
  dateRange.value = range
}

const formatDate = (date) => {
  if (!date) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
</script>

<template>
  <div class="app">
    <h1>Vue 3 日历组件</h1>
    
    <Calendar 
      @date-select="handleDateSelect"
      @range-select="handleRangeSelect"
    />
    
    <div class="info-panel">
      <div class="info-item">
        <strong>选中日期：</strong>
        <span>{{ formatDate(selectedDate) || '未选择' }}</span>
      </div>
      <div class="info-item">
        <strong>日期范围：</strong>
        <span>
          {{ formatDate(dateRange.start) || '未选择' }} 
          {{ dateRange.end ? ' ~ ' + formatDate(dateRange.end) : '' }}
        </span>
      </div>
    </div>
    
    <div class="tips">
      <p>💡 使用提示：</p>
      <ul>
        <li>点击左右箭头切换月份</li>
        <li>点击日期选中（蓝色高亮）</li>
        <li>再次点击另一个日期可选择日期范围</li>
        <li>农历节日用红色标记</li>
        <li>当天有浅蓝色背景高亮</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

h1 {
  color: white;
  margin-bottom: 30px;
  font-size: 28px;
  font-weight: 600;
}

.info-panel {
  margin-top: 20px;
  background: white;
  border-radius: 12px;
  padding: 20px;
  width: 100%;
  max-width: 600px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.info-item {
  padding: 10px 0;
  border-bottom: 1px solid #eee;
  color: #333;
}

.info-item:last-child {
  border-bottom: none;
}

.info-item strong {
  color: #666;
}

.tips {
  margin-top: 20px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  padding: 20px;
  width: 100%;
  max-width: 600px;
}

.tips p {
  margin: 0 0 10px 0;
  font-weight: 600;
  color: #333;
}

.tips ul {
  margin: 0;
  padding-left: 20px;
  color: #666;
}

.tips li {
  margin: 5px 0;
}
</style>
