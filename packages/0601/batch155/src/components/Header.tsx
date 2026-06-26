import { useEffect, useState } from 'react'
import { BusFront, Wifi } from 'lucide-react'

interface HeaderProps {
  countdown: number
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('zh-CN', { hour12: false })
}

function formatDate(date: Date) {
  const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekDays[date.getDay()]}`
}

export default function Header({ countdown }: HeaderProps) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-[#1a2045] bg-[#0d1230]/80 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#00e5ff] to-[#0070cc] flex items-center justify-center">
          <BusFront className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-semibold tracking-wide text-[#e0e6ff] font-display">
            公交到站预测大屏
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-xs text-[#7b89b8]">
          <Wifi className="w-3.5 h-3.5 text-[#00e5ff]" />
          <span>在线</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#111633] border border-[#1a2045]">
          <span className="text-xs text-[#7b89b8]">刷新倒计时</span>
          <span className="text-sm font-mono text-[#00e5ff] font-bold tabular-nums">
            {countdown}s
          </span>
        </div>
        <div className="text-right">
          <div className="text-sm font-mono text-[#e0e6ff] tabular-nums tracking-wider">
            {formatTime(now)}
          </div>
          <div className="text-[10px] text-[#7b89b8]">
            {formatDate(now)}
          </div>
        </div>
      </div>
    </header>
  )
}
