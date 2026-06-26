export interface MemberInfo {
  id: string;
  cardNumber: string;
  balance: number;
  memberLevel: string;
  memberName: string;
  birthday: string;
  points: number;
}

export interface Bonus {
  type: 'coupon' | 'cash';
  value: number;
  description: string;
}

export interface RechargeTier {
  id: string;
  amount: number;
  bonus: Bonus[];
}

export interface Transaction {
  id: string;
  type: 'recharge' | 'consume';
  amount: number;
  balanceAfter: number;
  description: string;
  storeName: string;
  createdAt: string;
  points?: number;
}

export interface Coupon {
  id: string;
  name: string;
  value: number;
  minSpend: number;
  expireDate: string;
}

export interface TransactionResponse {
  items: Transaction[];
  total: number;
  hasMore: boolean;
}

export interface InvoiceInfo {
  type: 'personal' | 'company';
  title: string;
  taxNumber?: string;
  email: string;
}

export interface RechargeRequest {
  tierId: string;
  paymentMethod: 'wechat' | 'alipay';
  invoice?: InvoiceInfo;
}

export interface RechargeResponse {
  success: boolean;
  newBalance: number;
  coupons: Coupon[];
  orderId: string;
  pointsEarned: number;
}
