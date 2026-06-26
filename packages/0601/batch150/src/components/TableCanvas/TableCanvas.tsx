import React from 'react';
import { useDroppable, DndContext } from '@dnd-kit/core';
import { CirclePlus } from 'lucide-react';
import { RoundTable } from './RoundTable';
import { useAppStore } from '../../store/useAppStore';

interface TableCanvasProps {
  onAddTable: () => void;
}

export const TableCanvas: React.FC<TableCanvasProps> = ({ onAddTable }) => {
  const tables = useAppStore((state) => state.tables);
  const getGuestsByTable = useAppStore((state) => state.getGuestsByTable);
  const getTableGuestCount = useAppStore((state) => state.getTableGuestCount);
  const isTableOverCapacity = useAppStore((state) => state.isTableOverCapacity);

  return (
    <div className="h-full flex flex-col bg-champagne-50/50 rounded-xl overflow-hidden">
      <div className="flex-1 overflow-auto p-8">
        {tables.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center">
            <div
              className="
                w-40 h-40
                rounded-full
                border-4 border-dashed border-champagne-300
                flex items-center justify-center
                mb-6
              "
            >
              <CirclePlus size={48} className="text-champagne-400" />
            </div>
            <p className="text-espresso-500 text-lg mb-4">还没有添加桌子</p>
            <p className="text-espresso-400 text-sm mb-6">点击下方按钮添加第一张圆桌</p>
            <button
              onClick={onAddTable}
              className="
                px-6 py-3 rounded-full
                bg-champagne-500 text-white
                font-medium
                hover:bg-champagne-600
                transition-colors
                shadow-lg hover:shadow-xl
              "
            >
              添加圆桌
            </button>
          </div>
        ) : (
          <div
            className="
              grid
              grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
              gap-12
              justify-items-center
            "
          >
            {tables.map((table) => (
              <RoundTable
                key={table.id}
                table={table}
                guests={getGuestsByTable(table.id)}
                guestCount={getTableGuestCount(table.id)}
                isOverCapacity={isTableOverCapacity(table.id)}
              />
            ))}

            <div className="flex items-center justify-center">
              <button
                onClick={onAddTable}
                className="
                  w-64 h-64
                  rounded-full
                  border-4 border-dashed border-champagne-300
                  flex flex-col items-center justify-center
                  text-champagne-400
                  hover:border-champagne-500 hover:text-champagne-500 hover:bg-champagne-100/50
                  transition-all duration-200
                  group
                "
              >
                <CirclePlus
                  size={48}
                  className="mb-2 group-hover:scale-110 transition-transform"
                />
                <span className="text-sm font-medium">添加圆桌</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
