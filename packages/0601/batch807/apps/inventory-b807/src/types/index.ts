export interface SKUItem {
  id: string;
  name: string;
  sku: string;
  warehouse: string;
  quantity: number;
  threshold: number;
  category: string;
  lastUpdated: string;
}

export interface WSMessage {
  type: 'update' | 'heartbeat';
  data?: SKUItem[];
  timestamp: string;
}

export interface ConnectionStatus {
  isConnected: boolean;
  lastMessage: string | null;
}

export type Warehouse = 'A仓' | 'B仓' | 'C仓' | 'D仓';
