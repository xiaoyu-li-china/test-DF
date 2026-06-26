import { useRef } from 'react'
import { useBookingStore } from '@/store/bookingStore'
import { Upload, X, FileText, Image, File } from 'lucide-react'
import type { UploadedFile } from '@/types'

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]

const MAX_SIZE = 10 * 1024 * 1024
const MAX_FILES = 5

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return Image
  if (type === 'application/pdf') return FileText
  return File
}

export default function FileUpload() {
  const { uploadedFiles, addUploadedFile, removeUploadedFile, selectedType, selectedSlot } =
    useBookingStore()
  const inputRef = useRef<HTMLInputElement>(null)

  const canUpload = selectedType && selectedSlot

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!ACCEPTED_TYPES.includes(file.type)) continue
      if (file.size > MAX_SIZE) continue
      if (uploadedFiles.length >= MAX_FILES) break

      const uploadedFile: UploadedFile = {
        id: `${Date.now()}-${i}`,
        name: file.name,
        type: file.type,
        size: file.size,
      }

      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (ev) => {
          uploadedFile.previewUrl = ev.target?.result as string
          addUploadedFile(uploadedFile)
        }
        reader.readAsDataURL(file)
      } else {
        addUploadedFile(uploadedFile)
      }
    }

    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <h2 className="font-serif text-lg font-semibold text-brand mb-3">
        上传相关材料
      </h2>

      {!canUpload ? (
        <div className="bg-surface-warm rounded-xl p-6 text-center">
          <p className="text-sm text-gray-400">请先选择咨询类型和时段</p>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.gif"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploadedFiles.length >= MAX_FILES}
            className={`w-full py-4 rounded-xl border-2 border-dashed transition-all duration-200 flex flex-col items-center gap-2 ${
              uploadedFiles.length >= MAX_FILES
                ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                : 'border-gray-300 bg-white hover:border-brand/40 hover:bg-brand/5'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              uploadedFiles.length >= MAX_FILES ? 'bg-gray-100' : 'bg-brand/10'
            }`}>
              <Upload className={`w-5 h-5 ${
                uploadedFiles.length >= MAX_FILES ? 'text-gray-300' : 'text-brand'
              }`} />
            </div>
            <div className="text-center">
              <p className={`text-sm font-medium ${
                uploadedFiles.length >= MAX_FILES ? 'text-gray-300' : 'text-gray-600'
              }`}>
                {uploadedFiles.length >= MAX_FILES ? '已达上传上限' : '点击上传材料'}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                支持 PDF、JPG、PNG，单个不超过 10MB，最多 {MAX_FILES} 个
              </p>
            </div>
          </button>

          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              {uploadedFiles.map((file) => {
                const Icon = getFileIcon(file.type)
                return (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-3"
                  >
                    {file.previewUrl ? (
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={file.previewUrl}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-red-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">{file.name}</p>
                      <p className="text-[10px] text-gray-400">{formatSize(file.size)}</p>
                    </div>
                    <button
                      onClick={() => removeUploadedFile(file.id)}
                      className="w-7 h-7 rounded-full hover:bg-red-50 flex items-center justify-center flex-shrink-0 transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-400 hover:text-red-400" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
