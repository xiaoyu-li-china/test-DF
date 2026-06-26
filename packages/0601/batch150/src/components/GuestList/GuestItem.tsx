import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { X, Users, AlertTriangle } from 'lucide-react';
import { Guest } from '../../types';
import { useAppStore } from '../../store/useAppStore';

interface GuestItemProps {
  guest: Guest;
  showRemove?: boolean;
  suggestion?: string;
}

export const GuestItem: React.FC<GuestItemProps> = ({ guest, showRemove = true, suggestion }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `guest-${guest.id}`,
    data: { type: 'guest', guestId: guest.id },
  });
  const removeGuest = useAppStore((state) => state.removeGuest);
  const assignGuestToTable = useAppStore((state) => state.assignGuestToTable);

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${isDragging ? 1.05 : 1})`,
        zIndex: isDragging ? 999 : 'auto',
      }
    : undefined;

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (guest.tableId) {
      assignGuestToTable(guest.id, null);
    } else {
      removeGuest(guest.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        flex items-center justify-between
        px-3 py-2 mb-2
        bg-white rounded-lg border border-champagne-200
        cursor-grab select-none
        transition-all duration-200
        hover:shadow-md hover:border-champagne-400
        ${isDragging ? 'dragging opacity-60 shadow-lg' : ''}
      `}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: getRelationshipColor(guest.relationship) }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="text-sm font-medium text-espresso-800 truncate">{guest.name}</p>
            {guest.allergens && (
              <span title={`过敏: ${guest.allergens}`}>
                <AlertTriangle size={12} className="text-amber-500 flex-shrink-0" />
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <p className="text-xs text-espresso-500 truncate">{guest.relationship}</p>
            {guest.allergens && (
              <span className="text-xs text-amber-600 truncate max-w-[80px]" title={guest.allergens}>
                · {guest.allergens}
              </span>
            )}
          </div>
          {suggestion && (
            <p className="text-xs text-blue-500 mt-0.5 truncate">{suggestion}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-champagne-600">
          <Users size={14} />
          <span className="text-xs font-semibold">{guest.count}</span>
        </div>
        {showRemove && (
          <button
            onClick={handleRemove}
            className="
              p-1 rounded
              text-espresso-400 hover:text-rose-500 hover:bg-rose-50
              transition-colors
            "
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

const getRelationshipColor = (relationship: string): string => {
  const colors: Record<string, string> = {
    '男方亲友': '#C9A96E',
    '女方亲友': '#E8A0BF',
    '同事': '#A07E54',
    '同学': '#7D6652',
    '朋友': '#DB6B97',
    '其他': '#B8A695',
  };
  return colors[relationship] || '#B8A695';
};
