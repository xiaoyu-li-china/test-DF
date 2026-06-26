import { create } from 'zustand';
import type { 
  Order, 
  Leader, 
  DailySummary, 
  CommissionRecord,
  WithdrawRecord,
  ScanResult,
  Supplier,
  SupplierProduct
} from '../types/shared';
import {
  getMockLeader,
  getMockOrders,
  getMockDailySummary,
  getMockCommissionRecords,
  getTodayOrders,
  getPendingPickupOrders,
  calculateDailySummary,
  mockPaymentTransfer,
  verifyPickupCode,
  getMockSuppliers,
  getMockSupplierProducts,
  filterOrdersBySupplier,
  calculateSupplierSales
} from '../utils/mockData';

interface AppState {
  leader: Leader | null;
  orders: Order[];
  dailySummary: DailySummary | null;
  commissionRecords: CommissionRecord[];
  withdrawRecords: WithdrawRecord[];
  suppliers: Supplier[];
  supplierProducts: SupplierProduct[];
  currentSupplierId: string | null;
  scanResults: ScanResult[];
  loading: boolean;
  fetchLeader: () => void;
  fetchOrders: () => void;
  fetchDailySummary: () => void;
  fetchCommissionRecords: () => void;
  fetchWithdrawRecords: () => void;
  fetchSuppliers: () => void;
  markAsPicked: (orderId: string) => void;
  getTodayOrders: () => Order[];
  getPendingPickupOrders: () => Order[];
  searchOrders: (keyword: string) => Order[];
  requestWithdraw: (amount: number, payMethod: 'wechat' | 'alipay' | 'bank', payAccount: string) => Promise<{ success: boolean; message: string }>;
  scanPickupCode: (code: string) => ScanResult;
  setCurrentSupplier: (supplierId: string | null) => void;
  getSupplierOrders: (supplierId: string) => Order[];
  getSupplierStats: (supplierId: string) => { totalSales: number; totalQuantity: number; orderCount: number };
  getSupplierProducts: (supplierId: string) => SupplierProduct[];
}

export const useAppStore = create<AppState>((set, get) => ({
  leader: null,
  orders: [],
  dailySummary: null,
  commissionRecords: [],
  withdrawRecords: [],
  suppliers: [],
  supplierProducts: [],
  currentSupplierId: null,
  scanResults: [],
  loading: false,

  fetchLeader: () => {
    const leader = getMockLeader();
    set({ leader });
  },

  fetchOrders: () => {
    const orders = getMockOrders();
    set({ orders });
  },

  fetchDailySummary: () => {
    const orders = get().orders;
    const summary = getMockDailySummary(orders);
    set({ dailySummary: summary });
  },

  fetchCommissionRecords: () => {
    const records = getMockCommissionRecords();
    set({ commissionRecords: records });
  },

  markAsPicked: (orderId: string) => {
    set((state) => ({
      orders: state.orders.map((order) =>
        order.id === orderId
          ? { ...order, pickupStatus: 'picked', status: 'completed' }
          : order
      )
    }));
    const orders = get().orders;
    const summary = calculateDailySummary(orders);
    set({ dailySummary: summary });
  },

  getTodayOrders: () => {
    return getTodayOrders(get().orders);
  },

  getPendingPickupOrders: () => {
    return getPendingPickupOrders(get().orders);
  },

  searchOrders: (keyword: string) => {
    const orders = get().orders;
    const kw = keyword.toLowerCase();
    return orders
      .filter(order => order.status !== 'cancelled')
      .filter(order =>
        order.orderNo.toLowerCase().includes(kw) ||
        order.buyer.name.toLowerCase().includes(kw) ||
        order.buyer.phone.includes(kw) ||
        order.pickupCode.includes(kw) ||
        order.items.some(item => item.productName.toLowerCase().includes(kw))
      );
  },

  fetchWithdrawRecords: () => {
    const mockRecords: WithdrawRecord[] = [
      {
        id: 'w1',
        leaderId: 'leader-001',
        amount: 200,
        status: 'paid',
        payMethod: 'wechat',
        payAccount: '***8888',
        payTransactionId: 'WX20240101001',
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        approvedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        paidAt: new Date(Date.now() - 86400000 * 2).toISOString()
      },
      {
        id: 'w2',
        leaderId: 'leader-001',
        amount: 500,
        status: 'pending',
        payMethod: 'alipay',
        payAccount: '***6666',
        createdAt: new Date(Date.now() - 86400000).toISOString()
      }
    ];
    set({ withdrawRecords: mockRecords });
  },

  fetchSuppliers: () => {
    set({
      suppliers: getMockSuppliers(),
      supplierProducts: getMockSupplierProducts()
    });
  },

  requestWithdraw: async (amount: number, payMethod: 'wechat' | 'alipay' | 'bank', payAccount: string) => {
    try {
      const result = await mockPaymentTransfer(amount, payMethod, payAccount);
      const newRecord: WithdrawRecord = {
        id: `w-${Date.now()}`,
        leaderId: get().leader?.id || '',
        amount,
        status: 'approved',
        payMethod,
        payAccount,
        payTransactionId: result.transactionId,
        createdAt: result.timestamp,
        approvedAt: result.timestamp,
        paidAt: result.timestamp
      };
      set((state) => ({
        withdrawRecords: [newRecord, ...state.withdrawRecords],
        leader: state.leader ? {
          ...state.leader,
          availableCommission: state.leader.availableCommission - amount,
          totalCommission: state.leader.totalCommission
        } : null
      }));
      return { success: true, message: '提现成功' };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : '提现失败' };
    }
  },

  scanPickupCode: (code: string) => {
    const result = verifyPickupCode(code, get().orders);
    if (result.success && result.orderId) {
      get().markAsPicked(result.orderId);
    }
    set((state) => ({
      scanResults: [result, ...state.scanResults].slice(0, 20)
    }));
    return result;
  },

  setCurrentSupplier: (supplierId: string | null) => {
    set({ currentSupplierId: supplierId });
  },

  getSupplierOrders: (supplierId: string) => {
    return filterOrdersBySupplier(get().orders, supplierId, get().supplierProducts);
  },

  getSupplierStats: (supplierId: string) => {
    return calculateSupplierSales(get().orders, supplierId, get().supplierProducts);
  },

  getSupplierProducts: (supplierId: string) => {
    return get().supplierProducts.filter(p => p.supplierId === supplierId);
  }
}));
