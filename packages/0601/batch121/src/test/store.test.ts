import { describe, it, expect, beforeEach } from 'vitest'
import {
  useHandoverStore,
  CHECK_GROUPS,
  ALL_ITEM_KEYS,
  MIN_PHOTOS,
  ROOMS,
} from '@/store/useHandoverStore'

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

describe('房间选择', () => {
  it('选择房间后 roomNumber 更新且 step 前进到 1', () => {
    const store = useHandoverStore.getState()
    store.setRoomNumber('201')
    const next = useHandoverStore.getState()
    expect(next.roomNumber).toBe('201')
    expect(next.step).toBe(1)
  })

  it('切换房间号可以覆盖之前的选择', () => {
    const store = useHandoverStore.getState()
    store.setRoomNumber('101')
    store.setRoomNumber('303')
    expect(useHandoverStore.getState().roomNumber).toBe('303')
  })

  it('ROOMS 包含所有 12 个房间', () => {
    expect(ROOMS).toHaveLength(12)
    expect(ROOMS).toContain('101')
    expect(ROOMS).toContain('403')
  })
})

describe('检查项勾选', () => {
  it('toggleCheckItem 添加和移除单项', () => {
    const store = useHandoverStore.getState()
    const key = '床品::被套更换'
    store.toggleCheckItem(key)
    expect(useHandoverStore.getState().checkedItems.has(key)).toBe(true)

    store.toggleCheckItem(key)
    expect(useHandoverStore.getState().checkedItems.has(key)).toBe(false)
  })

  it('toggleAllInGroup 一键全选/取消全选', () => {
    const store = useHandoverStore.getState()
    const bedGroup = CHECK_GROUPS.find((g) => g.name === '床品')!
    store.toggleAllInGroup(bedGroup)

    const bedKeys = bedGroup.items.map((i) => `床品::${i}`)
    bedKeys.forEach((k) => {
      expect(useHandoverStore.getState().checkedItems.has(k)).toBe(true)
    })

    store.toggleAllInGroup(bedGroup)
    bedKeys.forEach((k) => {
      expect(useHandoverStore.getState().checkedItems.has(k)).toBe(false)
    })
  })

  it('不同分组的同名项不会互相干扰', () => {
    const store = useHandoverStore.getState()
    store.toggleCheckItem('床品::被套更换')
    expect(useHandoverStore.getState().checkedItems.has('床品::被套更换')).toBe(true)
    expect(useHandoverStore.getState().checkedItems.has('卫浴::被套更换')).toBe(false)
  })

  it('全部检查项数量为 14', () => {
    expect(ALL_ITEM_KEYS).toHaveLength(14)
  })

  it('getMissingItems 返回所有未勾选项', () => {
    const store = useHandoverStore.getState()
    expect(store.getMissingItems()).toHaveLength(14)

    const bedGroup = CHECK_GROUPS.find((g) => g.name === '床品')!
    store.toggleAllInGroup(bedGroup)
    expect(store.getMissingItems()).toHaveLength(14 - 4)
  })
})

describe('照片数量校验', () => {
  it('addPhoto 正常添加照片', () => {
    const store = useHandoverStore.getState()
    store.addPhoto('data:image1')
    store.addPhoto('data:image2')
    expect(useHandoverStore.getState().photos).toHaveLength(2)
  })

  it('最多只能添加 3 张照片', () => {
    const store = useHandoverStore.getState()
    store.addPhoto('data:image1')
    store.addPhoto('data:image2')
    store.addPhoto('data:image3')
    store.addPhoto('data:image4')
    expect(useHandoverStore.getState().photos).toHaveLength(3)
  })

  it('MIN_PHOTOS 为 2', () => {
    expect(MIN_PHOTOS).toBe(2)
  })

  it('removePhoto 按索引删除照片', () => {
    const store = useHandoverStore.getState()
    store.addPhoto('data:image1')
    store.addPhoto('data:image2')
    store.removePhoto(0)
    expect(useHandoverStore.getState().photos).toEqual(['data:image2'])
  })
})

describe('提交交接', () => {
  function prepareFullState() {
    const store = useHandoverStore.getState()
    store.setRoomNumber('101')
    CHECK_GROUPS.forEach((g) => store.toggleAllInGroup(g))
    store.addPhoto('data:photo1')
    store.addPhoto('data:photo2')
  }

  it('未选房间时提交返回 null', () => {
    const store = useHandoverStore.getState()
    CHECK_GROUPS.forEach((g) => store.toggleAllInGroup(g))
    store.addPhoto('data:p1')
    store.addPhoto('data:p2')
    expect(store.submit()).toBeNull()
  })

  it('有缺项时提交返回 null', () => {
    const store = useHandoverStore.getState()
    store.setRoomNumber('101')
    store.addPhoto('data:p1')
    store.addPhoto('data:p2')
    expect(store.submit()).toBeNull()
  })

  it('照片不足 2 张时提交返回 null', () => {
    const store = useHandoverStore.getState()
    store.setRoomNumber('101')
    CHECK_GROUPS.forEach((g) => store.toggleAllInGroup(g))
    store.addPhoto('data:only1')
    expect(store.submit()).toBeNull()
  })

  it('条件全部满足时提交成功返回 record', () => {
    prepareFullState()
    const record = useHandoverStore.getState().submit()
    expect(record).not.toBeNull()
    expect(record!.roomNumber).toBe('101')
    expect(record!.checkedItems).toHaveLength(14)
    expect(record!.photos).toHaveLength(2)
    expect(record!.dateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('提交后 record 存入 localStorage', () => {
    prepareFullState()
    useHandoverStore.getState().submit()
    const saved = JSON.parse(localStorage.getItem('handover_records')!)
    expect(saved).toHaveLength(1)
    expect(saved[0].roomNumber).toBe('101')
  })

  it('提交后 checkedItems 正确转换为纯文本（无分组前缀）', () => {
    prepareFullState()
    const record = useHandoverStore.getState().submit()
    expect(record!.checkedItems).toContain('被套更换')
    expect(record!.checkedItems).not.toContain('床品::被套更换')
  })

  it('提交成功后 reset 清空表单状态', () => {
    prepareFullState()
    useHandoverStore.getState().submit()
    useHandoverStore.getState().reset()
    const state = useHandoverStore.getState()
    expect(state.roomNumber).toBe('')
    expect(state.checkedItems.size).toBe(0)
    expect(state.photos).toHaveLength(0)
    expect(state.step).toBe(0)
  })
})

describe('角色切换', () => {
  it('默认角色为 cleaner', () => {
    expect(useHandoverStore.getState().role).toBe('cleaner')
  })

  it('切换为 manager 后角色更新', () => {
    useHandoverStore.getState().setRole('manager')
    expect(useHandoverStore.getState().role).toBe('manager')
  })

  it('角色持久化到 localStorage', () => {
    useHandoverStore.getState().setRole('manager')
    expect(localStorage.getItem('handover_role')).toBe('manager')
  })
})
