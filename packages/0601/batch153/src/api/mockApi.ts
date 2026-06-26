import type { Movie, Session, SeatLayout, LockSeatsRequest, LockSeatsResponse } from '../types';
import { mockMovies, mockSessions, generateSeatLayout, getAllSessions } from '../mock/data';
import { generateOrderId } from '../utils/seatUtils';

const LOCK_DURATION = 15 * 60 * 1000;
const LOCK_STORAGE_KEY = 'cinema_seat_locks';

interface LockRecord {
  sessionId: string;
  seatIds: string[];
  orderId: string;
  lockedAt: number;
  expireAt: number;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getLocks = (): LockRecord[] => {
  try {
    const stored = localStorage.getItem(LOCK_STORAGE_KEY);
    if (stored) {
      const locks = JSON.parse(stored) as LockRecord[];
      const now = Date.now();
      const validLocks = locks.filter((lock) => lock.expireAt > now);
      if (validLocks.length !== locks.length) {
        localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify(validLocks));
      }
      return validLocks;
    }
  } catch (e) {
    console.error('Failed to read locks from localStorage', e);
  }
  return [];
};

const saveLocks = (locks: LockRecord[]) => {
  try {
    localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify(locks));
  } catch (e) {
    console.error('Failed to save locks to localStorage', e);
  }
};

const isSeatLocked = (sessionId: string, seatId: string): boolean => {
  const locks = getLocks();
  return locks.some(
    (lock) => lock.sessionId === sessionId && lock.seatIds.includes(seatId)
  );
};

export const api = {
  async getMovies(): Promise<Movie[]> {
    await delay(300);
    return mockMovies;
  },

  async getMovieById(movieId: string): Promise<Movie | undefined> {
    await delay(200);
    return mockMovies.find((m) => m.id === movieId);
  },

  async getSessionsByMovie(movieId: string): Promise<Session[]> {
    await delay(300);
    return mockSessions[movieId] || [];
  },

  async getSessionById(sessionId: string): Promise<Session | undefined> {
    await delay(200);
    const allSessions = getAllSessions();
    return allSessions.find((s) => s.id === sessionId);
  },

  async getSeatLayout(sessionId: string): Promise<SeatLayout> {
    await delay(500);
    const layout = generateSeatLayout(sessionId);

    const locks = getLocks();
    const sessionLocks = locks.filter((lock) => lock.sessionId === sessionId);
    const lockedSeatIds = new Set(sessionLocks.flatMap((lock) => lock.seatIds));

    layout.seats = layout.seats.map((seat) => {
      if (lockedSeatIds.has(seat.id) && seat.status === 'available') {
        return { ...seat, status: 'locked' as const };
      }
      return seat;
    });

    return layout;
  },

  async lockSeats(request: LockSeatsRequest): Promise<LockSeatsResponse> {
    await delay(800);

    const { sessionId, seatIds } = request;

    for (const seatId of seatIds) {
      if (isSeatLocked(sessionId, seatId)) {
        return {
          success: false,
          message: '所选座位已被他人锁定，请重新选择',
        };
      }
    }

    const layout = await this.getSeatLayout(sessionId);
    for (const seatId of seatIds) {
      const seat = layout.seats.find((s) => s.id === seatId);
      if (!seat || seat.status === 'sold') {
        return {
          success: false,
          message: '所选座位已售出，请重新选择',
        };
      }
    }

    const now = Date.now();
    const expireAt = now + LOCK_DURATION;
    const orderId = generateOrderId();

    const locks = getLocks();
    locks.push({
      sessionId,
      seatIds,
      orderId,
      lockedAt: now,
      expireAt,
    });
    saveLocks(locks);

    return {
      success: true,
      orderId,
      expireAt,
      message: '锁座成功，请在15分钟内完成支付',
    };
  },

  async unlockSeats(sessionId: string, seatIds: string[]): Promise<void> {
    await delay(200);
    const locks = getLocks();
    const filtered = locks.filter(
      (lock) =>
        !(lock.sessionId === sessionId && lock.seatIds.every((id) => seatIds.includes(id)))
    );
    saveLocks(filtered);
  },

  async checkLockStatus(sessionId: string, seatIds: string[]): Promise<boolean> {
    await delay(100);
    for (const seatId of seatIds) {
      if (isSeatLocked(sessionId, seatId)) {
        return false;
      }
    }
    return true;
  },
};
