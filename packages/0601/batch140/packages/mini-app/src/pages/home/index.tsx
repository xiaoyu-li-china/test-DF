import React, { useEffect } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useAppStore } from '../../store';
import StatCard from '../../components/StatCard';
import OrderCard from '../../components/OrderCard';
import EmptyState from '../../components/EmptyState';
import { formatMoney } from '../../utils/format';
import styles from './index.module.scss';

const HomePage: React.FC = () => {
  const {
    leader,
    dailySummary,
    orders,
    fetchLeader,
    fetchOrders,
    fetchDailySummary,
    markAsPicked,
    getTodayOrders
  } = useAppStore();

  useEffect(() => {
    fetchLeader();
    fetchOrders();
  }, []);

  useEffect(() => {
    if (orders.length > 0) {
      fetchDailySummary();
    }
  }, [orders, fetchDailySummary]);

  const todayOrders = getTodayOrders().slice(0, 3);

  const quickActions = [
    { icon: '📦', label: '待提货', color: '#FFF7ED', action: () => Taro.switchTab({ url: '/pages/pickup/index' }) },
    { icon: '📋', label: '今日订单', color: '#EFF6FF', action: () => Taro.switchTab({ url: '/pages/orders/index' }) },
    { icon: '💰', label: '佣金明细', color: '#F0FDF4', action: () => Taro.switchTab({ url: '/pages/commission/index' }) },
    { icon: '📊', label: '导出订单', color: '#FDF4FF', action: () => Taro.showToast({ title: '导出功能开发中', icon: 'none' }) }
  ];

  const handleOrderClick = (orderId: string) => {
    Taro.navigateTo({
      url: `/pages/order-detail/index?id=${orderId}`
    });
  };

  return (
    <ScrollView className={styles.homePage} scrollY>
      <View className={styles.header}>
        <View className={styles.leaderInfo}>
          <View className={styles.avatar}>👤</View>
          <View className={styles.info}>
            <Text className={styles.name}>{leader?.name || '团长'}</Text>
            <Text className={styles.community}>{leader?.communityName}</Text>
          </View>
        </View>
      </View>

      <View className={styles.statsGrid}>
        <StatCard
          value={dailySummary?.orderCount || 0}
          label="今日成团"
          type="primary"
          onClick={() => Taro.switchTab({ url: '/pages/orders/index' })}
        />
        <StatCard
          value={dailySummary?.pendingPickupCount || 0}
          label="待提货"
          type="warning"
          onClick={() => Taro.switchTab({ url: '/pages/pickup/index' })}
        />
        <StatCard
          value={formatMoney(dailySummary?.totalAmount || 0)}
          label="今日销售额"
          type="success"
          isMoney
        />
        <StatCard
          value={formatMoney(dailySummary?.commissionAmount || 0)}
          label="今日佣金"
          type="primary"
          isMoney
          onClick={() => Taro.switchTab({ url: '/pages/commission/index' })}
        />
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>快捷操作</Text>
        </View>
        <View className={styles.quickActions}>
          {quickActions.map((action, index) => (
            <View
              key={index}
              className={styles.actionItem}
              onClick={action.action}
            >
              <View
                className={styles.actionIcon}
                style={{ background: action.color }}
              >
                {action.icon}
              </View>
              <Text className={styles.actionLabel}>{action.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>今日订单</Text>
          <Text
            className={styles.seeAll}
            onClick={() => Taro.switchTab({ url: '/pages/orders/index' })}
          >
            查看全部
          </Text>
        </View>
        <View className={styles.orderList}>
          {todayOrders.length > 0 ? (
            todayOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                showPickupCode
                showAction
                onPickup={markAsPicked}
                onClick={() => handleOrderClick(order.id)}
              />
            ))
          ) : (
            <EmptyState text="暂无今日订单" icon="📋" />
          )}
        </View>
      </View>
    </ScrollView>
  );
};

export default HomePage;
