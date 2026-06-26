import type { Seat, SeatLayout } from '../types';

export const findConsecutiveSeats = (
  layout: SeatLayout,
  count: number
): Seat[][] => {
  const results: Seat[][] = [];
  const { rows, cols, seats } = layout;

  for (let row = 1; row <= rows; row++) {
    const rowSeats = seats.filter((s) => s.row === row).sort((a, b) => a.col - b.col);
    let consecutive: Seat[] = [];

    for (let col = 1; col <= cols; col++) {
      const seat = rowSeats.find((s) => s.col === col);
      if (seat && seat.status === 'available') {
        consecutive.push(seat);
        if (consecutive.length === count) {
          results.push([...consecutive]);
          consecutive = consecutive.slice(1);
        }
      } else {
        consecutive = [];
      }
    }
  }

  const centerRow = Math.ceil(rows / 2);
  const centerCol = Math.ceil(cols / 2);

  return results.sort((a, b) => {
    const aCenterDist = Math.abs(a[0].row - centerRow) + Math.abs(a[0].col + count / 2 - centerCol);
    const bCenterDist = Math.abs(b[0].row - centerRow) + Math.abs(b[0].col + count / 2 - centerCol);
    return aCenterDist - bCenterDist;
  });
};

export const isInRecommendedGroup = (
  seat: Seat,
  recommendedGroups: Seat[][]
): boolean => {
  return recommendedGroups.some((group) => group.some((s) => s.id === seat.id));
};

export const getRecommendedGroupForSeat = (
  seat: Seat,
  recommendedGroups: Seat[][],
  count: number
): Seat[] | null => {
  for (const group of recommendedGroups) {
    const idx = group.findIndex((s) => s.id === seat.id);
    if (idx !== -1) {
      return group;
    }
  }
  return null;
};

export const formatTimeRemaining = (ms: number): string => {
  if (ms <= 0) return '00:00';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const formatDateDisplay = (dateStr: string): string => {
  const date = new Date(dateStr);
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = weekdays[date.getDay()];

  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86400000);

  if (date.toDateString() === today.toDateString()) {
    return `今天 ${month}月${day}日 ${weekday}`;
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return `明天 ${month}月${day}日 ${weekday}`;
  }
  return `${month}月${day}日 ${weekday}`;
};

export const generateOrderId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `ORD-${timestamp}-${random}`.toUpperCase();
};
