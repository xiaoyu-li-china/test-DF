import { describe, it, expect } from 'vitest';
import { generateMockData } from '../data/mockData';
import { ABNORMAL_THRESHOLD } from '../types';

describe('generateMockData', () => {
  it('should generate 20 records', () => {
    const data = generateMockData('chengdong');
    expect(data).toHaveLength(20);
  });

  it('each record should have required fields', () => {
    const data = generateMockData('chengdong');
    for (const record of data) {
      expect(record).toHaveProperty('id');
      expect(record).toHaveProperty('category');
      expect(record).toHaveProperty('categoryIcon');
      expect(record).toHaveProperty('stallNumber');
      expect(record).toHaveProperty('price');
      expect(record).toHaveProperty('unit');
      expect(record).toHaveProperty('yesterdayPrice');
      expect(record).toHaveProperty('change');
      expect(record).toHaveProperty('history7Days');
      expect(record).toHaveProperty('isAbnormal');
    }
  });

  it('history7Days should have 7 data points', () => {
    const data = generateMockData('chengdong');
    for (const record of data) {
      expect(record.history7Days).toHaveLength(7);
    }
  });

  it('change should be calculated correctly', () => {
    const data = generateMockData('chengdong');
    for (const record of data) {
      const expectedChange = ((record.price - record.yesterdayPrice) / record.yesterdayPrice) * 100;
      expect(record.change).toBeCloseTo(expectedChange, 1);
    }
  });

  it('isAbnormal should be true when change exceeds threshold', () => {
    const data = generateMockData('chengnan');
    for (const record of data) {
      if (Math.abs(record.change) > ABNORMAL_THRESHOLD) {
        expect(record.isAbnormal).toBe(true);
      }
    }
  });

  it('different markets should generate different data', () => {
    const data1 = generateMockData('chengdong');
    const data2 = generateMockData('chengnan');
    const data3 = generateMockData('xinhua');

    const prices1 = data1.map((r) => r.price);
    const prices2 = data2.map((r) => r.price);
    const prices3 = data3.map((r) => r.price);

    expect(prices1).not.toEqual(prices2);
    expect(prices1).not.toEqual(prices3);
    expect(prices2).not.toEqual(prices3);
  });

  it('ids should include market id', () => {
    const data = generateMockData('chengdong');
    for (const record of data) {
      expect(record.id).toContain('chengdong');
    }
  });

  it('price should be positive', () => {
    const data = generateMockData('chengdong');
    for (const record of data) {
      expect(record.price).toBeGreaterThan(0);
      expect(record.yesterdayPrice).toBeGreaterThan(0);
    }
  });

  it('unit should default to 元/斤', () => {
    const data = generateMockData('chengdong');
    for (const record of data) {
      expect(record.unit).toBe('元/斤');
    }
  });
});
