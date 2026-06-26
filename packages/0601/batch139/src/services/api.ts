import type {
  MemberInfo,
  RechargeTier,
  TransactionResponse,
  RechargeResponse,
  InvoiceInfo,
} from '@/types';

export const getMemberInfo = async (): Promise<MemberInfo> => {
  const res = await fetch('/api/member/info');
  if (!res.ok) throw new Error('获取会员信息失败');
  return res.json();
};

export const getRechargeTiers = async (): Promise<RechargeTier[]> => {
  const res = await fetch('/api/recharge/tiers');
  if (!res.ok) throw new Error('获取充值档位失败');
  return res.json();
};

export const getTransactions = async (
  page: number = 1,
  pageSize: number = 10
): Promise<TransactionResponse> => {
  const res = await fetch(`/api/transactions?page=${page}&pageSize=${pageSize}`);
  if (!res.ok) throw new Error('获取交易记录失败');
  return res.json();
};

export const recharge = async (
  tierId: string,
  paymentMethod: string = 'wechat',
  invoice?: InvoiceInfo
): Promise<RechargeResponse> => {
  const res = await fetch('/api/recharge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tierId, paymentMethod, invoice }),
  });
  if (!res.ok) throw new Error('充值失败');
  return res.json();
};
