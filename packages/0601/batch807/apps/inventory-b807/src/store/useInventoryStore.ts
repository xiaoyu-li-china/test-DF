import { create } from 'zustand';
import type { SKUItem } from '../types';

interface InventoryState {
  items: SKUItem[];
  isConnected: boolean;
  lastUpdateTime: string | null;
  historyData: { timestamp: string; items: SKUItem[] }[];
  setItems: (items: SKUItem[]) => void;
  updateItems: (items: SKUItem[]) => void;
  setConnected: (connected: boolean) => void;
  addHistory: (timestamp: string, items: SKUItem[]) => void;
}

export const useInventoryStore = create<InventoryState>((set) => ({
  items: [],
  isConnected: false,
  lastUpdateTime: null,
  historyData: [],
  setItems: (items) => set({ items, lastUpdateTime: new Date().toISOString() }),
  updateItems: (items) => set({ items, lastUpdateTime: new Date().toISOString() }),
  setConnected: (isConnected) => set({ isConnected }),
  addHistory: (timestamp, items) =>
    set((state) => ({
      historyData: [...state.historyData.slice(-19), { timestamp, items }],
    })),
}));
