import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, Button, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import dayjs from 'dayjs';
import { useAppStore } from '../../store';
import EmptyState from '../../components/EmptyState';
import { formatMoney } from '../../utils/format';
import type { CommissionRecord } from '../../types/shared';
import styles from './index.module.scss';

type TabType = 'all' | 'income' | 'withdraw';

const CommissionPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const {
    leader,
    commissionRecords,
    fetchLeader,
    fetchCommissionRecords
  } = useAppStore();

  useEffect(() => {
    fetchLeader();
    fetchCommissionRecords();
  }, []);

  const filteredRecords = useMemo(() => {
    if (activeTab === 'all') return commissionRecords;
    return commissionRecords.filter(r => r.type === activeTab);
  }, [commissionRecords, activeTab]);

  const handleWithdraw = () => {
    if (!leader || leader.availableCommission <= 0) {
      Taro.showToast({ title: '暂无可提现佣金', icon: 'none' });
      return;
    }
    Taro.navigateTo({ url: '/pages/withdraw/index' });
  };

  const getRecordIcon = (type: CommissionRecord['type']) => {
    switch (type) {
      case 'income': return { icon: '💰', bg: '#ECFDF5' };
      case 'withdraw': return { icon: '💳', bg: '#FEF2F2' };
      default: return { icon: '📝', bg: '#F3F4F6' };
    }
  };

  return (
    <ScrollView className={styles.commissionPage} scrollY>
      <View className={styles.header}>
        <Text className={styles.headerTitle}>累计佣金</Text>
        <View className={styles.totalCommission}>
          {formatMoney(leader?.totalCommission || 0)}
        </View>
        <View className={styles.commissionBreakdown}>
          <View className={styles.breakdownItem}>
            <Text className={styles.label}>可提现</Text>
            <Text className={styles.value}>¥{formatMoney(leader?.availableCommission || 0)}</Text>
          </View>
          <View className={styles.breakdownItem}>
            <Text className={styles.label}>冻结中</Text>
            <Text className={styles.value}>¥{formatMoney(leader?.frozenCommission || 0)}</Text>
          </View>
        </View>
        <Button className={styles.withdrawBtn} onClick={handleWithdraw}>
          申请提现
        </Button>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>收支明细</Text>
        </View>

        <View className={styles.tabs}>
          <Text
            className={`${styles.tab} ${activeTab === 'all' ? styles.active : ''}`}
            onClick={() => setActiveTab('all')}
          >
            全部
          </Text>
          <Text
            className={`${styles.tab} ${activeTab === 'income' ? styles.active : ''}`}
            onClick={() => setActiveTab('income')}
          >
            收入
          </Text>
          <Text
            className={`${styles.tab} ${activeTab === 'withdraw' ? styles.active : ''}`}
            onClick={() => setActiveTab('withdraw')}
          >
            支出
          </Text>
        </View>

        <View className={styles.recordList}>
          {filteredRecords.length > 0 ? (
            filteredRecords.map((record) => {
              const { icon, bg } = getRecordIcon(record.type);
              return (
                <View key={record.id} className={styles.recordItem}>
                  <View
                    className={styles.recordIcon}
                    style={{ background: bg }}
                  >
                    {icon}
                  </View>
                  <View className={styles.recordInfo}>
                    <Text className={styles.recordTitle}>
                      {record.remark || (record.type === 'income' ? '订单佣金' : '佣金提现'}
                    </Text>
                    <Text className={styles.recordTime}>
                      {dayjs(record.createdAt).format('YYYY-MM-DD HH:mm')}
                    </Text>
                  </View>
                  <Text
                    className={`${styles.recordAmount} ${record.type === 'income' ? styles.income : styles.withdraw}`}
                  >
                    {formatMoney(Math.abs(record.amount))}
                  </Text>
                </View>
              );
            })
          ) : (
            <EmptyState text="暂无明细记录" icon="💰" />
          )}
        </View>
      </View>
    </ScrollView>
  );
};

export default CommissionPage;
