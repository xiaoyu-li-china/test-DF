import { Heart } from 'lucide-react'
import { COUPLE_NAME, WEDDING_DATE, WELCOME_MESSAGE } from '@/data/mockPhotos'

export default function WelcomeBanner() {
  return (
    <div className="relative py-12 md:py-16 text-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-warm-100 to-transparent" />
      <div className="relative z-10">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="h-px w-12 bg-rose-gold/40" />
          <Heart className="w-4 h-4 text-rose-gold/60 fill-rose-gold/30" />
          <div className="h-px w-12 bg-rose-gold/40" />
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-semibold text-warm-300/90 tracking-wide mb-3">
          {COUPLE_NAME}
        </h1>
        <p className="font-body text-sm md:text-base text-warm-300/60 tracking-widest uppercase mb-5">
          {WEDDING_DATE}
        </p>
        <div className="h-px w-24 mx-auto bg-rose-gold/30 mb-5" />
        <p className="font-body text-sm md:text-base text-warm-300/50 max-w-md mx-auto leading-relaxed italic">
          {WELCOME_MESSAGE}
        </p>
      </div>
    </div>
  )
}
