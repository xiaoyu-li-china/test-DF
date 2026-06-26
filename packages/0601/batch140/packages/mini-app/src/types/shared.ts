export interface Leader {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  address: string;
  communityName: string;
  commissionRate: number;
  totalCommission: number;
  availableCommission: number;
  frozenCommission: number;
}

export interface Product {
  id: string;
  name: string;
  image: string;
  price: number;
  unit: string;
  spec?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  productPrice: number;
  quantity: number;
  unit: string;
  spec?: string;
}

export interface Buyer {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
}

export type OrderStatus = 
  | 'pending'
  | 'paid'
  | 'grouped'
  | 'delivered'
  | 'picked'
  | 'completed'
  | 'cancelled';

export type PickupStatus = 
  | 'pending'
  | 'picking'
  | 'picked';

export interface Order {
  id: string;
  orderNo: string;
  leaderId: string;
  buyer: Buyer;
  items: OrderItem[];
  totalAmount: number;
  commissionAmount: number;
  status: OrderStatus;
  pickupStatus: PickupStatus;
  pickupCode: string;
  groupDate: string;
  groupId: string;
  remark?: string;
  createdAt: string;
  paidAt?: string;
  deliveredAt?: string;
  pickedAt?: string;
}

export interface CommissionRecord {
  id: string;
  leaderId: string;
  orderId: string;
  orderNo: string;
  amount: number;
  type: 'income' | 'withdraw' | 'refund';
  status: 'pending' | 'available' | 'frozen' | 'paid';
  createdAt: string;
  settledAt?: string;
  remark?: string;
}

export interface DailySummary {
  date: string;
  orderCount: number;
  itemCount: number;
  totalAmount: number;
  commissionAmount: number;
  pickedCount: number;
  pendingPickupCount: number;
}

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

export interface WithdrawRecord {
  id: string;
  leaderId: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  payMethod?: 'wechat' | 'alipay' | 'bank';
  payAccount?: string;
  payTransactionId?: string;
  createdAt: string;
  approvedAt?: string;
  paidAt?: string;
  remark?: string;
}

export type UserRole = 'leader' | 'supplier' | 'admin';

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  companyName: string;
  avatar?: string;
  skuIds: string[];
  commissionRate: number;
  status: 'active' | 'inactive';
  totalSales: number;
  totalOrders: number;
}

export interface SupplierProduct {
  id: string;
  supplierId: string;
  name: string;
  image: string;
  price: number;
  unit: string;
  spec?: string;
  stock: number;
  sold: number;
  status: 'on_sale' | 'off_sale';
  createdAt: string;
}

export interface ScanResult {
  success: boolean;
  orderId?: string;
  orderNo?: string;
  pickupCode: string;
  buyerName?: string;
  message: string;
  timestamp: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId: string;
  amount: number;
  payMethod: string;
  timestamp: string;
}
