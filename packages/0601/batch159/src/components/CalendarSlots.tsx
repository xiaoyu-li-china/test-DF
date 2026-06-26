import { useBookingStore } from '@/store/bookingStore'
import { getNext7Days } from '@/data/mockData'
import { isSlotExpiredPublic } from '@/data/api'
import { ChevronRight, ChevronLeft, Sun, Moon, AlertCircle, RefreshCw } from 'lucide-react'
import { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import type { TimeSlot } from '@/types'

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export default function CalendarSlots() {
  const {
    selectedType,
    selectedDate,
    selectedSlot,
    setSelectedDate,
    setSelectedSlot,
    allSlots,
    rescheduleMode,
    rescheduleFrom,
    cancelReschedule,
    refreshingSlots,
    refreshSlots,
  } = useBookingStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const pageScrollRef = useRef<number>(0)
  const [scrollArrows, setScrollArrows] = useState({ left: false, right: true })
  const [selectingDate, setSelectingDate] = useState(false)
  const [cancellingReschedule, setCancellingReschedule] = useState(false)
  const days = useMemo(() => getNext7Days(), [])

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setScrollArrows({
      left: el.scrollLeft > 0,
      right: el.scrollLeft < el.scrollWidth - el.clientWidth - 5,
    })
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', checkScroll, { passive: true })
    return () => el.removeEventListener('scroll', checkScroll)
  }, [checkScroll])

  const handleDateClick = async (dateStr: string) => {
    if (selectingDate) return
    setSelectingDate(true)
    await setSelectedDate(dateStr)
    setSelectingDate(false)
  }

  const handleSlotClick = (slot: TimeSlot) => {
    pageScrollRef.current = window.scrollY
    setSelectedSlot(slot)
    requestAnimationFrame(() => {
      window.scrollTo(0, pageScrollRef.current)
    })
  }

  const handleCancelReschedule = async () => {
    if (cancellingReschedule) return
    setCancellingReschedule(true)
    await cancelReschedule()
    setCancellingReschedule(false)
  }

  const scrollBy = (offset: number) => {
    scrollRef.current?.scrollBy({ left: offset, behavior: 'smooth' })
  }

  const slotsForDate = selectedDate ? allSlots.filter((s) => s.date === selectedDate) : []
  const morningSlots = slotsForDate.filter((s) => s.period === 'morning')
  const afternoonSlots = slotsForDate.filter((s) => s.period === 'afternoon')

  const formatDateLabel = (date: Date) => {
    const m = date.getMonth() + 1
    const d = date.getDate()
    return `${m}/${d}`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-serif text-lg font-semibold text-brand">
          {rescheduleMode ? '选择新时段（改期）' : '选择咨询时段'}
        </h2>
        {selectedType && (
          <button
            onClick={refreshSlots}
            disabled={refreshingSlots}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-brand transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshingSlots ? 'animate-spin' : ''}`} />
            刷新
          </button>
        )}
      </div>

      {refreshingSlots && (
        <div className="bg-brand/5 border border-brand/20 rounded-xl p-2 mb-4 text-center">
          <span className="text-xs text-brand">正在刷新时段数据...</span>
        </div>
      )}

      {rescheduleMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-700 flex-1">
            <p className="font-medium">改期说明</p>
            <p className="mt-0.5">咨询类型不可更改，仅可改到同类型律师有空档的时段</p>
            <p className="mt-0.5 text-amber-500">
              原预约：{rescheduleFrom?.typeName} · {rescheduleFrom?.date} {rescheduleFrom?.time}
            </p>
          </div>
          <button
            onClick={handleCancelReschedule}
            disabled={cancellingReschedule}
            className="text-xs text-amber-600 font-medium whitespace-nowrap hover:underline flex-shrink-0 disabled:opacity-50"
          >
            {cancellingReschedule ? '处理中...' : '取消改期'}
          </button>
        </div>
      )}

      {!selectedType && !rescheduleMode ? (
        <div className="bg-surface-warm rounded-xl p-6 text-center">
          <p className="text-sm text-gray-400">请先选择咨询类型</p>
        </div>
      ) : (
        <>
          <div className="relative bg-white rounded-xl border border-gray-200 p-3 mb-4">
            <button
              onClick={() => scrollBy(-120)}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white rounded-full shadow-md flex items-center justify-center border border-gray-100 transition-opacity duration-200"
              style={{ opacity: scrollArrows.left ? 1 : 0, pointerEvents: scrollArrows.left ? 'auto' : 'none' }}
            >
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
            <div
              ref={scrollRef}
              className="calendar-scroll flex gap-2 overflow-x-auto px-1"
            >
              {days.map((date) => {
                const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                const isSelected = selectedDate === dateStr
                const availableCount = allSlots.filter(
                  (s) => s.date === dateStr && s.available && !isSlotExpiredPublic(s)
                ).length
                const isToday = new Date().toDateString() === date.toDateString()
                const isDisabled = availableCount === 0
                return (
                  <button
                    key={dateStr}
                    onClick={() => !isDisabled && !selectingDate && handleDateClick(dateStr)}
                    disabled={isDisabled || selectingDate}
                    className={`flex-shrink-0 flex flex-col items-center gap-0.5 w-[52px] py-2.5 rounded-lg transition-all duration-200 ${
                      isSelected
                        ? 'bg-brand text-white shadow-md'
                        : isDisabled
                          ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span className={`text-[10px] font-medium ${isSelected ? 'opacity-70' : isDisabled ? 'opacity-50' : 'opacity-70'}`}>
                      {WEEKDAYS[date.getDay()]}
                    </span>
                    <span className="text-base font-semibold">
                      {formatDateLabel(date)}
                    </span>
                    {isToday && !isSelected && !isDisabled && (
                      <span className="text-[9px] text-accent font-medium">今天</span>
                    )}
                    {availableCount > 0 && !isSelected && (
                      <span className="text-[9px] text-green-500 font-medium">
                        {availableCount}个
                      </span>
                    )}
                    {isDisabled && !isSelected && (
                      <span className="text-[9px] text-gray-400">已满</span>
                    )}
                    {isSelected && availableCount > 0 && (
                      <span className="text-[9px] opacity-80">
                        {availableCount}个
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => scrollBy(120)}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white rounded-full shadow-md flex items-center justify-center border border-gray-100 transition-opacity duration-200"
              style={{ opacity: scrollArrows.right ? 1 : 0, pointerEvents: scrollArrows.right ? 'auto' : 'none' }}
            >
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {selectedDate && (
            <div className="space-y-3">
              {morningSlots.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs font-medium text-gray-500">上午</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {morningSlots.map((slot) => {
                      const isSelected = selectedSlot?.id === slot.id
                      const isExpired = isSlotExpiredPublic(slot)
                      const isDisabled = !slot.available || isExpired
                      return (
                        <button
                          key={slot.id}
                          onClick={() => !isDisabled && handleSlotClick(slot)}
                          disabled={isDisabled}
                          className={`py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                            isSelected
                              ? 'bg-accent text-white shadow-md'
                              : isDisabled
                                ? 'bg-gray-100 text-gray-300 cursor-not-allowed line-through'
                                : 'bg-white border border-gray-200 text-gray-600 hover:border-accent-light'
                          }`}
                        >
                          {slot.startTime}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {afternoonSlots.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-xs font-medium text-gray-500">下午</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {afternoonSlots.map((slot) => {
                      const isSelected = selectedSlot?.id === slot.id
                      const isExpired = isSlotExpiredPublic(slot)
                      const isDisabled = !slot.available || isExpired
                      return (
                        <button
                          key={slot.id}
                          onClick={() => !isDisabled && handleSlotClick(slot)}
                          disabled={isDisabled}
                          className={`py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                            isSelected
                              ? 'bg-accent text-white shadow-md'
                              : isDisabled
                                ? 'bg-gray-100 text-gray-300 cursor-not-allowed line-through'
                                : 'bg-white border border-gray-200 text-gray-600 hover:border-accent-light'
                          }`}
                        >
                          {slot.startTime}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {slotsForDate.filter((s) => s.available && !isSlotExpiredPublic(s)).length === 0 && (
                <div className="text-center py-6 text-sm text-gray-400">
                  当日暂无可用时段
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
