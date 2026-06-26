const EXIF_ORIENTATIONS: Record<number, { rotate: number; scaleX: number; scaleY: number }> = {
  1: { rotate: 0, scaleX: 1, scaleY: 1 },
  2: { rotate: 0, scaleX: -1, scaleY: 1 },
  3: { rotate: 180, scaleX: 1, scaleY: 1 },
  4: { rotate: 180, scaleX: -1, scaleY: 1 },
  5: { rotate: 90, scaleX: -1, scaleY: 1 },
  6: { rotate: 90, scaleX: 1, scaleY: 1 },
  7: { rotate: 270, scaleX: -1, scaleY: 1 },
  8: { rotate: 270, scaleX: 1, scaleY: 1 },
}

function getExifOrientation(file: File): Promise<number> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const view = new DataView(e.target!.result as ArrayBuffer)
        if (view.getUint16(0, false) !== 0xffd8) {
          resolve(1)
          return
        }
        let offset = 2
        while (offset < view.byteLength - 2) {
          const marker = view.getUint16(offset, false)
          offset += 2
          if (marker === 0xffe1) {
            const length = view.getUint16(offset, false)
            const endian = view.getUint16(offset + 8, false)
            const isLittleEndian = endian === 0x4949
            const ifdOffset = view.getUint32(offset + 14, isLittleEndian)
            const tags = view.getUint16(offset + 10 + ifdOffset, isLittleEndian)
            for (let i = 0; i < tags; i++) {
              const tagOffset = offset + 12 + ifdOffset + i * 12
              if (view.getUint16(tagOffset, isLittleEndian) === 0x0112) {
                resolve(view.getUint16(tagOffset + 8, isLittleEndian))
                return
              }
            }
          }
          if ((marker & 0xff00) !== 0xff00) break
          offset += view.getUint16(offset, false)
        }
        resolve(1)
      } catch {
        resolve(1)
      }
    }
    reader.onerror = () => resolve(1)
    reader.readAsArrayBuffer(file.slice(0, 65536))
  })
}

export function correctImageOrientation(file: File): Promise<string> {
  return new Promise(async (resolve) => {
    const orientation = await getExifOrientation(file)
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const transform = EXIF_ORIENTATIONS[orientation] || EXIF_ORIENTATIONS[1]
      const radians = (transform.rotate * Math.PI) / 180
      const isRotated90 = transform.rotate === 90 || transform.rotate === 270
      const canvasW = isRotated90 ? img.height : img.width
      const canvasH = isRotated90 ? img.width : img.height

      const maxDim = 1600
      let scale = 1
      if (canvasW > maxDim || canvasH > maxDim) {
        scale = maxDim / Math.max(canvasW, canvasH)
      }

      const canvas = document.createElement('canvas')
      canvas.width = Math.round(canvasW * scale)
      canvas.height = Math.round(canvasH * scale)
      const ctx = canvas.getContext('2d')!

      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate(radians)
      ctx.scale(transform.scaleX, transform.scaleY)
      ctx.drawImage(img, -img.width * scale / 2, -img.height * scale / 2, img.width * scale, img.height * scale)

      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target!.result as string)
      reader.readAsDataURL(file)
    }
    img.src = url
  })
}
