// ============================================================================
// 照片数据结构与 SaaS API 对接说明
// ============================================================================
// 以下是当前 Portal 数据模型与摄影师 SaaS API 的映射关系
//
// 当前模型字段 → SaaS API 返回字段
// ----------------------------------------------------------------------------
// Photo.id            → photo_id / uuid          (唯一标识，与 API 保持一致)
// Photo.src          → thumbnail_url          (缩略图 URL，API 返回 CDN 地址)
// Photo.status       → selection_status     (用户选择状态: 'selected' | 'rejected' | 'undecided')
// Photo.scene        → scene_category       (场景分组: 'ceremony' | 'reception' | 'outdoor')
// Photo.locked       → is_locked        (摄影师锁定标记，布尔值)
// Photo.note         → customer_note      (新人备注)
// Photo.order        → display_order    (显示顺序)
//
// SaaS API 集成清单
// ----------------------------------------------------------------------------
// 1. GET /api/albums/{albumId}/photos
//    → 加载相册照片列表
//    Query: { scene?: string, status?: string }
//    Response: { photos: Photo[], albumInfo: Album }
//
// 2. PATCH /api/albums/{albumId}/photos/{photoId}
//    → 更新单张照片选择状态
//    Body: { status: PhotoStatus, note?: string }
//
// 3. POST /api/albums/{albumId}/selections/batch
//    → 批量提交选片结果
//    Body: { selections: Array<{ photoId: string, status: PhotoStatus, note?: string } }
//
// 4. GET /api/albums/{albumId}/selections/export
//    → 导出选片清单 (CSV/PDF)
// ============================================================================

export type PhotoStatus = 'selected' | 'rejected' | 'undecided'
export type Scene = 'ceremony' | 'reception' | 'outdoor'

export interface Photo {
  id: string
  src: string
  status: PhotoStatus
  order: number
  scene: Scene
  locked: boolean
  note: string
}

export const SCENE_LABELS: Record<Scene, string> = {
  ceremony: '仪式',
  reception: '晚宴',
  outdoor: '外景',
}

const SCENES: Scene[] = ['ceremony', 'reception', 'outdoor']
const SCENE_COUNTS: Record<Scene, number> = {
  ceremony: 80,
  reception: 80,
  outdoor: 80,
}

const LOCKED_INDICES = new Set([
  'ceremony-1', 'ceremony-2', 'ceremony-3',
  'reception-1', 'reception-2',
  'outdoor-1', 'outdoor-2', 'outdoor-3', 'outdoor-4',
])

function generatePhotos(): Photo[] {
  const photos: Photo[] = []
  let order = 1

  for (const scene of SCENES) {
    const count = SCENE_COUNTS[scene]
    for (let i = 1; i <= count; i++) {
      const id = `${scene}-${i}`
      photos.push({
        id,
        src: `https://picsum.photos/seed/wedding-${scene}-${i}/400/300`,
        status: LOCKED_INDICES.has(id) ? 'selected' : ('undecided' as PhotoStatus),
        order: order++,
        scene,
        locked: LOCKED_INDICES.has(id),
        note: '',
      })
    }
  }

  return photos
}

export const mockPhotos: Photo[] = generatePhotos()

export const COUPLE_NAME = '子轩 & 梓萱'
export const WEDDING_DATE = '2026年5月20日'
export const WELCOME_MESSAGE = '每一帧都是爱的见证，请慢慢挑选属于你们的瞬间'
