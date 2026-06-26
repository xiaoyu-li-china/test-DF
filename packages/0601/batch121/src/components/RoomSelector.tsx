import { ROOMS, useHandoverStore } from '@/store/useHandoverStore'
import { Home } from 'lucide-react'

export default function RoomSelector() {
  const roomNumber = useHandoverStore((s) => s.roomNumber)
  const setRoomNumber = useHandoverStore((s) => s.setRoomNumber)

  return (
    <div className="space-y-3">
      <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
        <Home className="w-7 h-7" />
        选择房间号
      </h2>
      <div className="grid grid-cols-3 gap-3">
        {ROOMS.map((room) => {
          const selected = roomNumber === room
          return (
            <button
              key={room}
              onClick={() => setRoomNumber(room)}
              className={`
                relative py-5 rounded-2xl text-2xl font-bold transition-all duration-200 active:scale-95
                ${selected
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-300 scale-[1.02]'
                  : 'bg-white text-gray-700 shadow-sm border-2 border-gray-100 hover:border-orange-200 hover:bg-orange-50'
                }
              `}
            >
              {room}
              {selected && (
                <span className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
