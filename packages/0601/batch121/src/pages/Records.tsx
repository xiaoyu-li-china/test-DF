import { useHandoverStore, ROOMS } from '@/store/useHandoverStore'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, Image, Filter } from 'lucide-react'
import { useState, useMemo } from 'react'

export default function Records() {
  const navigate = useNavigate()
  const records = useHandoverStore((s) => s.records)
  const [dateFilter, setDateFilter] = useState('')
  const [roomFilter, setRoomFilter] = useState('')

  const dateOptions = useMemo(() => {
    const dates = [...new Set(records.map((r) => r.dateKey))].sort().reverse()
    return dates
  }, [records])

  const filtered = useMemo(() => {
    let result = records.slice().reverse()
    if (dateFilter) {
      result = result.filter((r) => r.dateKey === dateFilter)
    }
    if (roomFilter) {
      result = result.filter((r) => r.roomNumber === roomFilter)
    }
    return result.slice(0, 50)
  }, [records, dateFilter, roomFilter])

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>()
    filtered.forEach((r) => {
      const key = r.dateKey
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    })
    return Array.from(map.entries())
  }, [filtered])

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-50">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md shadow-sm px-5 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 -ml-2 rounded-xl hover:bg-gray-100 active:scale-95 transition-all"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">📊 交接记录</h1>
        </div>

        <div className="mt-3 flex gap-2">
          <div className="flex-1 relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 bg-white border-2 border-gray-200 rounded-xl text-base appearance-none focus:border-blue-400 focus:outline-none"
            >
              <option value="">全部日期</option>
              {dateOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 bg-white border-2 border-gray-200 rounded-xl text-base appearance-none focus:border-blue-400 focus:outline-none"
            >
              <option value="">全部房间</option>
              {ROOMS.map((r) => (
                <option key={r} value={r}>房间 {r}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="px-5 pb-8 pt-4">
        {grouped.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-6xl mb-4">📭</p>
            <p className="text-xl text-gray-400">暂无交接记录</p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([dateKey, items]) => (
              <div key={dateKey}>
                <h3 className="text-lg font-bold text-gray-500 mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  {dateKey}
                  <span className="text-sm font-normal text-gray-400">（{items.length} 条）</span>
                </h3>
                <div className="space-y-3">
                  {items.map((r) => (
                    <div
                      key={r.id}
                      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
                    >
                      <div className="flex items-center gap-4">
                        {r.photos[0] ? (
                          <div className="flex -space-x-2 flex-shrink-0">
                            {r.photos.slice(0, 3).map((p, i) => (
                              <img
                                key={i}
                                src={p}
                                alt={`照片${i + 1}`}
                                className="w-14 h-14 rounded-xl object-cover border-2 border-white shadow-sm"
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <Image className="w-7 h-7 text-gray-300" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-gray-800">
                              房间 {r.roomNumber}
                            </span>
                            <span className="px-2 py-0.5 bg-green-100 text-green-600 text-sm font-semibold rounded-lg">
                              ✓ {r.checkedItems.length} 项合格
                            </span>
                          </div>
                          <p className="text-base text-gray-400 mt-0.5">{r.timestamp}</p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {r.checkedItems.map((item) => (
                          <span
                            key={item}
                            className="px-2 py-0.5 bg-orange-50 text-orange-600 text-sm rounded-lg"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-sm text-gray-300 mt-8">
          共 {filtered.length} 条记录
        </p>
      </main>
    </div>
  )
}
