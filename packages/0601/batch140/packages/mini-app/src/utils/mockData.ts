import dayjs from 'dayjs';
import type { Order, Leader, CommissionRecord, DailySummary } from '../types/shared';

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

const MOCK_PRODUCTS = [
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

const TRANSACTION_PREFIX = {
  wechat: 'WX',
  alipay: 'ALI',
  bank: 'BNK'
};

export function generateTransactionId(payMethod: string): string {
  const prefix = TRANSACTION_PREFIX[payMethod as keyof typeof TRANSACTION_PREFIX] || 'PAY';
  const timestamp = dayjs().format('YYYYMMDDHHmmss');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

export async function mockPaymentTransfer(
  amount: number,
  payMethod: 'wechat' | 'alipay' | 'bank',
  payAccount: string
): Promise<{ success: boolean; transactionId: string; amount: number; payMethod: string; timestamp: string }> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (amount <= 0) {
        reject(new Error('提现金额必须大于0'));
        return;
      }
      if (amount > 50000) {
        reject(new Error('单笔提现不能超过50000元'));
        return;
      }
      const successRate = 0.95;
      const success = Math.random() < successRate;

      if (success) {
        resolve({
          success: true,
          transactionId: generateTransactionId(payMethod),
          amount,
          payMethod,
          timestamp: dayjs().toISOString()
        });
      } else {
        reject(new Error('支付通道繁忙，请稍后重试'));
      }
    }, 1500);
  });
}

export function verifyPickupCode(code: string, orders: Order[]): {
  success: boolean;
  orderId?: string;
  orderNo?: string;
  pickupCode: string;
  buyerName?: string;
  message: string;
  timestamp: string;
} {
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

const MOCK_SUPPLIERS = [
  {
    id: 'supplier-001',
    name: '鲜果农业',
    phone: '13900139001',
    companyName: '鲜果农业有限公司',
    skuIds: ['p1', 'p2'],
    commissionRate: 0.05,
    status: 'active' as const,
    totalSales: 125800,
    totalOrders: 3560
  },
  {
    id: 'supplier-002',
    name: '绿源蔬菜',
    phone: '13900139002',
    companyName: '绿源蔬菜基地',
    skuIds: ['p3'],
    commissionRate: 0.06,
    status: 'active' as const,
    totalSales: 89600,
    totalOrders: 2890
  },
  {
    id: 'supplier-003',
    name: '农家牧场',
    phone: '13900139003',
    companyName: '农家牧场合作社',
    skuIds: ['p4', 'p5', 'p6'],
    commissionRate: 0.04,
    status: 'active' as const,
    totalSales: 156200,
    totalOrders: 4120
  },
  {
    id: 'supplier-004',
    name: '粮油批发',
    phone: '13900139004',
    companyName: '五谷丰登粮油',
    skuIds: ['p7', 'p8'],
    commissionRate: 0.03,
    status: 'active' as const,
    totalSales: 203500,
    totalOrders: 5680
  }
];

const MOCK_SUPPLIER_PRODUCTS = [
  {
    id: 'p1',
    supplierId: 'supplier-001',
    name: '新鲜草莓',
    image: '',
    price: 29.9,
    unit: '盒',
    spec: '500g/盒',
    stock: 500,
    sold: 1250,
    status: 'on_sale' as const,
    createdAt: dayjs().subtract(30, 'day').toISOString()
  },
  {
    id: 'p2',
    supplierId: 'supplier-001',
    name: '进口车厘子',
    image: '',
    price: 59.9,
    unit: '盒',
    spec: '300g/盒',
    stock: 200,
    sold: 680,
    status: 'on_sale' as const,
    createdAt: dayjs().subtract(30, 'day').toISOString()
  },
  {
    id: 'p3',
    supplierId: 'supplier-002',
    name: '有机蔬菜套餐',
    image: '',
    price: 39.9,
    unit: '份',
    spec: '5种蔬菜',
    stock: 800,
    sold: 2100,
    status: 'on_sale' as const,
    createdAt: dayjs().subtract(30, 'day').toISOString()
  },
  {
    id: 'p4',
    supplierId: 'supplier-003',
    name: '土鸡蛋',
    image: '',
    price: 25.0,
    unit: '盒',
    spec: '30枚',
    stock: 1000,
    sold: 3200,
    status: 'on_sale' as const,
    createdAt: dayjs().subtract(30, 'day').toISOString()
  },
  {
    id: 'p5',
    supplierId: 'supplier-003',
    name: '鲜牛奶',
    image: '',
    price: 12.0,
    unit: '瓶',
    spec: '1L',
    stock: 1500,
    sold: 4500,
    status: 'on_sale' as const,
    createdAt: dayjs().subtract(30, 'day').toISOString()
  },
  {
    id: 'p6',
    supplierId: 'supplier-003',
    name: '五花肉',
    image: '',
    price: 35.0,
    unit: '斤',
    spec: '500g',
    stock: 300,
    sold: 890,
    status: 'on_sale' as const,
    createdAt: dayjs().subtract(30, 'day').toISOString()
  },
  {
    id: 'p7',
    supplierId: 'supplier-004',
    name: '东北大米',
    image: '',
    price: 45.0,
    unit: '袋',
    spec: '5kg',
    stock: 600,
    sold: 1800,
    status: 'on_sale' as const,
    createdAt: dayjs().subtract(30, 'day').toISOString()
  },
  {
    id: 'p8',
    supplierId: 'supplier-004',
    name: '花生油',
    image: '',
    price: 89.0,
    unit: '桶',
    spec: '5L',
    stock: 400,
    sold: 1200,
    status: 'on_sale' as const,
    createdAt: dayjs().subtract(30, 'day').toISOString()
  }
];

export function getMockSuppliers() {
  return [...MOCK_SUPPLIERS];
}

export function getMockSupplierProducts() {
  return [...MOCK_SUPPLIER_PRODUCTS];
}

export function filterOrdersBySupplier(
  orders: Order[],
  supplierId: string,
  supplierProducts: { id: string; supplierId: string }[]
): Order[] {
  const productIds = supplierProducts
    .filter(p => p.supplierId === supplierId)
    .map(p => p.id);

  return orders
    .filter(o => o.status !== 'cancelled')
    .filter(o =>
      o.items.some(item => productIds.includes(item.productId))
    );
}

export function calculateSupplierSales(
  orders: Order[],
  supplierId: string,
  supplierProducts: { id: string; supplierId: string }[]
): { totalSales: number; totalQuantity: number; orderCount: number } {
  const filteredOrders = filterOrdersBySupplier(orders, supplierId, supplierProducts);
  const productIds = supplierProducts
    .filter(p => p.supplierId === supplierId)
    .map(p => p.id);

  let totalSales = 0;
  let totalQuantity = 0;

  filteredOrders.forEach(order => {
    order.items
      .filter(item => productIds.includes(item.productId))
      .forEach(item => {
        totalSales += item.productPrice * item.quantity;
        totalQuantity += item.quantity;
      });
  });

  return {
    totalSales,
    totalQuantity,
    orderCount: filteredOrders.length
  };
}
