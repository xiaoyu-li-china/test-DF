import { useHandoverStore } from '@/store/useHandoverStore'
import { useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle, ArrowLeft, Image } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function Success() {
  const navigate = useNavigate()
  const location = useLocation()
  const records = useHandoverStore((s) => s.records)
  const record = (location.state as { record?: { roomNumber: string; timestamp: string; photos: string[]; checkedItems: string[] } })?.record
  const [showCheck, setShowCheck] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShowCheck(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const handleBack = () => {
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-50">
      <div className="px-5 pt-12 pb-8 text-center">
        <div className={`transition-all duration-700 ${showCheck ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
          <div className="w-24 h-24 mx-auto bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-200">
            <CheckCircle className="w-14 h-14 text-white" />
          </div>
        </div>

        <h1 className="mt-6 text-3xl font-bold text-gray-800">
          交接成功！
        </h1>

        {record && (
          <div className="mt-4 space-y-1">
            <p className="text-xl text-gray-600">
              房间 <span className="text-2xl font-bold text-orange-500">{record.roomNumber}</span>
            </p>
            <p className="text-lg text-gray-400">{record.timestamp}</p>
          </div>
        )}

        <button
          onClick={handleBack}
          className="mt-8 inline-flex items-center gap-2 px-8 py-4 bg-orange-500 text-white text-xl font-bold rounded-2xl shadow-lg shadow-orange-200 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-6 h-6" />
          继续交接下一间
        </button>
      </div>

      {records.length > 0 && (
        <div className="px-5 pb-8">
          <h2 className="text-xl font-bold text-gray-700 mb-3">📋 交接记录</h2>
          <div className="space-y-3">
            {records
              .slice()
              .reverse()
              .slice(0, 10)
              .map((r) => (
                <div
                  key={r.id}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4"
                >
                  {r.photos[0] ? (
                    <img
                      src={r.photos[0]}
                      alt="缩略图"
                      className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Image className="w-8 h-8 text-gray-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-bold text-gray-800">
                      房间 {r.roomNumber}
                    </p>
                    <p className="text-base text-gray-400 truncate">{r.timestamp}</p>
                    <p className="text-sm text-green-500 font-medium">
                      ✓ {r.checkedItems.length} 项合格
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
