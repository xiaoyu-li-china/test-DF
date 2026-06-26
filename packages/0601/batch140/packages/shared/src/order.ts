import dayjs from 'dayjs';
import type { Order, OrderStatus, PickupStatus, DailySummary } from './types';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: '待支付',
  paid: '已支付',
  grouped: '已成团',
  delivered: '已送达',
  picked: '已提货',
  completed: '已完成',
  cancelled: '已取消'
};

export const PICKUP_STATUS_LABELS: Record<PickupStatus, string> = {
  pending: '待提货',
  picking: '提货中',
  picked: '已提货'
};

export function generateOrderNo(): string {
  const date = dayjs().format('YYYYMMDD');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `GB${date}${random}`;
}

export function generatePickupCode(): string {
  return Math.random().toString().slice(2, 8);
}

export function calcOrderCommission(totalAmount: number, rate: number): number {
  return Math.round(totalAmount * rate * 100) / 100;
}

export function isValidOrder(order: Order): boolean {
  return order.status !== 'cancelled';
}

export function isTodayGroup(order: Order): boolean {
  return dayjs(order.groupDate).isSame(dayjs(), 'day') && isValidOrder(order);
}

export function getTodayOrders(orders: Order[]): Order[] {
  return orders.filter(isTodayGroup);
}

export function getPendingPickupOrders(orders: Order[]): Order[] {
  return orders.filter(order => 
    order.pickupStatus === 'pending' && 
    isValidOrder(order)
  );
}

export function calculateDailySummary(orders: Order[], date?: string): DailySummary {
  const targetDate = date || dayjs().format('YYYY-MM-DD');
  const dayOrders = orders.filter(o => 
    dayjs(o.groupDate).isSame(targetDate, 'day') && isValidOrder(o)
  );

  const itemCount = dayOrders.reduce((sum, o) => 
    sum + o.items.reduce((s, item) => s + item.quantity, 0), 0
  );

  const pickedCount = dayOrders.filter(o => o.pickupStatus === 'picked').length;
  const pendingPickupCount = dayOrders.filter(o => o.pickupStatus === 'pending').length;

  return {
    date: targetDate,
    orderCount: dayOrders.length,
    itemCount,
    totalAmount: dayOrders.reduce((sum, o) => sum + o.totalAmount, 0),
    commissionAmount: dayOrders.reduce((sum, o) => sum + o.commissionAmount, 0),
    pickedCount,
    pendingPickupCount
  };
}

export function groupOrdersByDate(orders: Order[]): Map<string, Order[]> {
  const groups = new Map<string, Order[]>();
  orders.filter(isValidOrder).forEach(order => {
    const date = dayjs(order.groupDate).format('YYYY-MM-DD');
    if (!groups.has(date)) {
      groups.set(date, []);
    }
    groups.get(date)!.push(order);
  });
  return groups;
}

export function searchOrders(orders: Order[], keyword: string): Order[] {
  const kw = keyword.toLowerCase();
  return orders
    .filter(isValidOrder)
    .filter(order =>
      order.orderNo.toLowerCase().includes(kw) ||
      order.buyer.name.toLowerCase().includes(kw) ||
      order.buyer.phone.includes(kw) ||
      order.pickupCode.includes(kw) ||
      order.items.some(item => item.productName.toLowerCase().includes(kw))
    );
}
