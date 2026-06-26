import dayjs from 'dayjs';
import type { Order, ScanResult } from '../types';

export function verifyPickupCode(code: string, orders: Order[]): ScanResult {
  const order = orders.find(o => 
    o.pickupCode === code && 
    o.status !== 'cancelled' &&
    o.pickupStatus !== 'picked'
  );

  if (!order) {
    const cancelledOrder = orders.find(o => o.pickupCode === code && o.status === 'cancelled');
    if (cancelledOrder) {
      return {
        success: false,
        pickupCode: code,
        message: '该订单已取消',
        timestamp: dayjs().toISOString()
      };
    }

    const pickedOrder = orders.find(o => o.pickupCode === code && o.pickupStatus === 'picked');
    if (pickedOrder) {
      return {
        success: false,
        orderId: pickedOrder.id,
        orderNo: pickedOrder.orderNo,
        pickupCode: code,
        buyerName: pickedOrder.buyer.name,
        message: '该订单已提货',
        timestamp: dayjs().toISOString()
      };
    }

    return {
      success: false,
      pickupCode: code,
      message: '提货码无效',
      timestamp: dayjs().toISOString()
    };
  }

  return {
    success: true,
    orderId: order.id,
    orderNo: order.orderNo,
    pickupCode: code,
    buyerName: order.buyer.name,
    message: '核销成功',
    timestamp: dayjs().toISOString()
  };
}

export function validatePickupCodeFormat(code: string): boolean {
  return /^\d{6}$/.test(code);
}

export function generateQRCodeContent(pickupCode: string): string {
  return `GBPICKUP:${pickupCode}`;
}

export function parseQRCodeContent(content: string): string | null {
  const match = content.match(/^GBPICKUP:(\d{6})$/);
  return match ? match[1] : null;
}
