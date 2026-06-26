import { create } from 'zustand';
import type { PriceRecord, Market } from '../types';
import { MARKETS } from '../types';
import { getTodayData, updateTodayData } from '../utils/storage';

interface PriceState {
  records: PriceRecord[];
  selectedCategory: string;
  isScrolling: boolean;
  isFullscreen: boolean;
  currentMarketId: string;
  markets: Market[];
  loadData: (marketId?: string) => void;
  updateRecords: (records: PriceRecord[]) => void;
  setSelectedCategory: (category: string) => void;
  toggleScrolling: () => void;
  toggleFullscreen: () => void;
  switchMarket: (marketId: string) => void;
  getCurrentMarket: () => Market;
}

export const usePriceStore = create<PriceState>((set, get) => ({
  records: [],
  selectedCategory: '',
  isScrolling: true,
  isFullscreen: false,
  currentMarketId: MARKETS[0].id,
  markets: MARKETS,

  loadData: (marketId?: string) => {
    const mId = marketId || get().currentMarketId;
    const records = getTodayData(mId);
    set({
      records,
      selectedCategory: records[0]?.category || '',
      currentMarketId: mId,
    });
  },

  updateRecords: (records: PriceRecord[]) => {
    const { currentMarketId } = get();
    updateTodayData(currentMarketId, records);
    set({
      records,
      selectedCategory: records[0]?.category || get().selectedCategory,
    });
  },

  setSelectedCategory: (category: string) => {
    set({ selectedCategory: category });
  },

  toggleScrolling: () => {
    set((state) => ({ isScrolling: !state.isScrolling }));
  },

  toggleFullscreen: () => {
    const { isFullscreen } = get();
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    set({ isFullscreen: !isFullscreen });
  },

  switchMarket: (marketId: string) => {
    get().loadData(marketId);
  },

  getCurrentMarket: () => {
    const { currentMarketId, markets } = get();
    return markets.find((m) => m.id === currentMarketId) || markets[0];
  },
}));
