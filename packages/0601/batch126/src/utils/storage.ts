import type { DailyData, PriceRecord } from '../types';
import { generateMockData } from '../data/mockData';

function getStorageKey(marketId: string): string {
  return `market_price_data_${marketId}`;
}

export function getStoredData(marketId: string): DailyData | null {
  try {
    const data = localStorage.getItem(getStorageKey(marketId));
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to read stored data:', error);
  }
  return null;
}

export function saveData(data: DailyData): void {
  try {
    localStorage.setItem(getStorageKey(data.marketId), JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save data:', error);
  }
}

export function getTodayData(marketId: string): PriceRecord[] {
  const today = new Date().toISOString().split('T')[0];
  const stored = getStoredData(marketId);

  if (stored && stored.date === today) {
    return stored.records;
  }

  const mockData = generateMockData(marketId);
  const newData: DailyData = {
    date: today,
    marketId,
    records: mockData,
    updatedAt: new Date().toISOString(),
  };
  saveData(newData);
  return mockData;
}

export function updateTodayData(marketId: string, records: PriceRecord[]): void {
  const today = new Date().toISOString().split('T')[0];
  const data: DailyData = {
    date: today,
    marketId,
    records,
    updatedAt: new Date().toISOString(),
  };
  saveData(data);
}
