import { CHECK_GROUPS, useHandoverStore } from '@/store/useHandoverStore'
import type { CheckGroup } from '@/store/useHandoverStore'
import { CheckSquare, Square } from 'lucide-react'

function CheckGroupCard({ group }: { group: CheckGroup }) {
  const checkedItems = useHandoverStore((s) => s.checkedItems)
  const toggleCheckItem = useHandoverStore((s) => s.toggleCheckItem)
  const toggleAllInGroup = useHandoverStore((s) => s.toggleAllInGroup)

  const keys = group.items.map((item) => `${group.name}::${item}`)
  const allChecked = keys.every((k) => checkedItems.has(k))
  const someChecked = keys.some((k) => checkedItems.has(k))

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
        <span className="text-2xl font-bold text-gray-800">
          {group.emoji} {group.name}
        </span>
        <button
          onClick={() => toggleAllInGroup(group)}
          className={`
            px-4 py-2 rounded-xl text-lg font-semibold transition-all active:scale-95
            ${allChecked
              ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
              : someChecked
                ? 'bg-orange-100 text-orange-700'
                : 'bg-gray-100 text-gray-500'
            }
          `}
        >
          {allChecked ? '✓ 全选' : '全选'}
        </button>
      </div>
      <div className="divide-y divide-gray-50">
        {group.items.map((item) => {
          const key = `${group.name}::${item}`
          const checked = checkedItems.has(key)
          return (
            <button
              key={key}
              onClick={() => toggleCheckItem(key)}
              className={`
                w-full flex items-center gap-4 px-5 py-4 transition-all active:scale-[0.98]
                ${checked ? 'bg-orange-50/60' : 'bg-white hover:bg-gray-50'}
              `}
            >
              {checked ? (
                <CheckSquare className="w-7 h-7 text-orange-500 flex-shrink-0" />
              ) : (
                <Square className="w-7 h-7 text-gray-300 flex-shrink-0" />
              )}
              <span className={`text-xl ${checked ? 'text-gray-800 font-semibold' : 'text-gray-500'}`}>
                {item}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function CheckList() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">
        📋 检查项目
      </h2>
      {CHECK_GROUPS.map((group) => (
        <CheckGroupCard key={group.name} group={group} />
      ))}
    </div>
  )
}
