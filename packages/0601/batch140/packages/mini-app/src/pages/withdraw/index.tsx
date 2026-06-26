import React, { useEffect, useState } from 'react';
import { View, Text, Input, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import dayjs from 'dayjs';
import classNames from 'classnames';
import { useAppStore } from '../../store';
import { formatMoney } from '../../utils/format';
import styles from './index.module.scss';

type PayMethod = 'wechat' | 'alipay' | 'bank';

const WithdrawPage: React.FC = () => {
  const {
    leader,
    withdrawRecords,
    fetchWithdrawRecords,
    requestWithdraw
  } = useAppStore();

  const [amount, setAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PayMethod>('wechat');
  const [payAccount, setPayAccount] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchWithdrawRecords();
  }, []);

  const payMethods = [
    { key: 'wechat', name: '微信钱包', icon: '💚', bg: '#ecfdf5' },
    { key: 'alipay', name: '支付宝', icon: '💙', bg: '#dbeafe' },
    { key: 'bank', name: '银行卡', icon: '🏦', bg: '#f3e8ff' }
  ];

  const quickAmounts = [50, 100, 200, 500];

  const handleQuickAmount = (value: number) => {
    if (value <= (leader?.availableCommission || 0)) {
      setAmount(value.toString());
    }
  };

  const handleWithdraw = async () => {
    const numAmount = parseFloat(amount);
    
    if (!numAmount || numAmount <= 0) {
      Taro.showToast({ title: '请输入提现金额', icon: 'none' });
      return;
    }

    if (numAmount > (leader?.availableCommission || 0)) {
      Taro.showToast({ title: '提现金额不能超过可提现余额', icon: 'none' });
      return;
    }

    if (!payAccount) {
      Taro.showToast({ title: '请输入收款账号', icon: 'none' });
      return;
    }

    setLoading(true);
    try {
      const result = await requestWithdraw(numAmount, payMethod, payAccount);
      if (result.success) {
        Taro.showToast({ title: '提现成功', icon: 'success' });
        setAmount('');
        setPayAccount('');
      } else {
        Taro.showToast({ title: result.message, icon: 'none' });
      }
    } catch (error) {
      Taro.showToast({ title: '提现失败，请重试', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  const formatPayMethod = (method: string) => {
    const labels: Record<string, string> = {
      wechat: '微信',
      alipay: '支付宝',
      bank: '银行卡'
    };
    return labels[method] || method;
  };

  const formatStatus = (status: string) => {
    const labels: Record<string, string> = {
      pending: '处理中',
      approved: '已批准',
      paid: '已到账',
      rejected: '已拒绝'
    };
    return labels[status] || status;
  };

  return (
    <View className={styles.withdrawPage}>
      <View className={styles.balanceCard}>
        <Text className={styles.label}>可提现余额</Text>
        <View className={styles.amount}>{formatMoney(leader?.availableCommission || 0)}</View>
        <Text className={styles.tips}>
          累计佣金：¥{formatMoney(leader?.totalCommission || 0)}
        </Text>
      </View>

      <View className={styles.formCard}>
        <Text className={styles.formTitle}>提现信息</Text>

        <View className={styles.formGroup}>
          <Text className={styles.formLabel}>提现金额</Text>
          <Input
            className={classNames(styles.formInput, styles.amountInput)}
            type="digit"
            placeholder="0.00"
            value={amount}
            onInput={(e) => setAmount(e.detail.value)}
          />
          <View className={styles.quickAmounts}>
            {quickAmounts.map((value) => (
              <View
                key={value}
                className={classNames(
                  styles.quickAmountBtn,
                  amount === value.toString() && styles.active
                )}
                onClick={() => handleQuickAmount(value)}
              >
                ¥{value}
              </View>
            ))}
          </View>
        </View>

        <View className={styles.formGroup}>
          <Text className={styles.formLabel}>收款方式</Text>
          <View className={styles.payMethodList}>
            {payMethods.map((method) => (
              <View
                key={method.key}
                className={classNames(
                  styles.payMethodItem,
                  payMethod === method.key && styles.active
                )}
                onClick={() => setPayMethod(method.key as PayMethod)}
              >
                <View
                  className={styles.payMethodIcon}
                  style={{ background: method.bg }}
                >
                  {method.icon}
                </View>
                <View className={styles.payMethodInfo}>
                  <Text className={styles.payMethodName}>{method.name}</Text>
                </View>
                <View
                  className={classNames(
                    styles.radio,
                    payMethod === method.key && styles.active
                  )}
                />
              </View>
            ))}
          </View>
        </View>

        <View className={styles.formGroup}>
          <Text className={styles.formLabel}>收款账号</Text>
          <Input
            className={styles.formInput}
            placeholder={payMethod === 'bank' ? '请输入银行卡号' : '请输入账号'}
            value={payAccount}
            onInput={(e) => setPayAccount(e.detail.value)}
          />
        </View>
      </View>

      <Button
        className={styles.withdrawBtn}
        disabled={loading || !amount || !payAccount}
        onClick={handleWithdraw}
      >
        {loading ? '处理中...' : '确认提现'}
      </Button>

      <View className={styles.withdrawRecords}>
        <Text className={styles.recordsTitle}>提现记录</Text>
        {withdrawRecords.length > 0 ? (
          withdrawRecords.map((record) => (
            <View key={record.id} className={styles.recordItem}>
              <View className={styles.recordInfo}>
                <Text className={styles.recordAmount}>
                  -¥{formatMoney(record.amount)}
                </Text>
                <Text className={styles.recordMeta}>
                  {formatPayMethod(record.payMethod || '')} · {dayjs(record.createdAt).format('MM-DD HH:mm')}
                </Text>
              </View>
              <Text
                className={classNames(
                  styles.recordStatus,
                  styles[record.status]
                )}
              >
                {formatStatus(record.status)}
              </Text>
            </View>
          ))
        ) : (
          <View style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            暂无提现记录
          </View>
        )}
      </View>
    </View>
  );
};

export default WithdrawPage;
