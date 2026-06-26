<template>
  <div class="calendar">
    <div class="calendar-header">
      <button @click="prevMonth" class="nav-btn">&lt;</button>
      <h2 class="month-title">{{ currentYear }}年{{ currentMonth + 1 }}月</h2>
      <button @click="nextMonth" class="nav-btn">&gt;</button>
    </div>
    
    <div class="weekdays">
      <div v-for="day in weekDays" :key="day" class="weekday">{{ day }}</div>
    </div>
    
    <div class="days-grid">
      <div
        v-for="(day, index) in calendarDays"
        :key="index"
        class="day-cell"
        :class="{
          'other-month': !day.isCurrentMonth,
          'today': day.isToday,
          'selected': day.isSelected,
          'in-range': day.isInRange,
          'range-start': day.isRangeStart,
          'range-end': day.isRangeEnd,
          'festival': day.lunarFestival
        }"
        @click="selectDate(day)"
      >
        <span class="solar-day">{{ day.day }}</span>
        <span class="lunar-day" :class="{ 'festival-red': day.lunarFestival }">
          {{ day.lunarDay }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Lunar } from 'lunar-javascript'
import { formatDateKey, getDaysInMonth, getFirstDayOfWeek } from '../utils/dateUtils.js'

const emit = defineEmits(['date-select', 'range-select'])

const weekDays = ['日', '一', '二', '三', '四', '五', '六']

const today = new Date()
const currentYear = ref(today.getFullYear())
const currentMonth = ref(today.getMonth())

const selectedDate = ref(null)
const startDate = ref(null)
const endDate = ref(null)

const getLunarInfo = (year, month, day) => {
  try {
    const lunar = Lunar.fromYmd(year, month + 1, day)
    const lunarDay = lunar.getDayInChinese()
    const festival = lunar.getFestivals()
    return {
      lunarDay: lunarDay === '初一' ? lunar.getMonthInChinese() + '月' : lunarDay,
      lunarFestival: festival.length > 0 ? festival[0] : null
    }
  } catch (e) {
    return { lunarDay: '', lunarFestival: null }
  }
}

const calendarDays = computed(() => {
  const days = []
  const startWeekDay = getFirstDayOfWeek(currentYear.value, currentMonth.value)
  const totalDays = getDaysInMonth(currentYear.value, currentMonth.value)
  
  const prevMonthLastDay = new Date(currentYear.value, currentMonth.value, 0).getDate()
  
  const selectedKey = selectedDate.value ? formatDateKey(selectedDate.value) : null
  const startKey = startDate.value ? formatDateKey(startDate.value) : null
  const endKey = endDate.value ? formatDateKey(endDate.value) : null
  
  for (let i = startWeekDay - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i
    const date = new Date(currentYear.value, currentMonth.value - 1, day)
    const dateKey = formatDateKey(date)
    const lunarInfo = getLunarInfo(date.getFullYear(), date.getMonth(), day)
    
    days.push({
      year: date.getFullYear(),
      month: date.getMonth(),
      day,
      isCurrentMonth: false,
      isToday: false,
      isSelected: dateKey === selectedKey,
      isInRange: isDateInRange(date),
      isRangeStart: dateKey === startKey,
      isRangeEnd: dateKey === endKey,
      ...lunarInfo
    })
  }
  
  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(currentYear.value, currentMonth.value, day)
    const dateKey = formatDateKey(date)
    const lunarInfo = getLunarInfo(currentYear.value, currentMonth.value, day)
    
    days.push({
      year: currentYear.value,
      month: currentMonth.value,
      day,
      isCurrentMonth: true,
      isToday: dateKey === formatDateKey(today),
      isSelected: dateKey === selectedKey,
      isInRange: isDateInRange(date),
      isRangeStart: dateKey === startKey,
      isRangeEnd: dateKey === endKey,
      ...lunarInfo
    })
  }
  
  const remainingDays = 42 - days.length
  for (let day = 1; day <= remainingDays; day++) {
    const date = new Date(currentYear.value, currentMonth.value + 1, day)
    const dateKey = formatDateKey(date)
    const lunarInfo = getLunarInfo(date.getFullYear(), date.getMonth(), day)
    
    days.push({
      year: date.getFullYear(),
      month: date.getMonth(),
      day,
      isCurrentMonth: false,
      isToday: false,
      isSelected: dateKey === selectedKey,
      isInRange: isDateInRange(date),
      isRangeStart: dateKey === startKey,
      isRangeEnd: dateKey === endKey,
      ...lunarInfo
    })
  }
  
  return days
})

const isDateInRange = (date) => {
  if (!startDate.value || !endDate.value) return false
  return date >= startDate.value && date <= endDate.value
}

const prevMonth = () => {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

const nextMonth = () => {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

const selectDate = (dayInfo) => {
  const selected = new Date(dayInfo.year, dayInfo.month, dayInfo.day)
  
  if (!startDate.value || (startDate.value && endDate.value)) {
    startDate.value = selected
    endDate.value = null
    selectedDate.value = selected
  } else {
    if (selected < startDate.value) {
      endDate.value = startDate.value
      startDate.value = selected
    } else {
      endDate.value = selected
    }
    selectedDate.value = selected
  }
  
  emit('date-select', selected)
  emit('range-select', { start: startDate.value, end: endDate.value })
}

watch([currentYear, currentMonth], () => {
  selectedDate.value = null
})
</script>

<style scoped>
.calendar {
  width: 100%;
  max-width: 600px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.nav-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: #f0f0f0;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.nav-btn:hover {
  background: #e0e0e0;
}

.month-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 8px;
}

.weekday {
  text-align: center;
  font-weight: 600;
  color: #666;
  padding: 10px 0;
  font-size: 14px;
}

.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.day-cell {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.day-cell:hover {
  background: #f5f5f5;
}

.day-cell.other-month {
  color: #ccc;
}

.day-cell.other-month .lunar-day {
  color: #e0e0e0;
}

.day-cell.today {
  background: #e3f2fd;
}

.day-cell.today .solar-day {
  color: #1976d2;
  font-weight: 700;
}

.day-cell.selected {
  background: #2196f3;
  color: white;
}

.day-cell.selected .solar-day,
.day-cell.selected .lunar-day {
  color: white;
}

.day-cell.in-range {
  background: #bbdefb;
  border-radius: 0;
}

.day-cell.range-start {
  background: #2196f3;
  color: white;
  border-radius: 8px 0 0 8px;
}

.day-cell.range-end {
  background: #2196f3;
  color: white;
  border-radius: 0 8px 8px 0;
}

.day-cell.range-start.range-end {
  border-radius: 8px;
}

.day-cell.range-start .solar-day,
.day-cell.range-start .lunar-day,
.day-cell.range-end .solar-day,
.day-cell.range-end .lunar-day {
  color: white;
}

.solar-day {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.lunar-day {
  font-size: 10px;
  color: #999;
  margin-top: 2px;
}

.festival-red,
.day-cell.festival .lunar-day {
  color: #f44336 !important;
}

.day-cell.selected .festival-red,
.day-cell.range-start .festival-red,
.day-cell.range-end .festival-red {
  color: #ffcdd2 !important;
}
</style>
