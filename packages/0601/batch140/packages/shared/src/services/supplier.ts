import dayjs from 'dayjs';
import type { Supplier, SupplierProduct, Order, OrderItem } from '../types';

export function filterOrdersBySupplier(
  orders: Order[],
  supplierId: string,
  supplierProducts: SupplierProduct[]
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

export function filterOrderItemsBySupplier(
  items: OrderItem[],
  supplierId: string,
  supplierProducts: SupplierProduct[]
): OrderItem[] {
  const productIds = supplierProducts
    .filter(p => p.supplierId === supplierId)
    .map(p => p.id);

  return items.filter(item => productIds.includes(item.productId));
}

export function calculateSupplierSales(
  orders: Order[],
  supplierId: string,
  supplierProducts: SupplierProduct[]
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

export function getMockSuppliers(): Supplier[] {
  return [
    {
      id: 'supplier-001',
      name: '鲜果农业',
      phone: '13900139001',
      companyName: '鲜果农业有限公司',
      skuIds: ['p1', 'p2'],
      commissionRate: 0.05,
      status: 'active',
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
      status: 'active',
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
      status: 'active',
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
      status: 'active',
      totalSales: 203500,
      totalOrders: 5680
    }
  ];
}

export function getMockSupplierProducts(): SupplierProduct[] {
  return [
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
      status: 'on_sale',
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
      status: 'on_sale',
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
      status: 'on_sale',
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
      status: 'on_sale',
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
      status: 'on_sale',
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
      status: 'on_sale',
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
      status: 'on_sale',
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
      status: 'on_sale',
      createdAt: dayjs().subtract(30, 'day').toISOString()
    }
  ];
}
