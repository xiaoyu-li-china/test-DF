import { useBookingStore } from '@/store/bookingStore'
import { Loader2, RefreshCw } from 'lucide-react'
import { useState } from 'react'

export default function SubmitButton() {
  const { selectedType, selectedSlot, name, phone, submitting, rescheduleMode, validateAndSubmit, rescheduleSubmit } =
    useBookingStore()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canSubmit =
    selectedType && selectedSlot && name.trim() && phone.trim() && !submitting && !isSubmitting

  const handleClick = async () => {
    if (!canSubmit) return
    setIsSubmitting(true)
    if (rescheduleMode) {
      await rescheduleSubmit()
    } else {
      await validateAndSubmit()
    }
    setIsSubmitting(false)
  }

  return (
    <button
      onClick={handleClick}
      disabled={!canSubmit}
      className={`w-full py-4 rounded-xl text-white font-medium text-base shadow-lg transition-all duration-200 flex items-center justify-center gap-2 ${
        canSubmit
          ? rescheduleMode
            ? 'bg-amber-500 shadow-amber-500/25 hover:bg-amber-600 active:scale-[0.98]'
            : 'bg-accent shadow-accent/25 hover:bg-accent-dark active:scale-[0.98]'
          : 'bg-gray-300 shadow-none cursor-not-allowed'
      }`}
    >
      {submitting || isSubmitting ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          提交中...
        </>
      ) : rescheduleMode ? (
        <>
          <RefreshCw className="w-4 h-4" />
          确认改期
        </>
      ) : (
        '提交预约'
      )}
    </button>
  )
}
