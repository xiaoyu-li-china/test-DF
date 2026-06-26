import { create } from 'zustand';
import type { Seat, SeatLayout, Movie, Session, LockedOrder, RefundPolicy } from '../types';
import { api } from '../api/mockApi';
import { findConsecutiveSeats } from '../utils/seatUtils';
import { getAllSessions } from '../mock/data';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface SeatStore {
  selectedSeats: Seat[];
  ticketCount: number;
  session: Session | null;
  movie: Movie | null;
  lockExpireAt: number | null;
  isLocked: boolean;
  lockedOrders: LockedOrder[];
  seatLayout: SeatLayout | null;
  loading: boolean;
  error: string | null;
  recommendedGroups: Seat[][];
  loadingLock: boolean;
  lockSuccess: boolean;
  lockMessage: string | null;
  toasts: Toast[];
  showRefundModal: boolean;
  refundOrderId: string | null;

  setMovie: (movie: Movie | null) => void;
  setSession: (session: Session | null) => void;
  setTicketCount: (count: number) => void;
  fetchSeatLayout: (sessionId: string) => Promise<void>;
  toggleSeat: (seat: Seat) => void;
  clearSelection: () => void;
  confirmLockSeats: () => Promise<boolean>;
  setLockExpireAt: (time: number | null) => void;
  resetLockState: () => void;
  resetAll: () => void;
  addToast: (message: string, type: Toast['type'], duration?: number) => void;
  removeToast: (id: string) => void;
  handleLockExpired: () => void;
  getRefundPolicy: (order: LockedOrder) => RefundPolicy;
  requestRefund: (orderId: string) => void;
  confirmRefund: () => Promise<boolean>;
  cancelRefund: () => void;
  loadLockedOrders: () => void;
}

let toastId = 0;

