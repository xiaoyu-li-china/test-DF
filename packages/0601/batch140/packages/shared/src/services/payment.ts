import dayjs from 'dayjs';
import type { PaymentResult, WithdrawRecord } from '../types';

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
): Promise<PaymentResult> {
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

export function createWithdrawRecord(
  leaderId: string,
  amount: number,
  payMethod: 'wechat' | 'alipay' | 'bank',
  payAccount: string
): WithdrawRecord {
  return {
    id: `withdraw-${Date.now()}`,
    leaderId,
    amount,
    status: 'pending',
    payMethod,
    payAccount,
    createdAt: dayjs().toISOString()
  };
}

export function formatPayMethod(method: string): string {
  const labels: Record<string, string> = {
    wechat: '微信',
    alipay: '支付宝',
    bank: '银行卡'
  };
  return labels[method] || method;
}

export function formatPayAccount(account: string, method: string): string {
  if (method === 'wechat' || method === 'alipay') {
    return account.length > 4 
      ? `***${account.slice(-4)}` 
      : account;
  }
  if (method === 'bank') {
    return account.length > 8
      ? `**** **** ${account.slice(-4)}`
      : account;
  }
  return account;
}
