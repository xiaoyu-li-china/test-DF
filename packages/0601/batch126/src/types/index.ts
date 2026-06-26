export interface PriceRecord {
  id: string;
  category: string;
  categoryIcon: string;
  stallNumber: string;
  price: number;
  unit: string;
  yesterdayPrice: number;
  change: number;
  history7Days: number[];
  isAbnormal: boolean;
}

export interface Market {
  id: string;
  name: string;
  address: string;
}

export interface DailyData {
  date: string;
  marketId: string;
  records: PriceRecord[];
  updatedAt: string;
}

export type RankType = 'up' | 'down';

export interface RankItem {
  id: string;
  category: string;
  categoryIcon: string;
  change: number;
  price: number;
  isAbnormal: boolean;
}

export const MARKETS: Market[] = [
  { id: 'chengdong', name: '城东农贸市场', address: '城东街道幸福路88号' },
  { id: 'chengnan', name: '城南农贸市场', address: '城南街道建设路166号' },
  { id: 'xinhua', name: '新华农贸市场', address: '新华街道和平路52号' },
];

export const ABNORMAL_THRESHOLD = 20;
