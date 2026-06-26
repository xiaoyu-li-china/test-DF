import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, formatDateTime, maskCardNumber } from '@/utils/formatters';

describe('formatCurrency', () => {
  it('formats whole numbers with two decimal places', () => {
    expect(formatCurrency(100)).toBe('100.00');
  });

  it('formats decimal numbers correctly', () => {
    expect(formatCurrency(328.5)).toBe('328.50');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('0.00');
  });

  it('formats large numbers with comma separators', () => {
    expect(formatCurrency(10000)).toBe('10,000.00');
  });

  it('formats negative numbers', () => {
    expect(formatCurrency(-42.5)).toBe('-42.50');
  });

  it('preserves two decimal places for single digit decimals', () => {
    expect(formatCurrency(1.2)).toBe('1.20');
  });

  it('does not exceed two decimal places', () => {
    const result = formatCurrency(3.14159);
    expect(result).toBe('3.14');
  });
});

describe('formatDate', () => {
  it('formats ISO date string to Chinese format', () => {
    const result = formatDate('2025-06-15T10:30:00.000Z');
    expect(result).toMatch(/2025/);
    expect(result).toMatch(/06/);
    expect(result).toMatch(/15/);
  });

  it('handles date-only strings', () => {
    const result = formatDate('2025-01-01');
    expect(result).toContain('2025');
  });
});

describe('formatDateTime', () => {
  it('formats ISO datetime string with time component', () => {
    const result = formatDateTime('2025-06-15T14:30:00.000Z');
    expect(result).toMatch(/2025/);
    expect(result).toMatch(/06/);
    expect(result).toMatch(/15/);
  });
});

describe('maskCardNumber', () => {
  it('masks middle segments of 4-part card number', () => {
    expect(maskCardNumber('8888 6666 1234 5678')).toBe('8888 **** **** 5678');
  });

  it('returns original string if not 4-part format', () => {
    expect(maskCardNumber('12345678')).toBe('12345678');
  });

  it('handles single segment', () => {
    expect(maskCardNumber('1234')).toBe('1234');
  });
});
