import { useBookingStore } from '@/store/bookingStore'
import { User, Phone, FileText, Bell, BellOff } from 'lucide-react'

export default function BookingForm() {
  const { name, phone, summary, wantReminder, setName, setPhone, setSummary, setWantReminder, nameError, phoneError, selectedType, selectedSlot } =
    useBookingStore()

  const canFill = selectedType && selectedSlot

  return (
    <div>
      <h2 className="font-serif text-lg font-semibold text-brand mb-3">
        填写个人信息
      </h2>

      {!canFill ? (
        <div className="bg-surface-warm rounded-xl p-6 text-center">
          <p className="text-sm text-gray-400">请先选择咨询类型和时段</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-600 mb-1.5">
              <User className="w-3.5 h-3.5" />
              姓名
              <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入您的姓名"
              className={`w-full px-4 py-3 rounded-xl border bg-white text-sm transition-colors duration-200 outline-none focus:ring-2 focus:ring-brand/20 ${
                nameError ? 'border-red-300' : 'border-gray-200 focus:border-brand'
              }`}
            />
            {nameError && (
              <p className="text-xs text-red-400 mt-1 ml-1">{nameError}</p>
            )}
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-600 mb-1.5">
              <Phone className="w-3.5 h-3.5" />
              手机号
              <span className="text-red-400">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 11)
                setPhone(val)
              }}
              placeholder="请输入11位手机号"
              maxLength={11}
              className={`w-full px-4 py-3 rounded-xl border bg-white text-sm transition-colors duration-200 outline-none focus:ring-2 focus:ring-brand/20 ${
                phoneError ? 'border-red-300' : 'border-gray-200 focus:border-brand'
              }`}
            />
            {phoneError && (
              <p className="text-xs text-red-400 mt-1 ml-1">{phoneError}</p>
            )}
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-600 mb-1.5">
              <FileText className="w-3.5 h-3.5" />
              问题摘要
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="请简要描述您的问题，方便律师提前了解"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm transition-colors duration-200 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 resize-none"
            />
          </div>

          <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3">
            <div className="flex items-center gap-2">
              {wantReminder ? (
                <Bell className="w-4 h-4 text-accent" />
              ) : (
                <BellOff className="w-4 h-4 text-gray-400" />
              )}
              <div>
                <p className="text-sm font-medium text-gray-700">咨询前 30 分钟短信提醒</p>
                <p className="text-[10px] text-gray-400">将发送至您填写的手机号</p>
              </div>
            </div>
            <button
              onClick={() => setWantReminder(!wantReminder)}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                wantReminder ? 'bg-accent' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  wantReminder ? 'translate-x-[22px]' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
