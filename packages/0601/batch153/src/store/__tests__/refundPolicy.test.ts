import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LockedOrder, Session, RefundPolicy } from '../../types';
import { useSeatStore } from '../../store/useSeatStore';

vi.mock('../../mock/data', () => ({
  getAllSessions: vi.fn(),
}));

import { getAllSessions } from '../../mock/data';

const mockGetAllSessions = getAllSessions as unknown as ReturnType<typeof vi.fn>;

const createMockSession = (
  id: string,
  date: string,
  time: string,
  price: number = 50
): Session => ({
  id,
  movieId: 'movie-1',
  date,
  time,
  language: '国语 2D',
  hall: '1号厅',
  price,
});

const createMockOrder = (
  orderId: string,
  sessionId: string,
  seatCount: number = 2,
  totalPrice: number = 100
): LockedOrder => ({
  orderId,
  sessionId,
  movieId: 'movie-1',
  seatIds: Array.from({ length: seatCount }, (_, i) => `seat-${i + 1}`),
  lockedAt: Date.now(),
  expireAt: Date.now() + 15 * 60 * 1000,
  totalPrice,
});

describe('getRefundPolicy - 退票时间窗逻辑', () => {
  const realDateNow = Date.now;
  let systemTime: number;

  beforeEach(() => {
    vi.clearAllMocks();
    systemTime = new Date('2026-06-02T18:00:00').getTime();
    vi.useFakeTimers().setSystemTime(systemTime);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('开场前1小时以上应可退80%', () => {
    const session = createMockSession('session-1', '2026-06-02', '20:00');
    mockGetAllSessions.mockReturnValue([session]);

    const order = createMockOrder('order-1', 'session-1', 2, 100);
    const policy = useSeatStore.getState().getRefundPolicy(order);

    expect(policy).toEqual({
      canRefund: true,
      refundRate: 0.8,
      reason: '开场前1小时可退80%',
    });
  });

  it('开场前刚好1小时整应不可退', () => {
    const session = createMockSession('session-1', '2026-06-02', '19:00');
    mockGetAllSessions.mockReturnValue([session]);

    const order = createMockOrder('order-1', 'session-1');
    const policy = useSeatStore.getState().getRefundPolicy(order);

    expect(policy).toEqual({
      canRefund: false,
      refundRate: 0,
      reason: '开场前1小时内不可退票',
    });
  });

  it('开场前30分钟应不可退', () => {
    const session = createMockSession('session-1', '2026-06-02', '18:30');
    mockGetAllSessions.mockReturnValue([session]);

    const order = createMockOrder('order-1', 'session-1');
    const policy = useSeatStore.getState().getRefundPolicy(order);

    expect(policy.canRefund).toBe(false);
    expect(policy.refundRate).toBe(0);
    expect(policy.reason).toBe('开场前1小时内不可退票');
  });

  it('开场后应不可退', () => {
    const session = createMockSession('session-1', '2026-06-02', '17:00');
    mockGetAllSessions.mockReturnValue([session]);

    const order = createMockOrder('order-1', 'session-1');
    const policy = useSeatStore.getState().getRefundPolicy(order);

    expect(policy.canRefund).toBe(false);
    expect(policy.refundRate).toBe(0);
    expect(policy.reason).toBe('开场后不可退票');
  });

  it('开场后刚好0秒应不可退', () => {
    const session = createMockSession('session-1', '2026-06-02', '18:00');
    mockGetAllSessions.mockReturnValue([session]);

    const order = createMockOrder('order-1', 'session-1');
    const policy = useSeatStore.getState().getRefundPolicy(order);

    expect(policy.canRefund).toBe(false);
    expect(policy.reason).toBe('开场后不可退票');
  });

  it('开场前1小时01秒应可退80%', () => {
    const session = createMockSession('session-1', '2026-06-02', '19:00:01');
    mockGetAllSessions.mockReturnValue([session]);

    const order = createMockOrder('order-1', 'session-1');
    const policy = useSeatStore.getState().getRefundPolicy(order);

    expect(policy.canRefund).toBe(true);
    expect(policy.refundRate).toBe(0.8);
  });

  it('场次不存在时应不可退', () => {
    mockGetAllSessions.mockReturnValue([]);

    const order = createMockOrder('order-1', 'non-existent-session');
    const policy = useSeatStore.getState().getRefundPolicy(order);

    expect(policy.canRefund).toBe(false);
    expect(policy.refundRate).toBe(0);
    expect(policy.reason).toBe('场次不存在');
  });

  it('退款金额应为总价的80%', () => {
    const session = createMockSession('session-1', '2026-06-02', '20:00');
    mockGetAllSessions.mockReturnValue([session]);

    const order = createMockOrder('order-1', 'session-1', 4, 200);
    const policy = useSeatStore.getState().getRefundPolicy(order);

    expect(policy.canRefund).toBe(true);
    const refundAmount = order.totalPrice * policy.refundRate;
    expect(refundAmount).toBe(160);
  });

  it('测试完整的时间边界 - 开场前1小时59分应可退', () => {
    const session = createMockSession('session-1', '2026-06-02', '19:59:00');
    mockGetAllSessions.mockReturnValue([session]);

    const order = createMockOrder('order-1', 'session-1');
    const policy = useSeatStore.getState().getRefundPolicy(order);

    expect(policy.canRefund).toBe(true);
  });

  it('测试完整的时间边界 - 开场前59分59秒应不可退', () => {
    const session = createMockSession('session-1', '2026-06-02', '18:59:59');
    mockGetAllSessions.mockReturnValue([session]);

    const order = createMockOrder('order-1', 'session-1');
    const policy = useSeatStore.getState().getRefundPolicy(order);

    expect(policy.canRefund).toBe(false);
    expect(policy.reason).toBe('开场前1小时内不可退票');
  });
});