export const useSeatStore = create<SeatStore>((set, get) => ({
  selectedSeats: [],
  ticketCount: 2,
  session: null,
  movie: null,
  lockExpireAt: null,
  isLocked: false,
  lockedOrders: [],
  seatLayout: null,
  loading: false,
  error: null,
  recommendedGroups: [],
  loadingLock: false,
  lockSuccess: false,
  lockMessage: null,
  toasts: [],
  showRefundModal: false,
  refundOrderId: null,

  setMovie: (movie) => set({ movie }),

  setSession: (session) => set({ session }),

  setTicketCount: (count) => {
    set({ ticketCount: count, selectedSeats: [] });
    const { seatLayout } = get();
    if (seatLayout) {
      const recommended = findConsecutiveSeats(seatLayout, count).slice(0, 5);
      set({ recommendedGroups: recommended });
    }
  },

  fetchSeatLayout: async (sessionId: string) => {
    set({ loading: true, error: null });
    try {
      const layout = await api.getSeatLayout(sessionId);
      const { ticketCount } = get();
      const recommended = findConsecutiveSeats(layout, ticketCount).slice(0, 5);
      set({ seatLayout: layout, recommendedGroups: recommended, loading: false });
    } catch (error) {
      set({ error: '获取座位信息失败，请稍后重试', loading: false });
    }
  },

  toggleSeat: (seat) => {
    const { selectedSeats, ticketCount, isLocked, seatLayout } = get();

    if (isLocked) return;

    if (seat.status !== 'available') return;

    const isSelected = selectedSeats.some((s) => s.id === seat.id);

    if (seat.type === 'couple' && seatLayout) {
      const pair = seatLayout.coupleSeatPairs.find(
        ([id1, id2]) => id1 === seat.id || id2 === seat.id
      );
      if (pair) {
        const pairSeats = seatLayout.seats.filter(
          (s) => s.id === pair[0] || s.id === pair[1]
        );
        const bothAvailable = pairSeats.every((s) => s.status === 'available');

        if (!bothAvailable) {
          get().addToast('情侣座需成对选择，当前座位不可用', 'warning');
          return;
        }

        const bothSelected = pairSeats.every((s) =>
          selectedSeats.some((sel) => sel.id === s.id)
        );

        if (bothSelected) {
          set({
            selectedSeats: selectedSeats.filter(
              (s) => !pairSeats.some((ps) => ps.id === s.id)
            ),
          });
        } else {
          const otherSelected = selectedSeats.filter(
            (s) => !pairSeats.some((ps) => ps.id === s.id)
          );
          if (otherSelected.length + pairSeats.length > ticketCount) {
            get().addToast(`最多选择 ${ticketCount} 张票`, 'warning');
            return;
          }
          set({ selectedSeats: [...otherSelected, ...pairSeats] });
        }
        return;
      }
    }

    if (isSelected) {
      set({
        selectedSeats: selectedSeats.filter((s) => s.id !== seat.id),
      });
    } else {
      if (selectedSeats.length >= ticketCount) {
        set({
          selectedSeats: [...selectedSeats.slice(1), seat],
        });
      } else {
        set({
          selectedSeats: [...selectedSeats, seat],
        });
      }
    }
  },

  clearSelection: () => {
    set({ selectedSeats: [] });
  },

  confirmLockSeats: async (): Promise<boolean> => {
    const { selectedSeats, session, movie } = get();

    if (!session || selectedSeats.length === 0) {
      set({ lockSuccess: false, lockMessage: '请先选择座位' });
      return false;
    }

    if (selectedSeats.length !== get().ticketCount) {
      set({
        lockSuccess: false,
        lockMessage: `请选择 ${get().ticketCount} 个座位`,
      });
      return false;
    }

    set({ loadingLock: true, lockMessage: null });

    try {
      const response = await api.lockSeats({
        sessionId: session.id,
        seatIds: selectedSeats.map((s) => s.id),
      });

      if (response.success && response.expireAt) {
        const newOrder: LockedOrder = {
          orderId: response.orderId || '',
          sessionId: session.id,
          movieId: movie?.id || '',
          seatIds: selectedSeats.map((s) => s.id),
          lockedAt: Date.now(),
          expireAt: response.expireAt,
          totalPrice: session.price * selectedSeats.length,
        };

        const orders = [...get().lockedOrders, newOrder];
        try {
          localStorage.setItem('cinema_locked_orders', JSON.stringify(orders));
        } catch (e) {
          console.error('Failed to save orders', e);
        }

        set({
          isLocked: true,
          lockExpireAt: response.expireAt,
          lockSuccess: true,
          lockMessage: response.message || '锁座成功',
          loadingLock: false,
          lockedOrders: orders,
        });
        return true;
      } else {
        set({
          lockSuccess: false,
          lockMessage: response.message || '锁座失败，请重试',
          loadingLock: false,
        });
        return false;
      }
    } catch (error) {
      set({
        lockSuccess: false,
        lockMessage: '网络错误，请稍后重试',
        loadingLock: false,
      });
      return false;
    }
  },

  setLockExpireAt: (time) => set({ lockExpireAt: time }),

  resetLockState: () => {
    set({
      lockSuccess: false,
      lockMessage: null,
      loadingLock: false,
    });
  },

  resetAll: () => {
    set({
      selectedSeats: [],
      ticketCount: 2,
      session: null,
      movie: null,
      lockExpireAt: null,
      isLocked: false,
      seatLayout: null,
      loading: false,
      error: null,
      recommendedGroups: [],
      loadingLock: false,
      lockSuccess: false,
      lockMessage: null,
    });
  },

  addToast: (message, type, duration = 3000) => {
    const id = String(++toastId);
    const toast: Toast = { id, message, type, duration };
    set((state) => ({ toasts: [...state.toasts, toast] }));

    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  handleLockExpired: () => {
    const { session, selectedSeats } = get();
    if (session && selectedSeats.length > 0) {
      api.unlockSeats(session.id, selectedSeats.map((s) => s.id));
    }

    get().addToast('锁座已过期，座位已自动释放', 'warning', 5000);

    set({
      isLocked: false,
      lockExpireAt: null,
      selectedSeats: [],
    });

    if (get().seatLayout && get().session) {
      get().fetchSeatLayout(get().session!.id);
    }
  },

  getRefundPolicy: (order: LockedOrder): RefundPolicy => {
    const session = getAllSessions().find((s) => s.id === order.sessionId);
    if (!session) {
      return { canRefund: false, refundRate: 0, reason: '场次不存在' };
    }

    const sessionDateTime = new Date(`${session.date}T${session.time}`);
    const now = new Date();
    const oneHourBefore = new Date(sessionDateTime.getTime() - 3600000);

    if (now >= sessionDateTime) {
      return { canRefund: false, refundRate: 0, reason: '开场后不可退票' };
    }

    if (now >= oneHourBefore) {
      return { canRefund: false, refundRate: 0, reason: '开场前1小时内不可退票' };
    }

    return { canRefund: true, refundRate: 0.8, reason: '开场前1小时可退80%' };
  },

  requestRefund: (orderId: string) => {
    const order = get().lockedOrders.find((o) => o.orderId === orderId);
    if (!order) {
      get().addToast('订单不存在', 'error');
      return;
    }

    const policy = get().getRefundPolicy(order);
    if (!policy.canRefund) {
      get().addToast(policy.reason || '不可退票', 'error');
      return;
    }

    set({ showRefundModal: true, refundOrderId: orderId });
  },

  confirmRefund: async (): Promise<boolean> => {
    const { refundOrderId, lockedOrders } = get();
    if (!refundOrderId) return false;

    const order = lockedOrders.find((o) => o.orderId === refundOrderId);
    if (!order) return false;

    await api.unlockSeats(order.sessionId, order.seatIds);

    const updatedOrders = lockedOrders.filter((o) => o.orderId !== refundOrderId);
    try {
      localStorage.setItem('cinema_locked_orders', JSON.stringify(updatedOrders));
    } catch (e) {
      console.error('Failed to update orders', e);
    }

    const session = getAllSessions().find((s) => s.id === order.sessionId);
    const refundAmount = session ? order.totalPrice * 0.8 : 0;

    set({
      lockedOrders: updatedOrders,
      showRefundModal: false,
      refundOrderId: null,
    });

    get().addToast(`退票成功，退还 ¥${refundAmount.toFixed(2)}`, 'success', 4000);

    return true;
  },

  cancelRefund: () => {
    set({ showRefundModal: false, refundOrderId: null });
  },

  loadLockedOrders: () => {
    try {
      const stored = localStorage.getItem('cinema_locked_orders');
      if (stored) {
        const orders = JSON.parse(stored) as LockedOrder[];
        const now = Date.now();
        const validOrders = orders.filter((o) => o.expireAt > now);
        set({ lockedOrders: validOrders });
      }
    } catch (e) {
      console.error('Failed to load orders', e);
    }
  },
}));
