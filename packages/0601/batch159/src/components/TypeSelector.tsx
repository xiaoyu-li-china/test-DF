import { Briefcase, Heart, Building2, Check, Loader2 } from 'lucide-react'
import { CONSULTATION_TYPES } from '@/data/mockData'
import { useBookingStore } from '@/store/bookingStore'
import type { ConsultationType } from '@/types'
import { useState } from 'react'

const ICON_MAP: Record<string, React.ElementType> = {
  Briefcase,
  Heart,
  Building2,
}

export default function TypeSelector() {
  const { selectedType, setSelectedType } = useBookingStore()
  const [loadingType, setLoadingType] = useState<string | null>(null)

  const handleTypeClick = async (typeId: ConsultationType) => {
    if (loadingType) return
    setLoadingType(typeId)
    await setSelectedType(typeId)
    setLoadingType(null)
  }

  return (
    <div>
      <h2 className="font-serif text-lg font-semibold text-brand mb-3">
        选择咨询类型
      </h2>
      <div className="grid grid-cols-3 gap-3">
        {CONSULTATION_TYPES.map((type) => {
          const Icon = ICON_MAP[type.icon]
          const isSelected = selectedType === type.id
          const isLoading = loadingType === type.id
          return (
            <button
              key={type.id}
              onClick={() => handleTypeClick(type.id as ConsultationType)}
              disabled={isLoading}
              className={`relative flex flex-col items-center gap-1.5 rounded-xl p-3 border-2 transition-all duration-200 min-h-[100px] justify-center ${
                isSelected
                  ? 'border-brand bg-brand/5 shadow-md'
                  : isLoading
                    ? 'border-brand/30 bg-brand/5'
                    : 'border-gray-200 bg-white hover:border-accent-light hover:shadow-sm'
              }`}
            >
              {isSelected && (
                <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-brand flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </span>
              )}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isSelected ? 'bg-brand/10' : isLoading ? 'bg-brand/10' : 'bg-gray-100'
                }`}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 text-brand animate-spin" />
                ) : (
                  <Icon
                    className={`w-5 h-5 ${
                      isSelected ? 'text-brand' : 'text-gray-400'
                    }`}
                  />
                )}
              </div>
              <span
                className={`text-sm font-medium ${
                  isSelected ? 'text-brand' : isLoading ? 'text-brand/60' : 'text-gray-600'
                }`}
              >
                {type.label}
              </span>
              <span className="text-[10px] text-gray-400 leading-tight text-center px-1">
                {type.description}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
