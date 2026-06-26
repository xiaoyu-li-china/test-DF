import { create } from 'zustand';
import type { MemberInfo, RechargeTier, Transaction, Coupon, InvoiceInfo } from '@/types';
import { getMemberInfo, getRechargeTiers, getTransactions, recharge } from '@/services/api';

/**
 * 前端状态与后端账本一致性策略 (Frontend State ↔ Backend Ledger Consistency)
 *
 * 设计目标：前端展示状态必须与后端账本最终一致，避免用户看到"幽灵余额"。
 *
 * 策略 1：写后读 (Read-After-Write)
 *   位置: executeRecharge() L139
 *   机制: 充值 API 返回成功后，立即调用 fetchTransactions(1) 重新拉取第一页
 *   原理: 后端事务提交后再返回，前端重读确保状态一致
 *   边界: 只重读第一页，已加载的后续页面可能有延迟（UX 权衡）
 *
 * 策略 2：乐观更新 + 失败回滚 (Optimistic Update + Rollback)
 *   位置: executeRecharge() L119-L138
 *   机制: 先用 API 返回的 newBalance 和 pointsEarned 直接更新前端状态
 *   原理: 减少用户等待时间，UI 立即响应
 *   保障: 如果 API 抛异常，catch 分支不更新状态，保持原值
 *   注意: 仅信任 API 返回的数据，不做本地计算
 *
 * 策略 3：不可变替换 (Immutable Replacement)
 *   位置: fetchTransactions() L83
 *   机制: page=1 时用 data.items 完全替换，而非追加
 *   原理: 刷新时以服务端为准，本地状态全量替换
 *   作用: 修复分页追加导致的本地状态发散
 *
 * 策略 4：请求去重 (Request Deduplication)
 *   位置: loadMoreTransactions() L96-L99
 *   机制: loading.transactions = true 时拒绝新请求
 *   原理: 防止快速滚动触发重复分页请求导致状态混乱
 *
 * 策略 5：单点数据源 (Single Source of Truth)
 *   位置: 整个 store 设计
 *   机制: memberInfo.balance 是唯一余额来源，组件只订阅不推导
 *   反例: 组件基于 transactions 本地求和计算余额（易发散）
 *
 * 已知权衡：
 *   - 无限滚动时，第 2 页之后的记录在充值后不会自动刷新
 *   - 解决: 用户下拉刷新时调用 refreshAll() 全量重拉
 *
 * 监控指标（生产环境埋点）:
 *   - frontend_balance_vs_api_delta: 前端显示余额 vs API 返回余额差值
 *   - recharge_optimistic_vs_actual: 乐观更新值与实际 API 返回值偏差
 */

interface MemberState {
  memberInfo: MemberInfo | null;
  rechargeTiers: RechargeTier[];
  transactions: Transaction[];
  coupons: Coupon[];
  loading: {
    member: boolean;
    tiers: boolean;
    transactions: boolean;
    recharge: boolean;
  };
  error: string | null;
  hasMoreTransactions: boolean;
  currentPage: number;
  selectedTierId: string | null;
  showRechargeModal: boolean;
  showSuccessModal: boolean;
  lastRechargeResult: { balance: number; coupons: Coupon[]; orderId: string; pointsEarned: number } | null;

  fetchMemberInfo: () => Promise<void>;
  fetchRechargeTiers: () => Promise<void>;
  fetchTransactions: (page?: number, pageSize?: number) => Promise<void>;
  loadMoreTransactions: () => Promise<void>;
  selectTier: (tierId: string | null) => void;
  setShowRechargeModal: (show: boolean) => void;
  setShowSuccessModal: (show: boolean) => void;
  executeRecharge: (tierId: string, invoice?: InvoiceInfo) => Promise<boolean>;
  refreshAll: () => Promise<void>;
}

export const useMemberStore = create<MemberState>((set, get) => ({
  memberInfo: null,
  rechargeTiers: [],
  transactions: [],
  coupons: [],
  loading: {
    member: false,
    tiers: false,
    transactions: false,
    recharge: false,
  },
  error: null,
  hasMoreTransactions: true,
  currentPage: 0,
  selectedTierId: null,
  showRechargeModal: false,
  showSuccessModal: false,
  lastRechargeResult: null,

  fetchMemberInfo: async () => {
    set((state) => ({ loading: { ...state.loading, member: true } }));
    try {
      const data = await getMemberInfo();
      set({ memberInfo: data, error: null });
    } catch (error) {
      set({ error: '获取会员信息失败' });
    } finally {
      set((state) => ({ loading: { ...state.loading, member: false } }));
    }
  },

  fetchRechargeTiers: async () => {
    set((state) => ({ loading: { ...state.loading, tiers: true } }));
    try {
      const data = await getRechargeTiers();
      set({ rechargeTiers: data, error: null });
    } catch (error) {
      set({ error: '获取充值档位失败' });
    } finally {
      set((state) => ({ loading: { ...state.loading, tiers: false } }));
    }
  },

  fetchTransactions: async (page: number = 1, pageSize: number = 10) => {
    set((state) => ({ loading: { ...state.loading, transactions: true } }));
    try {
      const data = await getTransactions(page, pageSize);
      set({
        transactions: page === 1 ? data.items : [...get().transactions, ...data.items],
        hasMoreTransactions: data.hasMore,
        currentPage: page,
        error: null,
      });
    } catch (error) {
      set({ error: '获取交易记录失败' });
    } finally {
      set((state) => ({ loading: { ...state.loading, transactions: false } }));
    }
  },

  loadMoreTransactions: async () => {
    const { currentPage, hasMoreTransactions, loading } = get();
    if (hasMoreTransactions && !loading.transactions) {
      await get().fetchTransactions(currentPage + 1);
    }
  },

  selectTier: (tierId: string | null) => {
    set({ selectedTierId: tierId });
  },

  setShowRechargeModal: (show: boolean) => {
    set({ showRechargeModal: show });
  },

  setShowSuccessModal: (show: boolean) => {
    set({ showSuccessModal: show });
  },

  executeRecharge: async (tierId: string, invoice?: InvoiceInfo) => {
    set((state) => ({ loading: { ...state.loading, recharge: true } }));
    try {
      const result = await recharge(tierId, 'wechat', invoice);
      if (result.success) {
        set((state) => ({
          memberInfo: state.memberInfo
            ? {
                ...state.memberInfo,
                balance: result.newBalance,
                points: (state.memberInfo.points || 0) + result.pointsEarned,
              }
            : null,
          coupons: [...state.coupons, ...result.coupons],
          lastRechargeResult: {
            balance: result.newBalance,
            coupons: result.coupons,
            orderId: result.orderId,
            pointsEarned: result.pointsEarned,
          },
          selectedTierId: null,
          showRechargeModal: false,
          showSuccessModal: true,
          error: null,
        }));
        await get().fetchTransactions(1);
        return true;
      }
      return false;
    } catch (error) {
      set({ error: '充值失败，请重试' });
      return false;
    } finally {
      set((state) => ({ loading: { ...state.loading, recharge: false } }));
    }
  },

  refreshAll: async () => {
    await Promise.all([
      get().fetchMemberInfo(),
      get().fetchRechargeTiers(),
      get().fetchTransactions(1),
    ]);
  },
}));
