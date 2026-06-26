import { create } from 'zustand';
import { Guest, Table, TableTag, AppState, TableSuggestion, TABLE_TAG_CONFIG, DuplicateGuest } from '../types';

const generateId = () => Math.random().toString(36).substring(2, 11);

const tagColors: Record<TableTag, string> = {
  main: '#C9A96E',
  kids: '#4FC3F7',
  normal: '#7D6652',
};

export const useAppStore = create<AppState>((set, get) => ({
  guests: [],
  tables: [],

  addGuest: (guest) =>
    set((state) => ({
      guests: [...state.guests, { ...guest, id: generateId(), tableId: null }],
    })),

  addTable: (capacity, tag = 'normal') =>
    set((state) => {
      const newNumber = state.tables.length > 0
        ? Math.max(...state.tables.map((t) => t.tableNumber)) + 1
        : 1;
      return {
        tables: [
          ...state.tables,
          {
            id: generateId(),
            tableNumber: newNumber,
            capacity,
            color: tagColors[tag],
            tag,
          },
        ],
      };
    }),

  assignGuestToTable: (guestId, tableId) =>
    set((state) => ({
      guests: state.guests.map((g) =>
        g.id === guestId ? { ...g, tableId } : g
      ),
    })),

  removeTable: (tableId) =>
    set((state) => ({
      tables: state.tables.filter((t) => t.id !== tableId),
      guests: state.guests.map((g) =>
        g.tableId === tableId ? { ...g, tableId: null } : g
      ),
    })),

  removeGuest: (guestId) =>
    set((state) => ({
      guests: state.guests.filter((g) => g.id !== guestId),
    })),

  clearAll: () => set({ guests: [], tables: [] }),

  importGuests: (newGuests) =>
    set((state) => {
      const guestsWithIds = newGuests.map((g) => ({
        ...g,
        id: generateId(),
        tableId: null,
      }));
      return { guests: [...state.guests, ...guestsWithIds] };
    }),

  updateTableCapacity: (tableId, capacity) =>
    set((state) => ({
      tables: state.tables.map((t) =>
        t.id === tableId ? { ...t, capacity } : t
      ),
    })),

  updateTableTag: (tableId, tag) =>
    set((state) => ({
      tables: state.tables.map((t) =>
        t.id === tableId ? { ...t, tag, color: tagColors[tag] } : t
      ),
    })),

  getGuestsByTable: (tableId) => {
    const state = get();
    return state.guests.filter((g) => g.tableId === tableId);
  },

  getUnassignedGuests: () => {
    const state = get();
    return state.guests.filter((g) => g.tableId === null);
  },

  getTableGuestCount: (tableId) => {
    const state = get();
    return state.guests
      .filter((g) => g.tableId === tableId)
      .reduce((sum, g) => sum + g.count, 0);
  },

  isTableOverCapacity: (tableId) => {
    const state = get();
    const table = state.tables.find((t) => t.id === tableId);
    if (!table) return false;
    const count = state.getTableGuestCount(tableId);
    return count > table.capacity;
  },

  getTotalGuests: () => {
    const state = get();
    return state.guests.reduce((sum, g) => sum + g.count, 0);
  },

  getAssignedGuestsCount: () => {
    const state = get();
    return state.guests
      .filter((g) => g.tableId !== null)
      .reduce((sum, g) => sum + g.count, 0);
  },

  getSuggestions: () => {
    const state = get();
    const suggestions: TableSuggestion[] = [];
    const unassigned = state.guests.filter((g) => g.tableId === null);
    if (unassigned.length === 0 || state.tables.length === 0) return suggestions;

    const mainTables = state.tables.filter((t) => t.tag === 'main');
    const kidsTables = state.tables.filter((t) => t.tag === 'kids');
    const normalTables = state.tables.filter((t) => t.tag === 'normal');

    const relationshipToTag: Record<string, TableTag> = {
      '男方父母': 'main',
      '女方父母': 'main',
      '男方长辈': 'main',
      '女方长辈': 'main',
      '主婚人': 'main',
      '证婚人': 'main',
      '儿童': 'kids',
      '小孩': 'kids',
      '儿童桌': 'kids',
    };

    const findBestTable = (tables: Table[], guestCount: number): Table | null => {
      const sorted = [...tables].sort((a, b) => {
        const aCount = state.getTableGuestCount(a.id);
        const bCount = state.getTableGuestCount(b.id);
        const aRemain = a.capacity - aCount;
        const bRemain = b.capacity - bCount;
        if (aRemain >= guestCount && bRemain < guestCount) return -1;
        if (bRemain >= guestCount && aRemain < guestCount) return 1;
        return bRemain - aRemain;
      });
      return sorted[0] || null;
    };

    const relationshipGroups: Record<string, string[]> = {};
    state.tables.forEach((table) => {
      const tableGuests = state.getGuestsByTable(table.id);
      tableGuests.forEach((g) => {
        if (!relationshipGroups[g.relationship]) {
          relationshipGroups[g.relationship] = [];
        }
        if (!relationshipGroups[g.relationship].includes(table.id)) {
          relationshipGroups[g.relationship].push(table.id);
        }
      });
    });

    unassigned.forEach((guest) => {
      let targetTable: Table | null = null;
      let reason = '';

      const impliedTag = relationshipToTag[guest.relationship];
      if (impliedTag === 'main' && mainTables.length > 0) {
        targetTable = findBestTable(mainTables, guest.count);
        reason = `"${guest.relationship}"建议安排主桌`;
      } else if (impliedTag === 'kids' && kidsTables.length > 0) {
        targetTable = findBestTable(kidsTables, guest.count);
        reason = `"${guest.relationship}"建议安排儿童桌`;
      }

      if (!targetTable) {
        const existingTableIds = relationshipGroups[guest.relationship] || [];
        for (const tid of existingTableIds) {
          const t = state.tables.find((tbl) => tbl.id === tid);
          if (t) {
            const currentCount = state.getTableGuestCount(t.id);
            if (currentCount + guest.count <= t.capacity) {
              targetTable = t;
              reason = `与同关系"${guest.relationship}"的宾客同桌`;
              break;
            }
          }
        }
      }

      if (!targetTable) {
        const sameRelUnassigned = unassigned.filter(
          (g) => g.relationship === guest.relationship && g.id !== guest.id
        );
        if (sameRelUnassigned.length > 0) {
          const normalCandidate = findBestTable(normalTables.length > 0 ? normalTables : state.tables, guest.count);
          if (normalCandidate) {
            targetTable = normalCandidate;
            reason = `"${guest.relationship}"建议集中同桌，方便交流`;
          }
        }
      }

      if (targetTable) {
        suggestions.push({
          guestId: guest.id,
          guestName: guest.name,
          relationship: guest.relationship,
          suggestedTableId: targetTable.id,
          suggestedTableNumber: targetTable.tableNumber,
          suggestedTableTag: targetTable.tag,
          reason,
        });
      }
    });

    return suggestions;
  },

  detectDuplicates: () => {
    const state = get();
    const nameMap: Record<string, string[]> = {};
    
    state.guests.forEach((g) => {
      const normalizedName = g.name.trim().toLowerCase();
      if (!nameMap[normalizedName]) {
        nameMap[normalizedName] = [];
      }
      nameMap[normalizedName].push(g.id);
    });

    const duplicates: DuplicateGuest[] = [];
    Object.entries(nameMap).forEach(([name, ids]) => {
      if (ids.length > 1) {
        const originalGuest = state.guests.find((g) => g.id === ids[0]);
        duplicates.push({
          name: originalGuest?.name || name,
          ids,
          count: ids.length,
        });
      }
    });

    return duplicates;
  },
}));
