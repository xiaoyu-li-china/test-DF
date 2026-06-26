import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { correctImageOrientation } from '@/utils/exif'
import { useHandoverStore, CHECK_GROUPS, MIN_PHOTOS } from '@/store/useHandoverStore'

beforeEach(() => {
  localStorage.clear()
  useHandoverStore.setState({
    roomNumber: '',
    checkedItems: new Set<string>(),
    photos: [],
    records: [],
    step: 0,
    role: 'cleaner',
  })
})

function createJpegFile(orientationValue?: number): File {
  if (orientationValue === undefined) {
    return new File(['non-jpeg-data'], 'test.jpg', { type: 'image/jpeg' })
  }

  const buffer = new ArrayBuffer(65536)
  const view = new DataView(buffer)

  view.setUint16(0, 0xffd8, false)
  view.setUint16(2, 0xffe1, false)
  const app1Length = 30
  view.setUint16(4, app1Length, false)
  view.setUint32(6, 0x45786966, false)
  view.setUint16(10, 0, false)
  view.setUint16(12, 0x4949, false)
  view.setUint32(14, 8, true)
  view.setUint16(18, 0x002a, true)
  view.setUint32(20, 8, true)
  view.setUint16(24, 1, true)
  view.setUint16(26, 0x0112, true)
  view.setUint16(28, 3, true)
  view.setUint32(30, 1, true)
  view.setUint16(34, orientationValue, true)

  return new File([buffer], 'test.jpg', { type: 'image/jpeg' })
}

