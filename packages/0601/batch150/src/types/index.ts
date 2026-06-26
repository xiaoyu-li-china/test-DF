export type TableTag = 'normal' | 'main' | 'kids';
export type OmitGuest = Omit<Guest, 'id' | 'tableId'>;

export interface DuplicateGuest {
  name: string;
  ids: string[];
  count: number;
}

export const TABLE_TAG_CONFIG: Record<TableTag, { label: string; color: string; bgColor: string }> = {
  main: { label: '主桌', color: '#C9A96E', bgColor: '#FFF8F0' },
  kids: { label: '儿童桌', color: '#4FC3F7', bgColor: '#E1F5FE' },
  normal: { label: '普通', color: '#7D6652', bgColor: '#F7F5F3' },
};

export interface Guest {
  id: string;
  name: string;
  count: number;
  relationship: string;
  allergens: string;
  tableId: string | null;
}

export interface Table {
  id: string;
  tableNumber: number;
  capacity: number;
  color: string;
  tag: TableTag;
}

export interface TableSuggestion {
  guestId: string;
  guestName: string;
  relationship: string;
  suggestedTableId: string;
  suggestedTableNumber: number;
  suggestedTableTag: TableTag;
  reason: string;
}

export interface AppState {
  guests: Guest[];
  tables: Table[];
  addGuest: (guest: Omit<Guest, 'id' | 'tableId'>) => void;
  addTable: (capacity: number, tag?: TableTag) => void;
  assignGuestToTable: (guestId: string, tableId: string | null) => void;
  removeTable: (tableId: string) => void;
  removeGuest: (guestId: string) => void;
  clearAll: () => void;
  importGuests: (guests: Omit<Guest, 'id' | 'tableId'>[]) => void;
  updateTableCapacity: (tableId: string, capacity: number) => void;
  updateTableTag: (tableId: string, tag: TableTag) => void;
  getGuestsByTable: (tableId: string) => Guest[];
  getUnassignedGuests: () => Guest[];
  getTableGuestCount: (tableId: string) => number;
  isTableOverCapacity: (tableId: string) => boolean;
  getTotalGuests: () => number;
  getAssignedGuestsCount: () => number;
  getSuggestions: () => TableSuggestion[];
  detectDuplicates: () => DuplicateGuest[];
}

export type RelationshipGroup = {
  [key: string]: Guest[];
};
