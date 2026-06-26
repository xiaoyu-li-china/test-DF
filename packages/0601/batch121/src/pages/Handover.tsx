import RoomSelector from '@/components/RoomSelector'
import CheckList from '@/components/CheckList'
import PhotoUploader from '@/components/PhotoUploader'
import { useHandoverStore, CHECK_GROUPS, ALL_ITEM_KEYS, MIN_PHOTOS } from '@/store/useHandoverStore'
import type { UserRole } from '@/store/useHandoverStore'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronLeft, Send, ShieldCheck, Sparkles } from 'lucide-react'

const TOTAL_ITEMS = ALL_ITEM_KEYS.length

export default function Handover() {
  const navigate = useNavigate()
  const step = useHandoverStore((s) => s.step)
  const setStep = useHandoverStore((s) => s.setStep)
  const roomNumber = useHandoverStore((s) => s.roomNumber)
  const checkedItems = useHandoverStore((s) => s.checkedItems)
  const photos = useHandoverStore((s) => s.photos)
  const role = useHandoverStore((s) => s.role)
  const setRole = useHandoverStore((s) => s.setRole)
  const submit = useHandoverStore((s) => s.submit)
  const reset = useHandoverStore((s) => s.reset)

  const missingItems = ALL_ITEM_KEYS.filter((key) => !checkedItems.has(key))

  const handleSubmit = () => {
    if (missingItems.length > 0 || photos.length < MIN_PHOTOS) return
    const record = submit()
    if (record) {
      reset()
      navigate('/success', { replace: true, state: { record } })
    }
  }

  const canGoNext = () => {
    if (step === 0) return !!roomNumber
    if (step === 1) return checkedItems.size === TOTAL_ITEMS
    if (step === 2) return photos.length >= MIN_PHOTOS
    return false
  }

  const stepProgress = step === 0
    ? (roomNumber ? 1 : 0)
    : step === 1
      ? checkedItems.size / TOTAL_ITEMS
      : step === 2
        ? Math.min(photos.length / MIN_PHOTOS, 1)
        : 0

  const progressPercent = ((step + stepProgress) / 3) * 100

  const missingGrouped = CHECK_GROUPS.map((g) => ({
    group: g,
    missing: g.items.filter((item) => !checkedItems.has(`${g.name}::${item}`)),
  })).filter((x) => x.missing.length > 0)

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md shadow-sm px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-gray-800">
            🏠 保洁交接
          </h1>
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setRole('cleaner')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                role === 'cleaner' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-500'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              保洁
            </button>
            <button
              onClick={() => setRole('manager')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                role === 'manager' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-500'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              主管
            </button>
          </div>
        </div>

        {role === 'manager' && (
          <button
            onClick={() => navigate('/records', { replace: false })}
            className="w-full py-2.5 bg-blue-50 text-blue-600 rounded-xl text-base font-semibold mb-3 active:scale-[0.98] transition-all"
          >
            📊 查看全部交接记录
          </button>
        )}

        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-sm text-gray-400">
          <span className={step === 0 ? 'text-orange-500 font-semibold' : ''}>1. 选房</span>
          <span className={step === 1 ? 'text-orange-500 font-semibold' : ''}>2. 检查</span>
          <span className={step === 2 ? 'text-orange-500 font-semibold' : ''}>3. 拍照</span>
        </div>
      </header>

      <main className="px-4 pb-32 pt-4 space-y-6">
        {step === 0 && <RoomSelector />}
        {step === 1 && <CheckList />}

        {step === 1 && missingItems.length > 0 && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 space-y-2">
            <p className="text-lg font-bold text-red-600">
              ⚠️ 还有 {missingItems.length} 项未检查
            </p>
            {missingGrouped.map(({ group, missing }) => (
              <div key={group.name}>
                <span className="text-base text-red-500 font-semibold">
                  {group.emoji} {group.name}：
                </span>
                <span className="text-base text-red-500">
                  {missing.join('、')}
                </span>
              </div>
            ))}
            <p className="text-sm text-red-400">
              请完成全部检查项后才能提交
            </p>
          </div>
        )}

        {step === 2 && <PhotoUploader />}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 px-5 py-4 z-10">
        <div className="flex gap-3 max-w-lg mx-auto">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center justify-center gap-1 px-6 py-4 rounded-2xl text-xl font-semibold text-gray-500 bg-gray-100 active:scale-95 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
              上一步
            </button>
          )}

          {step < 2 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canGoNext()}
              className={`
                flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-xl font-bold transition-all active:scale-95
                ${canGoNext()
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-200'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              下一步
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canGoNext()}
              className={`
                flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-xl font-bold transition-all active:scale-95
                ${canGoNext()
                  ? 'bg-green-500 text-white shadow-lg shadow-green-200'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              <Send className="w-6 h-6" />
              提交交接
            </button>
          )}
        </div>

        {step === 2 && photos.length < MIN_PHOTOS && (
          <p className="text-center text-red-400 text-base font-medium mt-2">
            请至少拍摄 {MIN_PHOTOS} 张照片才能提交
          </p>
        )}
      </footer>
    </div>
  )
}
