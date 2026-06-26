import { create } from "zustand";
import type { SeaArea, TideApiResponse, ChartMode } from "@/types/tide";
import { SEA_AREAS } from "@/fixtures/seaAreas";
import { fetchTideData } from "@/fixtures/mockTideData";

interface TideState {
  selectedAreaId: string;
  selectedDateIndex: number;
  chartMode: ChartMode;
  favoriteAreaIds: string[];
  tideData: TideApiResponse | null;
  loading: boolean;
  error: string | null;

  setSelectedAreaId: (id: string) => void;
  setSelectedDateIndex: (index: number) => void;
  setChartMode: (mode: ChartMode) => void;
  toggleFavorite: (areaId: string) => void;
  loadTideData: (areaId: string) => Promise<void>;
  getSortedAreas: () => SeaArea[];
}

const FAVORITES_KEY = "tide_widget_favorites";

function loadFavoritesFromStorage(): string[] {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveFavoritesToStorage(ids: string[]): void {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
  } catch {
    console.error("Failed to save favorites");
  }
}

export const useTideStore = create<TideState>((set, get) => ({
  selectedAreaId: "xiangshan",
  selectedDateIndex: 0,
  chartMode: "height",
  favoriteAreaIds: loadFavoritesFromStorage(),
  tideData: null,
  loading: false,
  error: null,

  setSelectedAreaId: (id) => {
    set({ selectedAreaId: id });
    get().loadTideData(id);
  },

  setSelectedDateIndex: (index) => {
    set({ selectedDateIndex: index });
  },

  setChartMode: (mode) => {
    set({ chartMode: mode });
  },

  toggleFavorite: (areaId) => {
    const current = get().favoriteAreaIds;
    const next = current.includes(areaId)
      ? current.filter((id) => id !== areaId)
      : [...current, areaId];
    set({ favoriteAreaIds: next });
    saveFavoritesToStorage(next);
  },

  loadTideData: async (areaId) => {
    set({ loading: true, error: null });
    try {
      const data = await fetchTideData(areaId);
      set({ tideData: data, loading: false });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "加载失败",
        loading: false,
      });
    }
  },

  getSortedAreas: () => {
    const favorites = get().favoriteAreaIds;
    return [...SEA_AREAS].sort((a, b) => {
      const aFav = favorites.includes(a.id) ? 1 : 0;
      const bFav = favorites.includes(b.id) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;
      return a.name.localeCompare(b.name, "zh");
    });
  },
}));
