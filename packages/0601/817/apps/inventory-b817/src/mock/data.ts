import type { SKUItem } from '@/types'

const WAREHOUSES = ['华东仓', '华南仓', '华北仓', '西南仓']

const SKU_NAMES = [
  '电子元件-A1',
  '芯片模组-B3',
  '传感器-C7',
  '电池组-D2',
  '连接器-E5',
  '显示屏-F8',
  '电路板-G4',
  '散热器-H6',
  '电源模块-J1',
  '线缆组件-K9',
  '存储芯片-L3',
  '光学模块-M2',
  '继电器-N4',
  '变压器-P7',
  '滤波器-Q8',
]

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function generateInitialData(): SKUItem[] {
  return SKU_NAMES.map((name, i) => {
    const warehouse = WAREHOUSES[i % WAREHOUSES.length]
    const threshold = randInt(20, 80)
    const stock = randInt(5, 150)
    return {
      id: `SKU-${String(i + 1).padStart(3, '0')}`,
      name,
      warehouse,
      stock,
      threshold,
      updatedAt: Date.now(),
    }
  })
}

export function generateUpdate(skus: SKUItem[]): SKUItem {
  const idx = randInt(0, skus.length - 1)
  const base = skus[idx]
  const delta = randInt(-20, 15)
  const newStock = Math.max(0, base.stock + delta)
  return {
    ...base,
    stock: newStock,
    updatedAt: Date.now(),
  }
}

export function generateSnapshot(skus: SKUItem[]): SKUItem[] {
  return skus.map((s) => ({
    ...s,
    stock: Math.max(0, s.stock + randInt(-5, 5)),
    updatedAt: Date.now(),
  }))
}
