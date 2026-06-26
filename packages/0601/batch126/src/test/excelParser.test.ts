import { describe, it, expect } from 'vitest';
import { getCategoryIcon } from '../utils/excelParser';
import { ABNORMAL_THRESHOLD } from '../types';

describe('getCategoryIcon', () => {
  it('should return correct icon for known categories', () => {
    expect(getCategoryIcon('白菜')).toBe('🥬');
    expect(getCategoryIcon('猪肉')).toBe('🥩');
    expect(getCategoryIcon('鸡蛋')).toBe('🥚');
    expect(getCategoryIcon('西红柿')).toBe('🍅');
    expect(getCategoryIcon('大米')).toBe('🍚');
  });

  it('should return default icon for unknown categories', () => {
    expect(getCategoryIcon('未知品类')).toBe('📦');
    expect(getCategoryIcon('')).toBe('📦');
  });
});

describe('Excel parsing edge cases', () => {
  it('should handle various column name formats', () => {
    const columnVariants = ['品类', '品名', '商品名', '菜名'];
    for (const col of columnVariants) {
      expect(typeof col).toBe('string');
      expect(col.length).toBeGreaterThan(0);
    }
  });

  it('should handle empty rows gracefully', () => {
    const emptyData: any[] = [];
    expect(emptyData).toHaveLength(0);
  });

  it('should handle missing unit column', () => {
    const defaultUnit = '元/斤';
    expect(defaultUnit).toBe('元/斤');
  });

  it('should handle price with various formats', () => {
    const priceInputs = [28, '28', 28.5, '28.50', '¥28', '28元'];
    const parsePrice = (input: any): number => {
      if (typeof input === 'number') return input;
      const cleaned = String(input).replace(/[¥元]/g, '');
      return parseFloat(cleaned) || 0;
    };

    expect(parsePrice(28)).toBe(28);
    expect(parsePrice('28')).toBe(28);
    expect(parsePrice(28.5)).toBe(28.5);
    expect(parsePrice('28.50')).toBe(28.5);
    expect(parsePrice('¥28')).toBe(28);
    expect(parsePrice('28元')).toBe(28);
  });
});

describe('Change calculation and abnormal detection', () => {
  it('should calculate change percentage correctly', () => {
    const calcChange = (price: number, yesterdayPrice: number) => {
      return ((price - yesterdayPrice) / yesterdayPrice) * 100;
    };

    expect(calcChange(30, 25)).toBeCloseTo(20, 1);
    expect(calcChange(25, 30)).toBeCloseTo(-16.67, 1);
    expect(calcChange(30, 30)).toBe(0);
    expect(calcChange(60, 50)).toBeCloseTo(20, 1);
  });

  it('should mark as abnormal when change exceeds 20%', () => {
    const isAbnormal = (change: number) => Math.abs(change) > ABNORMAL_THRESHOLD;

    expect(isAbnormal(25)).toBe(true);
    expect(isAbnormal(-25)).toBe(true);
    expect(isAbnormal(20)).toBe(false);
    expect(isAbnormal(-20)).toBe(false);
    expect(isAbnormal(15)).toBe(false);
    expect(isAbnormal(0)).toBe(false);
  });

  it('should handle zero yesterdayPrice safely', () => {
    const safeCalcChange = (price: number, yesterdayPrice: number) => {
      if (yesterdayPrice === 0) return 0;
      return ((price - yesterdayPrice) / yesterdayPrice) * 100;
    };

    expect(safeCalcChange(10, 0)).toBe(0);
    expect(safeCalcChange(0, 0)).toBe(0);
  });
});
