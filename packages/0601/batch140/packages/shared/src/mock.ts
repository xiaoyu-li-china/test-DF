import dayjs from 'dayjs';
import type { Order, Leader, Product, CommissionRecord, DailySummary } from './types';
import { generateOrderNo, generatePickupCode, calcOrderCommission, calculateDailySummary } from './order';

const MOCK_LEADER: Leader = {
  id: 'leader-001',
  name: '张团长',
  phone: '13800138000',
  avatar: '',
  address: '幸福小区3号楼2单元101',
  communityName: '幸福家园社区',
  commissionRate: 0.08,
  totalCommission: 2580.50,
  availableCommission: 850.00,
  frozenCommission: 320.00
};

const MOCK_PRODUCTS: Product[] = [
  { id: 'p1', name: '新鲜草莓', image: '', price: 29.9, unit: '盒', spec: '500g/盒' },
  { id: 'p2', name: '进口车厘子', image: '', price: 59.9, unit: '盒', spec: '300g/盒' },
  { id: 'p3', name: '有机蔬菜套餐', image: '', price: 39.9, unit: '份', spec: '5种蔬菜' },
  { id: 'p4', name: '土鸡蛋', image: '', price: 25.0, unit: '盒', spec: '30枚' },
  { id: 'p5', name: '鲜牛奶', image: '', price: 12.0, unit: '瓶', spec: '1L' },
  { id: 'p6', name: '五花肉', image: '', price: 35.0, unit: '斤', spec: '500g' },
  { id: 'p7', name: '东北大米', image: '', price: 45.0, unit: '袋', spec: '5kg' },
  { id: 'p8', name: '花生油', image: '', price: 89.0, unit: '桶', spec: '5L' }
];

const BUYER_NAMES = ['李阿姨', '王大叔', '张大姐', '刘奶奶', '陈大哥', '赵小妹', '周阿姨', '吴叔叔'];

function createMockOrders(count: number, leader: Leader, dateOffset: number = 0): Order[] {
  const orders: Order[] = [];
  const groupDate = dayjs().add(dateOffset, 'day').format('YYYY-MM-DD');

  for (let i = 0; i < count; i++) {
    const itemCount = Math.floor(Math.random() * 4) + 1;
    const items = [];
    const usedProducts = new Set<string>();

    for (let j = 0; j < itemCount; j++) {
      let product;
      do {
        product = MOCK_PRODUCTS[Math.floor(Math.random() * MOCK_PRODUCTS.length)];
      } while (usedProducts.has(product.id));
      usedProducts.add(product.id);

      items.push({
        productId: product.id,
        productName: product.name,
        productImage: product.image,
        productPrice: product.price,
        quantity: Math.floor(Math.random() * 3) + 1,
        unit: product.unit,
        spec: product.spec
      });
    }

    const totalAmount = items.reduce((sum, item) => sum + item.productPrice * item.quantity, 0);
    const commissionAmount = calcOrderCommission(totalAmount, leader.commissionRate);

    const statuses: Order['status'][] = ['paid', 'grouped', 'delivered', 'completed'];
    const pickupStatuses: Order['pickupStatus'][] = ['pending', 'pending', 'picked', 'picked'];
    const statusIndex = Math.floor(Math.random() * statuses.length);

    orders.push({
      id: `order-${dateOffset}-${i}`,
      orderNo: generateOrderNo(),
      leaderId: leader.id,
      buyer: {
        id: `buyer-${i}`,
        name: BUYER_NAMES[Math.floor(Math.random() * BUYER_NAMES.length)],
        phone: `138${Math.random().toString().slice(2, 10)}`
      },
      items,
      totalAmount: Math.round(totalAmount * 100) / 100,
      commissionAmount,
      status: statuses[statusIndex],
      pickupStatus: pickupStatuses[statusIndex],
      pickupCode: generatePickupCode(),
      groupDate,
      groupId: `group-${groupDate}`,
      remark: Math.random() > 0.7 ? '放门口就行，谢谢' : '',
      createdAt: dayjs(groupDate).add(-Math.random() * 24, 'hour').toISOString(),
      paidAt: dayjs(groupDate).add(-Math.random() * 20, 'hour').toISOString(),
      deliveredAt: dayjs(groupDate).add(8, 'hour').toISOString(),
      pickedAt: statuses[statusIndex] === 'completed' ? dayjs(groupDate).add(12, 'hour').toISOString() : undefined
    });
  }

  return orders;
}

export function getMockLeader(): Leader {
  return { ...MOCK_LEADER };
}

export function getMockProducts(): Product[] {
  return [...MOCK_PRODUCTS];
}

export function getMockOrders(): Order[] {
  return [
    ...createMockOrders(15, MOCK_LEADER, 0),
    ...createMockOrders(20, MOCK_LEADER, -1),
    ...createMockOrders(18, MOCK_LEADER, -2),
    ...createMockOrders(12, MOCK_LEADER, -7)
  ];
}

export function getMockDailySummary(orders: Order[]): DailySummary {
  return calculateDailySummary(orders);
}

export function getMockCommissionRecords(): CommissionRecord[] {
  const records: CommissionRecord[] = [];
  const types: CommissionRecord['type'][] = ['income', 'income', 'income', 'withdraw', 'income'];
  const statuses: CommissionRecord['status'][] = ['available', 'available', 'frozen', 'paid', 'pending'];

  for (let i = 0; i < 10; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    records.push({
      id: `comm-${i}`,
      leaderId: MOCK_LEADER.id,
      orderId: `order-${i}`,
      orderNo: generateOrderNo(),
      amount: type === 'withdraw' ? -Math.floor(Math.random() * 200 + 50) : Math.floor(Math.random() * 50 + 10),
      type,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      createdAt: dayjs().add(-i, 'day').toISOString(),
      settledAt: Math.random() > 0.5 ? dayjs().add(-i + 1, 'day').toISOString() : undefined,
      remark: type === 'withdraw' ? '提现到微信' : '订单佣金'
    });
  }

  return records;
}
