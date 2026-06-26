import dayjs from 'dayjs';
import type { Order } from '../types';
import {
  isValidOrder,
  calculateDailySummary,
  getTodayOrders,
  getPendingPickupOrders,
  groupOrdersByDate,
  searchOrders,
  generateOrderNo,
  generatePickupCode,
  calcOrderCommission
} from '../order';

function createMockOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'test-1',
    orderNo: generateOrderNo(),
    leaderId: 'leader-1',
    buyer: { id: 'b1', name: '测试买家', phone: '13800138000' },
    items: [
      {
        productId: 'p1',
        productName: '测试商品',
        productImage: '',
        productPrice: 100,
        quantity: 2,
        unit: '件'
      }
    ],
    totalAmount: 200,
    commissionAmount: calcOrderCommission(200, 0.08),
    status: 'paid',
    pickupStatus: 'pending',
    pickupCode: generatePickupCode(),
    groupDate: dayjs().format('YYYY-MM-DD'),
    groupId: 'group-1',
    createdAt: dayjs().toISOString()
  };
}

describe('订单计算逻辑 - 修复验证', () => {
  describe('isValidOrder', () => {
    it('应该认为非取消订单有效', () => {
      const order = createMockOrder({ status: 'paid' });
      expect(isValidOrder(order)).toBe(true);
    });

    it('应该认为已取消订单无效', () => {
      const order = createMockOrder({ status: 'cancelled' });
      expect(isValidOrder(order)).toBe(false);
    });
  });

  describe('calculateDailySummary - 核心修复', () => {
    it('应该排除已取消订单，不计算其金额', () => {
      const validOrder = createMockOrder({
        id: 'valid-1',
        status: 'paid',
        totalAmount: 100,
        commissionAmount: 8
      });
      const cancelledOrder = createMockOrder({
        id: 'cancel-1',
        status: 'cancelled',
        totalAmount: 999,
        commissionAmount: 79.92
      });

      const summary = calculateDailySummary([validOrder, cancelledOrder]);

      expect(summary.orderCount).toBe(1);
      expect(summary.totalAmount).toBe(100);
      expect(summary.commissionAmount).toBe(8);
    });

    it('拼团失败退款单不应计入成团金额', () => {
      const normalOrder = createMockOrder({
        id: 'normal-1',
        status: 'grouped',
        totalAmount: 200,
        commissionAmount: 16
      });
      const refundOrder = createMockOrder({
        id: 'refund-1',
        status: 'cancelled',
        totalAmount: 500,
        commissionAmount: 40
      });

      const summary = calculateDailySummary([normalOrder, refundOrder]);

      expect(summary.totalAmount).toBe(200);
      expect(summary.commissionAmount).toBe(16);
      expect(summary.totalAmount).not.toBe(700);
    });

    it('多个取消订单时统计正确', () => {
      const orders = [
        createMockOrder({ id: 'v1', status: 'paid', totalAmount: 100, commissionAmount: 8 }),
        createMockOrder({ id: 'c1', status: 'cancelled', totalAmount: 200, commissionAmount: 16 }),
        createMockOrder({ id: 'c2', status: 'cancelled', totalAmount: 300, commissionAmount: 24 }),
        createMockOrder({ id: 'v2', status: 'delivered', totalAmount: 400, commissionAmount: 32 })
      ];

      const summary = calculateDailySummary(orders);

      expect(summary.orderCount).toBe(2);
      expect(summary.totalAmount).toBe(500);
      expect(summary.commissionAmount).toBe(40);
    });
  });

  describe('getTodayOrders', () => {
    it('应该排除今日的取消订单', () => {
      const today = dayjs().format('YYYY-MM-DD');
      const orders = [
        createMockOrder({ id: 'valid', status: 'paid', groupDate: today }),
        createMockOrder({ id: 'cancel', status: 'cancelled', groupDate: today })
      ];

      const result = getTodayOrders(orders);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('valid');
    });
  });

  describe('getPendingPickupOrders', () => {
    it('应该排除已取消的待提货订单', () => {
      const orders = [
        createMockOrder({ id: 'valid', status: 'paid', pickupStatus: 'pending' }),
        createMockOrder({ id: 'cancel', status: 'cancelled', pickupStatus: 'pending' })
      ];

      const result = getPendingPickupOrders(orders);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('valid');
    });
  });

  describe('groupOrdersByDate', () => {
    it('分组时应该排除取消订单', () => {
      const today = dayjs().format('YYYY-MM-DD');
      const orders = [
        createMockOrder({ id: 'v1', status: 'paid', groupDate: today }),
        createMockOrder({ id: 'c1', status: 'cancelled', groupDate: today })
      ];

      const groups = groupOrdersByDate(orders);
      expect(groups.get(today)?.length).toBe(1);
    });
  });

  describe('searchOrders', () => {
    it('搜索时应该排除取消订单', () => {
      const orders = [
        createMockOrder({ id: 'v1', status: 'paid', buyer: { id: 'b1', name: '张三', phone: '13800000001' } }),
        createMockOrder({ id: 'c1', status: 'cancelled', buyer: { id: 'b2', name: '张三', phone: '13800000002' } })
      ];

      const result = searchOrders(orders, '张三');
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('v1');
    });
  });

  describe('佣金计算正确性', () => {
    it('8%佣金率计算正确', () => {
      expect(calcOrderCommission(100, 0.08)).toBe(8);
      expect(calcOrderCommission(150, 0.08)).toBe(12);
      expect(calcOrderCommission(99.99, 0.08)).toBe(8);
    });

    it('拼团失败时佣金为0', () => {
      const cancelledOrder = createMockOrder({
        status: 'cancelled',
        totalAmount: 100,
        commissionAmount: calcOrderCommission(100, 0.08)
      });

      const summary = calculateDailySummary([cancelledOrder]);
      expect(summary.commissionAmount).toBe(0);
    });
  });
});

describe('Excel导出 - 中文编码验证', () => {
  it('UTF-8 BOM 应该正确添加到导出数据开头', () => {
    const BOM = '\uFEFF';
    const testData = '测试中文';
    const dataWithBOM = BOM + testData;

    expect(dataWithBOM.charCodeAt(0)).toBe(0xFEFF);
    expect(dataWithBOM.startsWith(BOM)).toBe(true);
  });

  it('Excel导出时应该过滤取消订单', () => {
    const validOrder = createMockOrder({ status: 'paid', totalAmount: 100 });
    const cancelledOrder = createMockOrder({ status: 'cancelled', totalAmount: 999 });

    const summary = calculateDailySummary([validOrder, cancelledOrder]);

    expect(summary.totalAmount).toBe(100);
    expect(summary.orderCount).toBe(1);
  });
});
