import Header from '@/components/Header'
import TypeSelector from '@/components/TypeSelector'
import CalendarSlots from '@/components/CalendarSlots'
import BookingForm from '@/components/BookingForm'
import FileUpload from '@/components/FileUpload'
import SubmitButton from '@/components/SubmitButton'
import BookingResult from '@/components/BookingResult'
import { useBookingStore } from '@/store/bookingStore'
import { Shield, Scale, Lock } from 'lucide-react'

export default function Home() {
  const { result, bookingError, rescheduleMode } = useBookingStore()

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-[480px] mx-auto pb-8">
        <Header />

        <div className="px-5 space-y-6 mt-6">
          {!rescheduleMode && <TypeSelector />}

          {!rescheduleMode && <div className="h-px bg-gray-200/60" />}

          <CalendarSlots />

          <div className="h-px bg-gray-200/60" />

          <BookingForm />

          <div className="h-px bg-gray-200/60" />

          <FileUpload />

          <SubmitButton />

          {bookingError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-500 text-center">
              {bookingError}
            </div>
          )}
        </div>

        <footer className="mt-10 px-5 pt-6 border-t border-gray-200/60">
          <div className="space-y-4 mb-6">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0">
                <Scale className="w-4 h-4 text-brand" />
              </div>
              <div>
                <p className="text-sm font-medium text-brand">公益咨询范围</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  提供劳动纠纷、婚姻家事、物业纠纷等领域的免费法律咨询服务，
                  包括但不限于：劳动合同争议、工资拖欠、工伤赔偿、离婚财产分割、
                  子女抚养权、物业服务合同、公共维修基金使用、车位权属争议等。
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-brand">不替代诉讼服务说明</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  本公益咨询仅提供一般性法律建议，不构成正式法律意见，
                  不替代诉讼代理、仲裁申请等专业法律服务。
                  如需提起诉讼或处理复杂法律事务，建议另行委托专业律师。
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <Lock className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-brand">材料隐私保护</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  您上传的所有材料（PDF、图片等）仅用于本次法律咨询，
                  存储于符合《个人信息保护法》要求的加密服务器，
                  咨询结束后 30 天自动销毁，不用于任何其他用途。
                  您可随时申请删除您的个人信息。
                </p>
              </div>
            </div>
          </div>

          <div className="text-center space-y-1 pb-4">
            <p className="text-[11px] text-gray-400">
              社区公益法律服务站 · 周一至周五 9:00-17:00
            </p>
            <p className="text-[10px] text-gray-300">
              © 2026 社区法律服务中心 · 本服务为公益性质，不收取任何费用
            </p>
          </div>
        </footer>
      </div>

      {result && <BookingResult />}
    </div>
  )
}
