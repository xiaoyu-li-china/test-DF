import type { Photo, Scene, PhotoStatus } from '@/data/mockPhotos'

export function generateTestPhotos(count: number = 50): Photo[] {
  const scenes: Scene[] = ['ceremony', 'reception', 'outdoor']
  return Array.from({ length: count }, (_, i) => {
    const scene = scenes[i % scenes.length]
    return {
      id: `test-${scene}-${i + 1}`,
      src: `/test-images/${scene}-${i + 1}.jpg`,
      status: 'undecided' as PhotoStatus,
      order: i + 1,
      scene,
      locked: false,
      note: '',
    }
  })
}

export function createTestPhoto(overrides: Partial<Photo> = {}): Photo {
  return {
    id: 'test-photo-1',
    src: '/test-images/photo-1.jpg',
    status: 'undecided' as PhotoStatus,
    order: 1,
    scene: 'ceremony' as Scene,
    locked: false,
    note: '',
    ...overrides,
  }
}
