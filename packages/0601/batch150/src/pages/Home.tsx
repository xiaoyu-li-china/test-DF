import React from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Toolbar } from '../components/Toolbar/Toolbar';
import { GuestList } from '../components/GuestList/GuestList';
import { TableCanvas } from '../components/TableCanvas/TableCanvas';
import { StatsPanel } from '../components/StatsPanel/StatsPanel';
import { GuestItem } from '../components/GuestList/GuestItem';
import { useAppStore } from '../store/useAppStore';
import { Guest } from '../types';

export default function Home() {
  const assignGuestToTable = useAppStore((state) => state.assignGuestToTable);
  const addTable = useAppStore((state) => state.addTable);
  const guests = useAppStore((state) => state.guests);
  const [activeGuest, setActiveGuest] = React.useState<Guest | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: any) => {
    const { active } = event;
    const guestId = active.data.current?.guestId;
    if (guestId) {
      const guest = guests.find((g) => g.id === guestId);
      setActiveGuest(guest || null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveGuest(null);

    if (!over) return;

    const guestId = active.data.current?.guestId;
    if (!guestId) return;

    const overId = over.id.toString();

    if (overId.startsWith('table-')) {
      const tableId = overId.replace('table-', '');
      assignGuestToTable(guestId, tableId);
    }
  };

  const handleAddTable = () => {
    addTable(10);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-screen flex flex-col bg-champagne-100/50">
        <Toolbar />

        <div className="flex-1 flex gap-4 p-4 overflow-hidden">
          <div className="w-72 flex-shrink-0">
            <GuestList />
          </div>

          <div className="flex-1 min-w-0">
            <TableCanvas onAddTable={handleAddTable} />
          </div>

          <div className="w-64 flex-shrink-0">
            <StatsPanel />
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeGuest && (
          <div className="opacity-80 scale-105">
            <GuestItem guest={activeGuest} showRemove={false} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
