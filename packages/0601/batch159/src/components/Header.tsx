import { Scale } from 'lucide-react'

export default function Header() {
  return (
    <header className="bg-brand text-white px-5 pt-12 pb-8 rounded-b-3xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="relative flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
          <Scale className="w-5 h-5 text-accent-light" />
        </div>
        <div>
          <h1 className="font-serif text-xl font-bold tracking-wide">
            公益法律咨询
          </h1>
          <p className="text-xs text-white/60">社区律师 · 免费咨询</p>
        </div>
      </div>

      <p className="text-sm text-white/70 leading-relaxed">
        专业律师为您提供劳动、婚姻、物业等领域法律咨询，请选择类型和时段完成预约
      </p>
    </header>
  )
}
