import { describe, it, expect, beforeEach } from 'vitest';
import { getTodayData, updateTodayData, getStoredData } from '../utils/storage';

describe('Storage utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should generate data for a new market', () => {
    const data = getTodayData('chengdong');
    expect(data).toHaveLength(20);
    expect(data[0].category).toBeDefined();
    expect(data[0].price).toBeGreaterThan(0);
  });

  it('should return cached data for same market on same day', () => {
    const data1 = getTodayData('chengnan');
    const data2 = getTodayData('chengnan');

    expect(data1).toEqual(data2);
  });

  it('should store data per market separately', () => {
    const data1 = getTodayData('chengdong');
    const data2 = getTodayData('chengnan');

    const prices1 = data1.map((r) => r.price);
    const prices2 = data2.map((r) => r.price);
    expect(prices1).not.toEqual(prices2);
  });

  it('should update data correctly', () => {
    const original = getTodayData('xinhua');
    const updatedPrice = original[0].price + 10;

    const updated = original.map((r) =>
      r.id === original[0].id ? { ...r, price: updatedPrice } : r
    );

    updateTodayData('xinhua', updated);

    const stored = getStoredData('xinhua');
    expect(stored).not.toBeNull();
    expect(stored!.records[0].price).toBe(updatedPrice);
  });
});

describe('OCR mock result to storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should convert OCR results to PriceRecords and store', () => {
    const ocrResults = [
      { category: '白菜', price: 2.5 },
      { category: '猪肉', price: 28 },
      { category: '鸡蛋', price: 6.5 },
    ];

    const records = ocrResults.map((r, i) => ({
      id: `ocr-test-${i + 1}`,
      category: r.category,
      categoryIcon: '📦',
      stallNumber: `A${String(i + 1).padStart(2, '0')}`,
      price: r.price,
      unit: '元/斤',
      yesterdayPrice: r.price,
      change: 0,
      history7Days: Array(7).fill(r.price),
      isAbnormal: false,
    }));

    updateTodayData('chengdong', records);

    const stored = getStoredData('chengdong');
    expect(stored).not.toBeNull();
    expect(stored!.records).toHaveLength(3);
    expect(stored!.records[0].category).toBe('白菜');
    expect(stored!.records[0].price).toBe(2.5);
    expect(stored!.records[1].category).toBe('猪肉');
    expect(stored!.records[1].price).toBe(28);
  });

  it('should handle OCR results with abnormal changes', () => {
    const ocrResults = [
      { category: '牛肉', price: 65, yesterdayPrice: 50 },
      { category: '大米', price: 3.8, yesterdayPrice: 3.6 },
    ];

    const records = ocrResults.map((r, i) => {
      const change = ((r.price - r.yesterdayPrice) / r.yesterdayPrice) * 100;
      return {
        id: `ocr-abnormal-${i + 1}`,
        category: r.category,
        categoryIcon: '📦',
        stallNumber: `A${String(i + 1).padStart(2, '0')}`,
        price: r.price,
        unit: '元/斤',
        yesterdayPrice: r.yesterdayPrice,
        change: Math.round(change * 100) / 100,
        history7Days: Array(7).fill(r.yesterdayPrice).concat(r.price).slice(-7),
        isAbnormal: Math.abs(change) > 20,
      };
    });

    expect(records[0].change).toBeCloseTo(30, 0);
    expect(records[0].isAbnormal).toBe(true);
    expect(records[1].isAbnormal).toBe(false);
  });
});
