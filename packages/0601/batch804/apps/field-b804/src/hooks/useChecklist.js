import { useState, useEffect } from 'react'
import client from '../services/client'

const FLOORS = ['F1', 'F2', 'F3', 'F4', 'F5']

const DEFAULT_ITEMS = (floorId) => [
  { id: `${floorId}_item_1`, title: '设备外观检查', description: '检查设备外壳是否有破损、变形', checked: false, floorId },
  { id: `${floorId}_item_2`, title: '电源连接检查', description: '检查电源线是否完好、连接是否牢固', checked: false, floorId },
  { id: `${floorId}_item_3`, title: '显示屏检查', description: '检查显示屏是否正常显示、有无坏点', checked: false, floorId },
  { id: `${floorId}_item_4`, title: '按键功能检查', description: '测试所有按键是否响应正常', checked: false, floorId },
  { id: `${floorId}_item_5`, title: '通信模块检查', description: '检查网络连接是否正常', checked: false, floorId },
  { id: `${floorId}_item_6`, title: '传感器校准', description: '检查传感器读数是否在正常范围内', checked: false, floorId },
  { id: `${floorId}_item_7`, title: '清洁保养', description: '清理设备表面灰尘和杂物', checked: false, floorId },
  { id: `${floorId}_item_8`, title: '记录签字', description: '巡检完成后确认签字', checked: false, floorId },
]

export function useChecklist() {
  const [floorId, setFloorId] = useState(client.getFloor())
  const [items, setItems] = useState([])

  useEffect(() => {
    const saved = client.getChecklist(floorId)
    if (saved.length > 0) {
      setItems(saved)
    } else {
      const defaults = DEFAULT_ITEMS(floorId)
      client.setChecklist(defaults, floorId)
      setItems(defaults)
    }
  }, [floorId])

  const toggleItem = (id) => {
    const updated = client.toggleCheckItem(id, floorId)
    setItems(updated)
  }

  const resetAll = () => {
    const updated = client.resetChecklist(floorId)
    setItems(updated)
  }

  const getProgress = () => {
    return client.getChecklistProgress(floorId)
  }

  const switchFloor = (newFloor) => {
    client.setFloor(newFloor)
    setFloorId(newFloor)
  }

  return {
    items,
    floorId,
    floors: FLOORS,
    toggleItem,
    resetAll,
    getProgress,
    switchFloor,
  }
}

export default useChecklist
