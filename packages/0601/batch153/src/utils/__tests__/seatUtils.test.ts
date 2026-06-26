import { describe, it, expect } from 'vitest';
import type { SeatLayout, Seat, SeatStatus, SeatType } from '../../types';
import { findConsecutiveSeats, isInRecommendedGroup } from '../seatUtils';

const createMockSeat = (
  id: string,
  row: number,
  col: number,
  status: SeatStatus = 'available',
  type: SeatType = 'normal'
): Seat => ({
  id,
  row,
  col,
  status,
  type,
});

const createMockLayout = (
  rows: number,
  cols: number,
  soldPositions: [number, number][] = []
): SeatLayout => {
  const soldSet = new Set(soldPositions.map(([r, c]) => `${r}-${c}`));
  const seats: Seat[] = [];

  for (let row = 1; row <= rows; row++) {
    for (let col = 1; col <= cols; col++) {
      const isSold = soldSet.has(`${row}-${col}`);
      seats.push(
        createMockSeat(
          `seat-${row}-${col}`,
          row,
          col,
          isSold ? 'sold' : 'available'
        )
      );
    }
  }

  return {
    sessionId: 'test-session',
    rows,
    cols,
    seats,
    coupleSeatPairs: [],
  };
};

describe('findConsecutiveSeats', () => {
  it('应正确找到第一排的2连座', () => {
    const layout = createMockLayout(5, 6);
    const results = findConsecutiveSeats(layout, 2);

    expect(results.length).toBeGreaterThan(0);

    const firstRowGroups = results
      .filter((g) => g[0].row === 1)
      .sort((a, b) => a[0].col - b[0].col);
    expect(firstRowGroups.length).toBe(5);

    expect(firstRowGroups[0].map((s) => s.col)).toEqual([1, 2]);
    expect(firstRowGroups[1].map((s) => s.col)).toEqual([2, 3]);
  });

  it('应正确找到3连座', () => {
    const layout = createMockLayout(3, 8);
    const results = findConsecutiveSeats(layout, 3);

    expect(results.length).toBe(18);

    const firstGroup = results.find((g) => g[0].row === 1 && g[0].col === 1);
    expect(firstGroup).toBeDefined();
    expect(firstGroup?.map((s) => s.col)).toEqual([1, 2, 3]);
  });

  it('遇到已售座位时应断开连座', () => {
    const layout = createMockLayout(3, 8, [[1, 4]]);
    const results = findConsecutiveSeats(layout, 3);

    const firstRowGroups = results.filter((g) => g[0].row === 1);
    expect(firstRowGroups.length).toBe(3);

    expect(firstRowGroups[0].map((s) => s.col)).toEqual([1, 2, 3]);
    expect(firstRowGroups[1].map((s) => s.col)).toEqual([5, 6, 7]);
    expect(firstRowGroups[2].map((s) => s.col)).toEqual([6, 7, 8]);

    const hasInvalidGroup = firstRowGroups.some((g) =>
      g.some((s) => s.col === 4)
    );
    expect(hasInvalidGroup).toBe(false);
  });

  it('应按距离中心的距离排序推荐连座（中间排优先）', () => {
    const layout = createMockLayout(5, 10);
    const results = findConsecutiveSeats(layout, 2);

    expect(results[0][0].row).toBe(3);

    const firstTwoRows = [results[0][0].row, results[1]?.[0]?.row];
    expect(firstTwoRows).toContain(3);

    const allRows = results.map((g) => g[0].row);
    const rowCounts = allRows.reduce((acc, row) => {
      acc[row] = (acc[row] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    expect(rowCounts[3]).toBeGreaterThanOrEqual(rowCounts[2] ?? 0);
    expect(rowCounts[2]).toBeGreaterThanOrEqual(rowCounts[1] ?? 0);
  });

  it('当没有足够连座时应返回空数组', () => {
    const layout = createMockLayout(3, 3, [
      [1, 1],
      [1, 3],
      [2, 2],
      [3, 2],
    ]);
    const results = findConsecutiveSeats(layout, 3);

    expect(results).toEqual([]);
  });

  it('应正确找到6连座', () => {
    const layout = createMockLayout(2, 10);
    const results = findConsecutiveSeats(layout, 6);

    expect(results.length).toBe(10);

    const sortedByRowCol = [...results].sort((a, b) => {
      if (a[0].row !== b[0].row) return a[0].row - b[0].row;
      return a[0].col - b[0].col;
    });
    const firstGroup = sortedByRowCol[0];
    expect(firstGroup.length).toBe(6);
    expect(firstGroup.map((s) => s.col)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('应正确处理边界情况 - 恰好一排座位数等于连座数', () => {
    const layout = createMockLayout(2, 4);
    const results = findConsecutiveSeats(layout, 4);

    expect(results.length).toBe(2);
    expect(results[0].length).toBe(4);
    expect(results[0].map((s) => s.col)).toEqual([1, 2, 3, 4]);
  });

  it('推荐排序时中间列应优先于边缘列', () => {
    const layout = createMockLayout(3, 10);
    const results = findConsecutiveSeats(layout, 2);

    const sameRowGroups = results.filter((g) => g[0].row === 2);

    const firstCol = sameRowGroups[0][0].col;
    expect(firstCol).toBe(4);

    const cols = sameRowGroups.map((g) => g[0].col);
    expect(cols).toContain(5);
    expect(cols).toContain(3);
    expect(cols).toContain(4);
  });

  it('应正确处理多排多已售座位的复杂情况', () => {
    const layout = createMockLayout(5, 10, [
      [2, 3],
      [2, 4],
      [3, 5],
      [4, 2],
      [4, 7],
    ]);
    const results = findConsecutiveSeats(layout, 3);

    const secondRowGroups = results.filter((g) => g[0].row === 2);
    const hasInvalidSecondRow = secondRowGroups.some((g) =>
      g.some((s) => s.col === 3 || s.col === 4)
    );
    expect(hasInvalidSecondRow).toBe(false);

    const secondRowCols = secondRowGroups.map((g) => g[0].col);
    expect(secondRowCols).toContain(5);
    expect(secondRowCols).toContain(7);

    const thirdRowGroups = results.filter((g) => g[0].row === 3);
    const hasInvalidThirdRow = thirdRowGroups.some((g) =>
      g.some((s) => s.col === 5)
    );
    expect(hasInvalidThirdRow).toBe(false);
  });
});

describe('isInRecommendedGroup', () => {
  it('应正确判断座位是否在推荐组中', () => {
    const seat1 = createMockSeat('seat-1', 1, 1);
    const seat2 = createMockSeat('seat-2', 1, 2);
    const seat3 = createMockSeat('seat-3', 1, 3);

    const recommendedGroups = [[seat1, seat2]];

    expect(isInRecommendedGroup(seat1, recommendedGroups)).toBe(true);
    expect(isInRecommendedGroup(seat2, recommendedGroups)).toBe(true);
    expect(isInRecommendedGroup(seat3, recommendedGroups)).toBe(false);
  });
});
