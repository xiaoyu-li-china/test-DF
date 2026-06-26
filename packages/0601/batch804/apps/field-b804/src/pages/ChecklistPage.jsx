import React from 'react'
import useChecklist from '../hooks/useChecklist'

function ChecklistPage() {
  const { items, floorId, floors, toggleItem, resetAll, getProgress, switchFloor } = useChecklist()

  const handleKeyDown = (e, itemId) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggleItem(itemId)
    }
  }

  const handleResetKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      resetAll()
    }
  }

  const handleFloorKeyDown = (e, newFloor) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      switchFloor(newFloor)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 className="page-title">检查项列表</h2>
        <span style={{ fontSize: '14px', color: '#165DFF', fontWeight: 500 }}>
          {floorId} | 完成度: {getProgress()}%
        </span>
      </div>

      <div className="floor-selector" role="tablist" aria-label="楼层选择" style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        {floors.map(f => (
          <button
            key={f}
            role="tab"
            aria-selected={floorId === f}
            tabIndex={floorId === f ? 0 : -1}
            className={`tab-btn ${floorId === f ? 'active' : ''}`}
            onClick={() => switchFloor(f)}
            onKeyDown={(e) => handleFloorKeyDown(e, f)}
            style={{
              flex: '1 1 auto',
              minWidth: '56px',
              padding: '10px 16px',
              borderRadius: '8px',
              border: floorId === f ? '2px solid #165DFF' : '1px solid #e5e6eb',
              backgroundColor: floorId === f ? '#e8f3ff' : '#f7f8fa',
              color: floorId === f ? '#165DFF' : '#4e5969',
              fontWeight: floorId === f ? 600 : 400,
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="checklist-container">
        {items.map((item, index) => (
          <div 
            key={item.id} 
            className="checklist-item"
            tabIndex={0}
            onClick={() => toggleItem(item.id)}
            onKeyDown={(e) => handleKeyDown(e, item.id)}
            role="checkbox"
            aria-checked={item.checked}
            aria-label={`第${index + 1}项: ${item.title}`}
          >
            <div className="checkbox-wrapper">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => toggleItem(item.id)}
                tabIndex={-1}
                aria-hidden="true"
              />
            </div>
            <div className="checklist-item-content">
              <div className="checklist-item-title">
                {index + 1}. {item.title}
              </div>
              <div className="checklist-item-desc">
                {item.description}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '24px' }}>
        <button
          className="primary-btn"
          onClick={resetAll}
          onKeyDown={handleResetKeyDown}
          style={{ width: '100%' }}
        >
          重置 {floorId} 所有检查项
        </button>
      </div>
    </div>
  )
}

export default ChecklistPage