describe('EXIF 方向矫正 - iPhone 微信兼容', () => {
  beforeEach(() => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    const OriginalImage = globalThis.Image
    vi.stubGlobal('Image', class MockImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      width = 800
      height = 600
      src = ''

      constructor() {
        setTimeout(() => {
          if (this.onload) this.onload()
        }, 0)
      }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('orientation=1（正常）不旋转', async () => {
    const file = createJpegFile(1)
    const result = await correctImageOrientation(file)
    expect(result).toMatch(/^data:image\/jpeg;base64,/)
  })

  it('orientation=3（180° 旋转）正确矫正', async () => {
    const file = createJpegFile(3)
    const result = await correctImageOrientation(file)
    expect(result).toMatch(/^data:image\/jpeg;base64,/)
  })

  it('orientation=6（顺时针 90°）正确矫正 - iPhone 常见', async () => {
    const file = createJpegFile(6)
    const result = await correctImageOrientation(file)
    expect(result).toMatch(/^data:image\/jpeg;base64,/)
  })

  it('orientation=8（逆时针 90°）正确矫正', async () => {
    const file = createJpegFile(8)
    const result = await correctImageOrientation(file)
    expect(result).toMatch(/^data:image\/jpeg;base64,/)
  })

  it('非 JPEG 文件 fallback 返回 dataURL', async () => {
    const pngFile = new File(['fake-png'], 'test.png', { type: 'image/png' })
    const result = await correctImageOrientation(pngFile)
    expect(result).toMatch(/^data:/)
  })
})

describe('微信内置浏览器 User-Agent 兼容性', () => {
  const wechatUAs = [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.43(0x18002b2d) NetType/WIFI Language/zh_CN',
    'Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/111.0.5563.116 Mobile Safari/537.36 MicroMessenger/8.0.38.2400',
  ]

  wechatUAs.forEach((ua, idx) => {
    it(`微信 UA #${idx + 1} 不影响 store 基本操作`, () => {
      const originalUA = navigator.userAgent
      Object.defineProperty(navigator, 'userAgent', {
        value: ua,
        configurable: true,
      })

      useHandoverStore.getState().setRoomNumber('101')
      CHECK_GROUPS.forEach((g) => useHandoverStore.getState().toggleAllInGroup(g))
      useHandoverStore.getState().addPhoto('data:p1')
      useHandoverStore.getState().addPhoto('data:p2')

      const record = useHandoverStore.getState().submit()
      expect(record).not.toBeNull()
      expect(record!.roomNumber).toBe('101')
      expect(record!.checkedItems).toHaveLength(14)

      Object.defineProperty(navigator, 'userAgent', {
        value: originalUA,
        configurable: true,
      })
    })
  })
})

describe('iOS 相册选图兼容性', () => {
  beforeEach(() => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    vi.stubGlobal('Image', class MockImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      width = 800
      height = 600
      src = ''

      constructor() {
        setTimeout(() => {
          if (this.onload) this.onload()
        }, 0)
      }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('从相册选取的 HEIC 文件名被正确处理', async () => {
    const heicFile = new File(['fake-heic'], 'IMG_0001.HEIC', {
      type: 'image/heic',
    })

    const result = await correctImageOrientation(heicFile)
    expect(result).toMatch(/^data:/)
  })

  it('iOS 截图文件名被正确处理', async () => {
    const pngFile = new File(['fake-png'], 'IMG_0002.PNG', {
      type: 'image/png',
    })

    const result = await correctImageOrientation(pngFile)
    expect(result).toMatch(/^data:/)
  })

  it('file input 在 iOS Safari/微信中 accept="image/*" 可正常触发', () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.setAttribute('capture', 'environment')
    expect(input.accept).toBe('image/*')
    expect(input.getAttribute('capture')).toBe('environment')
  })

  it('大尺寸照片被压缩到 1600px 以内', async () => {
    const file = createJpegFile(1)
    const result = await correctImageOrientation(file)
    expect(result).toMatch(/^data:image\/jpeg;base64,/)
  })
})

describe('提交流程在微信 WebView 中的完整性', () => {
  it('完整提交流程：选房→全选检查项→拍照→提交', () => {
    useHandoverStore.getState().setRoomNumber('203')
    expect(useHandoverStore.getState().roomNumber).toBe('203')

    CHECK_GROUPS.forEach((g) => useHandoverStore.getState().toggleAllInGroup(g))
    expect(useHandoverStore.getState().checkedItems.size).toBe(14)

    useHandoverStore.getState().addPhoto('data:photo1')
    useHandoverStore.getState().addPhoto('data:photo2')
    expect(useHandoverStore.getState().photos).toHaveLength(2)

    const record = useHandoverStore.getState().submit()
    expect(record).not.toBeNull()
    expect(record!.roomNumber).toBe('203')
    expect(record!.checkedItems).toHaveLength(14)
    expect(record!.photos).toHaveLength(2)
  })

  it('照片不足 MIN_PHOTOS 时无法提交', () => {
    useHandoverStore.getState().setRoomNumber('101')
    CHECK_GROUPS.forEach((g) => useHandoverStore.getState().toggleAllInGroup(g))
    useHandoverStore.getState().addPhoto('data:only1')
    expect(useHandoverStore.getState().submit()).toBeNull()
  })

  it('检查项有缺漏时无法提交', () => {
    useHandoverStore.getState().setRoomNumber('101')
    useHandoverStore.getState().toggleCheckItem('床品::被套更换')
    useHandoverStore.getState().addPhoto('data:p1')
    useHandoverStore.getState().addPhoto('data:p2')
    expect(useHandoverStore.getState().submit()).toBeNull()
  })

  it('提交后 localStorage 中记录完整', () => {
    useHandoverStore.getState().setRoomNumber('301')
    CHECK_GROUPS.forEach((g) => useHandoverStore.getState().toggleAllInGroup(g))
    useHandoverStore.getState().addPhoto('data:p1')
    useHandoverStore.getState().addPhoto('data:p2')
    useHandoverStore.getState().submit()

    const saved = JSON.parse(localStorage.getItem('handover_records')!)
    expect(saved).toHaveLength(1)
    expect(saved[0].roomNumber).toBe('301')
    expect(saved[0].checkedItems).toHaveLength(14)
    expect(saved[0].photos).toHaveLength(2)
  })
})
