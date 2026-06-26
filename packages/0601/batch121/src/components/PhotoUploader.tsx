import { useHandoverStore, MIN_PHOTOS } from '@/store/useHandoverStore'
import { correctImageOrientation } from '@/utils/exif'
import { Camera, X, ImageIcon } from 'lucide-react'
import { useRef, useState } from 'react'

export default function PhotoUploader() {
  const photos = useHandoverStore((s) => s.photos)
  const addPhoto = useHandoverStore((s) => s.addPhoto)
  const removePhoto = useHandoverStore((s) => s.removePhoto)
  const inputRef = useRef<HTMLInputElement>(null)
  const [processing, setProcessing] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setProcessing(true)
    try {
      const dataUrl = await correctImageOrientation(file)
      addPhoto(dataUrl)
    } catch {
      const reader = new FileReader()
      reader.onload = (ev) => {
        addPhoto(ev.target!.result as string)
      }
      reader.readAsDataURL(file)
    } finally {
      setProcessing(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const remaining = 3 - photos.length
  const metMin = photos.length >= MIN_PHOTOS

  return (
    <div className="space-y-3">
      <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
        <Camera className="w-7 h-7" />
        拍照上传
        <span className={`text-lg font-normal ${metMin ? 'text-green-500' : 'text-red-400'}`}>
          （{photos.length}/3，至少 {MIN_PHOTOS} 张）
        </span>
      </h2>

      <div className="grid grid-cols-3 gap-3">
        {photos.map((photo, i) => (
          <div key={i} className="relative aspect-square rounded-2xl overflow-hidden shadow-sm border-2 border-orange-200">
            <img src={photo} alt={`照片${i + 1}`} className="w-full h-full object-cover" />
            <button
              onClick={() => removePhoto(i)}
              className="absolute top-1 right-1 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <div className="absolute bottom-1 left-1 bg-black/40 text-white text-xs px-2 py-0.5 rounded-full">
              {i + 1}/3
            </div>
          </div>
        ))}

        {Array.from({ length: remaining }).map((_, i) => (
          <button
            key={`empty-${i}`}
            onClick={() => inputRef.current?.click()}
            disabled={processing}
            className={`
              aspect-square rounded-2xl border-3 border-dashed flex flex-col items-center justify-center gap-2
              transition-all active:scale-95
              ${processing
                ? 'border-gray-200 bg-gray-50'
                : 'border-orange-300 bg-orange-50/50 hover:bg-orange-50 hover:border-orange-400'
              }
            `}
          >
            {processing ? (
              <div className="w-8 h-8 border-3 border-orange-300 border-t-orange-500 rounded-full animate-spin" />
            ) : (
              <>
                <ImageIcon className="w-10 h-10 text-orange-300" />
                <span className="text-base text-orange-400 font-medium">点击拍照</span>
              </>
            )}
          </button>
        ))}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {!metMin && (
        <p className="text-center text-red-400 text-base font-medium">
          请至少拍摄 {MIN_PHOTOS} 张现场照片
        </p>
      )}
    </div>
  )
}
