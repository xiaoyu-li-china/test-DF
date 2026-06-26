import React, { useMemo, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Trash2, Settings, X, Check, Crown, Baby } from 'lucide-react';
import { Table, Guest, TABLE_TAG_CONFIG, TableTag } from '../../types';
import { TableGuest } from './TableGuest';
import { useAppStore } from '../../store/useAppStore';

interface RoundTableProps {
  table: Table;
  guests: Guest[];
  guestCount: number;
  isOverCapacity: boolean;
}

const TAG_ICONS: Record<TableTag, React.ReactNode> = {
  main: <Crown size={12} />,
  kids: <Baby size={12} />,
  normal: null,
};

export const RoundTable: React.FC<RoundTableProps> = ({
  table,
  guests,
  guestCount,
  isOverCapacity,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `table-${table.id}`,
    data: { type: 'table', tableId: table.id },
  });
  const assignGuestToTable = useAppStore((state) => state.assignGuestToTable);
  const removeTable = useAppStore((state) => state.removeTable);
  const updateTableCapacity = useAppStore((state) => state.updateTableCapacity);
  const updateTableTag = useAppStore((state) => state.updateTableTag);
  const [showSettings, setShowSettings] = useState(false);
  const [newCapacity, setNewCapacity] = useState(table.capacity.toString());
  const [selectedTag, setSelectedTag] = useState<TableTag>(table.tag);

  const tagConfig = TABLE_TAG_CONFIG[table.tag];

  const guestPositions = useMemo(() => {
    const positions: { x: number; y: number }[] = [];
    const count = guests.length;
    const radius = 35;
    const centerX = 50;
    const centerY = 50;

    guests.forEach((_, index) => {
      const angle = (index / count) * 2 * Math.PI - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      positions.push({ x, y });
    });

    return positions;
  }, [guests.length]);

  const handleRemoveGuest = (guestId: string) => {
    assignGuestToTable(guestId, null);
  };

  const handleSaveSettings = () => {
    const capacity = parseInt(newCapacity);
    if (!isNaN(capacity) && capacity >= 1) {
      updateTableCapacity(table.id, capacity);
    }
    updateTableTag(table.id, selectedTag);
    setShowSettings(false);
  };

  const occupancyRate = (guestCount / table.capacity) * 100;

  return (
    <div className="relative group animate-bounce-in">
      <div
        ref={setNodeRef}
        className={`
          relative
          w-64 h-64
          rounded-full
          bg-gradient-to-br from-champagne-100 to-champagne-200
          border-4
          shadow-lg
          transition-all duration-300
          ${isOverCapacity ? 'border-red-500 animate-pulse-border' : ''}
          ${isOver ? 'scale-105 shadow-xl' : ''}
        `}
        style={{
          borderColor: isOverCapacity ? '#EF4444' : table.color,
          background: table.tag === 'kids'
            ? 'linear-gradient(135deg, #E1F5FE 0%, #B3E5FC 100%)'
            : table.tag === 'main'
            ? 'linear-gradient(135deg, #FFF8F0 0%, #F5E6D3 100%)'
            : undefined,
        }}
      >
        <div
          className="
            absolute inset-4
            rounded-full
            bg-gradient-to-br from-champagne-50 to-white
            border-2 border-champagne-200
            flex flex-col items-center justify-center
          "
          style={table.tag === 'kids' ? {
            background: 'linear-gradient(135deg, #E1F5FE 0%, #FFFFFF 100%)',
            borderColor: '#4FC3F7',
          } : table.tag === 'main' ? {
            borderColor: '#C9A96E',
          } : undefined}
        >
          {table.tag !== 'normal' && (
            <div
              className="
                absolute -top-1 left-1/2 -translate-x-1/2
                flex items-center gap-1
                px-2 py-0.5 rounded-full text-white text-xs font-semibold
                shadow-sm
              "
              style={{ backgroundColor: tagConfig.color }}
            >
              {TAG_ICONS[table.tag]}
              {tagConfig.label}
            </div>
          )}
          <span className="font-display text-2xl font-bold text-espresso-800">
            {table.tableNumber}
          </span>
          <span className="text-xs text-espresso-500 mt-1">号桌</span>
          <div className="mt-2 px-2 py-0.5 rounded-full bg-white/80">
            <span
              className={`text-xs font-semibold ${
                isOverCapacity ? 'text-red-500' : 'text-champagne-700'
              }`}
            >
              {guestCount} / {table.capacity} 人
            </span>
          </div>
        </div>

        {guests.map((guest, index) => (
          <TableGuest
            key={guest.id}
            guest={guest}
            position={guestPositions[index]}
            onRemove={() => handleRemoveGuest(guest.id)}
          />
        ))}

        <div
          className="
            absolute -bottom-2 left-1/2 -translate-x-1/2
            w-3/4 h-2
            bg-champagne-300/50 rounded-full
          "
        />
      </div>

      <div
        className="
          absolute -top-2 -right-2
          flex gap-1
          opacity-0 group-hover:opacity-100
          transition-opacity duration-200
        "
      >
        <button
          onClick={() => {
            setNewCapacity(table.capacity.toString());
            setSelectedTag(table.tag);
            setShowSettings(true);
          }}
          className="
            p-1.5 rounded-full
            bg-white shadow-md
            text-espresso-500 hover:text-champagne-600 hover:bg-champagne-50
            transition-colors
          "
          title="设置"
        >
          <Settings size={14} />
        </button>
        <button
          onClick={() => {
            if (confirm(`确定删除第 ${table.tableNumber} 桌吗？`)) {
              removeTable(table.id);
            }
          }}
          className="
            p-1.5 rounded-full
            bg-white shadow-md
            text-espresso-500 hover:text-red-500 hover:bg-red-50
            transition-colors
          "
          title="删除桌子"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div
        className="
          absolute -bottom-4 left-1/2 -translate-x-1/2
          w-16 h-1.5 rounded-full
          bg-espresso-200 overflow-hidden
        "
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isOverCapacity ? 'bg-red-500' : 'bg-champagne-500'
          }`}
          style={{ width: `${Math.min(occupancyRate, 100)}%` }}
        />
      </div>

      {showSettings && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 z-50">
          <div
            className="
              bg-white rounded-lg shadow-xl p-4
              border border-champagne-200
              min-w-[220px]
            "
          >
            <div className="mb-3">
              <span className="text-sm text-espresso-700 font-medium block mb-2">桌型</span>
              <div className="flex gap-2">
                {(['main', 'kids', 'normal'] as TableTag[]).map((tag) => {
                  const cfg = TABLE_TAG_CONFIG[tag];
                  return (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(tag)}
                      className={`
                        flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                        border transition-all
                        ${selectedTag === tag
                          ? 'text-white shadow-sm'
                          : 'text-espresso-600 border-champagne-200 hover:border-champagne-400'
                        }
                      `}
                      style={selectedTag === tag ? {
                        backgroundColor: cfg.color,
                        borderColor: cfg.color,
                      } : undefined}
                    >
                      {TAG_ICONS[tag]}
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mb-3">
              <span className="text-sm text-espresso-700 font-medium block mb-1">容量</span>
              <input
                type="number"
                value={newCapacity}
                onChange={(e) => setNewCapacity(e.target.value)}
                className="
                  w-full px-3 py-1.5
                  border border-champagne-300 rounded-lg
                  text-sm text-espresso-700
                  focus:outline-none focus:border-champagne-500
                "
                min="1"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSettings(false)}
                className="px-3 py-1 rounded text-sm text-espresso-400 hover:bg-espresso-50"
              >
                <X size={16} />
              </button>
              <button
                onClick={handleSaveSettings}
                className="px-3 py-1 rounded text-sm text-white bg-champagne-500 hover:bg-champagne-600"
              >
                <Check size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
