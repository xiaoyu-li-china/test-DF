import { useBookingStore } from '@/store/bookingStore'
import { CheckCircle2, User, CalendarDays, Clock, Scale, Copy, Bell, BellOff, Paperclip, RefreshCw, Loader2 } from 'lucide-react'
import { useState } from 'react'

export default function BookingResult() {
  const { result, reset, startReschedule } = useBookingStore()
  const [copied, setCopied] = useState(false)
  const [rescheduling, setRescheduling] = useState(false)

  if (!result) return null

  const copyBookingNo = () => {
    navigator.clipboard.writeText(result.bookingNo).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleReschedule = async () => {
    if (rescheduling) return
    setRescheduling(true)
    await startReschedule()
    setRescheduling(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-9 h-9 text-green-500" />
          </div>

          <h3 className="font-serif text-xl font-bold text-brand mb-1">
            预约成功
          </h3>
          <p className="text-sm text-gray-400 mb-5">
            请按时到社区法律服务站咨询
          </p>

          <div className="w-full bg-surface-warm rounded-xl p-4 space-y-3 mb-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">预约号</span>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold font-serif text-brand tracking-wider">
                  {result.bookingNo}
                </span>
                <button
                  onClick={copyBookingNo}
                  className="p-1 rounded hover:bg-gray-200 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>
            </div>

            <div className="h-px bg-gray-200" />

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center">
                <User className="w-4 h-4 text-brand" />
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-400">咨询律师</p>
                <p className="text-sm font-semibold text-brand">{result.lawyerName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                <CalendarDays className="w-4 h-4 text-accent-dark" />
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-400">咨询日期</p>
                <p className="text-sm font-semibold text-gray-700">{result.date}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
                <Clock className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-400">咨询时段</p>
                <p className="text-sm font-semibold text-gray-700">{result.time}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                <Scale className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-400">咨询类型</p>
                <p className="text-sm font-semibold text-gray-700">{result.typeName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
                {result.wantReminder ? (
                  <Bell className="w-4 h-4 text-amber-500" />
                ) : (
                  <BellOff className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-400">短信提醒</p>
                <p className={`text-sm font-semibold ${result.wantReminder ? 'text-amber-600' : 'text-gray-400'}`}>
                  {result.wantReminder ? '咨询前 30 分钟短信提醒' : '未开启'}
                </p>
              </div>
            </div>

            {result.files.length > 0 && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Paperclip className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-gray-400">已上传材料</p>
                  <div className="space-y-1 mt-1">
                    {result.files.map((f) => (
                      <p key={f.id} className="text-xs text-gray-600 truncate max-w-[200px]">
                        {f.name}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {copied && (
            <p className="text-xs text-green-500 -mt-3 mb-3">预约号已复制</p>
          )}

          <div className="w-full space-y-2.5">
            <button
              onClick={handleReschedule}
              disabled={rescheduling}
              className="w-full py-3.5 rounded-xl bg-white border-2 border-brand text-brand font-medium text-sm flex items-center justify-center gap-2 hover:bg-brand/5 transition-colors duration-200 disabled:opacity-60"
            >
              {rescheduling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  改期
                </>
              )}
            </button>

            <button
              onClick={reset}
              className="w-full py-3.5 rounded-xl bg-brand text-white font-medium text-sm shadow-lg shadow-brand/20 hover:bg-brand-light transition-colors duration-200"
            >
              继续预约
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
