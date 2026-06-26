import React from 'react';
import { X, Users } from 'lucide-react';
import { Guest } from '../../types';
import { useDraggable } from '@dnd-kit/core';

interface TableGuestProps {
  guest: Guest;
  position: { x: number; y: number };
  onRemove: () => void;
}

export const TableGuest: React.FC<TableGuestProps> = ({ guest, position, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `table-guest-${guest.id}`,
    data: { type: 'table-guest', guestId: guest.id, fromTableId: guest.tableId },
  });

  const style: React.CSSProperties = {
    left: `${position.x}%`,
    top: `${position.y}%`,
    transform: transform
      ? `translate(-50%, -50%) translate3d(${transform.x}px, ${transform.y}px, 0) scale(${isDragging ? 1.1 : 1})`
      : 'translate(-50%, -50%)',
    zIndex: isDragging ? 100 : 10,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        table-guest
        flex items-center gap-1
        px-2 py-1
        bg-white rounded-full
        border border-champagne-300
        shadow-sm
        cursor-grab select-none
        hover:shadow-md
        transition-all duration-200
        ${isDragging ? 'dragging opacity-80 shadow-lg' : ''}
      `}
    >
      <span className="text-xs font-medium text-espresso-800 truncate max-w-[80px]">
        {guest.name}
      </span>
      <span className="text-xs text-champagne-600 font-semibold">({guest.count})</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="
          p-0.5 rounded-full
          text-espresso-400 hover:text-rose-500 hover:bg-rose-50
          transition-colors
        "
      >
        <X size={12} />
      </button>
    </div>
  );
};
