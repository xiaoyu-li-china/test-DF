import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { useScheduleStore } from '@/store/useScheduleStore'
import { formatDisplayDate, addDays, getTodayDate } from '@/utils/time'

export default function DateNavigator() {
  const { selectedDate, setSelectedDate } = useScheduleStore()

  const handlePrevDay = () => setSelectedDate(addDays(selectedDate, -1))
  const handleNextDay = () => setSelectedDate(addDays(selectedDate, 1))
  const handleToday = () => setSelectedDate(getTodayDate())

  const isToday = selectedDate === getTodayDate()

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1 bg-murder-surface rounded-lg p-1 border border-white/5">
        <button
          onClick={handlePrevDay}
          className="p-2 hover:bg-white/5 rounded-md transition-colors text-gray-400 hover:text-white"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2 px-4 py-2 min-w-[160px] justify-center">
          <CalendarDays size={18} className="text-murder-gold" />
          <span className="font-serif text-lg text-white font-medium">
            {formatDisplayDate(selectedDate)}
          </span>
        </div>
        <button
          onClick={handleNextDay}
          className="p-2 hover:bg-white/5 rounded-md transition-colors text-gray-400 hover:text-white"
        >
          <ChevronRight size={18} />
        </button>
      </div>
      {!isToday && (
        <button
          onClick={handleToday}
          className="px-4 py-2 bg-murder-gold/10 text-murder-gold hover:bg-murder-gold/20 rounded-lg transition-colors text-sm font-medium border border-murder-gold/30"
        >
          回到今天
        </button>
      )}
    </div>
  )
}
