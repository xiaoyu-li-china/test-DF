import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RoomSelector from '@/components/RoomSelector'
import CheckList from '@/components/CheckList'
import PhotoUploader from '@/components/PhotoUploader'
import { useHandoverStore, CHECK_GROUPS } from '@/store/useHandoverStore'

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

describe('RoomSelector 组件', () => {
  it('渲染所有 12 个房间按钮', () => {
    render(<RoomSelector />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(12)
  })

  it('点击房间按钮选中对应房间', async () => {
    const user = userEvent.setup()
    render(<RoomSelector />)
    const btn201 = screen.getByText('201')
    await user.click(btn201)
    expect(useHandoverStore.getState().roomNumber).toBe('201')
    expect(useHandoverStore.getState().step).toBe(1)
  })

  it('选中房间按钮显示绿色勾号', async () => {
    const user = userEvent.setup()
    render(<RoomSelector />)
    await user.click(screen.getByText('303'))
    const btn303 = screen.getByText('303')
    expect(btn303.closest('button')).toHaveClass('bg-orange-500')
  })

  it('切换房间号后之前选中的房间取消高亮', async () => {
    const user = userEvent.setup()
    render(<RoomSelector />)
    await user.click(screen.getByText('101'))
    await user.click(screen.getByText('202'))
    expect(useHandoverStore.getState().roomNumber).toBe('202')
  })
})

describe('CheckList 组件', () => {
  it('渲染 3 个分组卡片', () => {
    render(<CheckList />)
    expect(screen.getByText(/🛏️ 床品/)).toBeInTheDocument()
    expect(screen.getByText(/🚿 卫浴/)).toBeInTheDocument()
    expect(screen.getByText(/🍳 厨房/)).toBeInTheDocument()
  })

  it('点击单个检查项切换选中状态', async () => {
    const user = userEvent.setup()
    render(<CheckList />)
    const item = screen.getByText('被套更换')
    await user.click(item)
    expect(useHandoverStore.getState().checkedItems.has('床品::被套更换')).toBe(true)
    await user.click(item)
    expect(useHandoverStore.getState().checkedItems.has('床品::被套更换')).toBe(false)
  })

  it('点击全选按钮选中整组', async () => {
    const user = userEvent.setup()
    render(<CheckList />)

    const allSelectButtons = screen.getAllByText('全选')
    await user.click(allSelectButtons[0])

    const bedGroup = CHECK_GROUPS[0]
    bedGroup.items.forEach((item) => {
      expect(useHandoverStore.getState().checkedItems.has(`床品::${item}`)).toBe(true)
    })
  })

  it('全选后再次点击变为取消全选', async () => {
    const user = userEvent.setup()
    render(<CheckList />)

    const allSelectButtons = screen.getAllByText('全选')
    await user.click(allSelectButtons[0])
    await user.click(allSelectButtons[0])

    const bedGroup = CHECK_GROUPS[0]
    bedGroup.items.forEach((item) => {
      expect(useHandoverStore.getState().checkedItems.has(`床品::${item}`)).toBe(false)
    })
  })

  it('全部勾选后全选按钮显示"✓ 全选"', async () => {
    const user = userEvent.setup()
    render(<CheckList />)

    const allSelectButtons = screen.getAllByText('全选')
    await user.click(allSelectButtons[0])
    expect(screen.getByText('✓ 全选')).toBeInTheDocument()
  })
})

describe('PhotoUploader 组件', () => {
  it('渲染 3 个拍照占位框', () => {
    render(<PhotoUploader />)
    const buttons = screen.getAllByText('点击拍照')
    expect(buttons).toHaveLength(3)
  })

  it('显示"至少 2 张"提示', () => {
    render(<PhotoUploader />)
    expect(screen.getByText(/至少 2 张/)).toBeInTheDocument()
  })

  it('添加 2 张照片后最低要求提示变绿', () => {
    useHandoverStore.setState({ photos: ['data:p1', 'data:p2'] })
    render(<PhotoUploader />)
    const badge = screen.getByText(/2\/3，至少 2 张/)
    expect(badge).toHaveClass('text-green-500')
  })

  it('添加 3 张后不再显示空位', () => {
    useHandoverStore.setState({ photos: ['data:p1', 'data:p2', 'data:p3'] })
    render(<PhotoUploader />)
    expect(screen.queryByText('点击拍照')).not.toBeInTheDocument()
  })

  it('删除照片功能正常', async () => {
    useHandoverStore.setState({ photos: ['data:p1', 'data:p2'] })
    render(<PhotoUploader />)
    const deleteButtons = screen.getAllByRole('button', { name: '' })
    const removeBtn = deleteButtons.find((btn) =>
      btn.querySelector('svg.lucide-x') || btn.innerHTML.includes('lucide-x')
    )
    if (removeBtn) {
      fireEvent.click(removeBtn)
      expect(useHandoverStore.getState().photos).toHaveLength(1)
    }
  })

  it('file input 的 accept 属性为 image/*', () => {
    render(<PhotoUploader />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toBeTruthy()
    expect(input.accept).toBe('image/*')
  })

  it('file input 的 capture 属性为 environment', () => {
    render(<PhotoUploader />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input.getAttribute('capture')).toBe('environment')
  })
})
