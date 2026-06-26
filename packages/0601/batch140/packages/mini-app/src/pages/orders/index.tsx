import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Button, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import dayjs from 'dayjs';
import { useAppStore } from '../../store';
import OrderCard from '../../components/OrderCard';
import EmptyState from '../../components/EmptyState';
import { formatMoney } from '../../utils/format';
import type { Order } from '../../types/shared';
import styles from './index.module.scss';

const OrdersPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const { orders, fetchOrders, markAsPicked } = useAppStore();

  useEffect(() => {
    fetchOrders();
  }, []);

  const validOrders = useMemo(() => 
    orders.filter(o => o.status !== 'cancelled'),
    [orders]
  );

  const groupedOrders = useMemo(() => {
    const groups = new Map<string, Order[]>();
    validOrders.forEach(order => {
      const date = order.groupDate;
      if (!groups.has(date)) {
        groups.set(date, []);
      }
      groups.get(date)!.push(order);
    });
    return Array.from(groups.entries())
      .sort((a, b) => dayjs(b[0]).valueOf() - dayjs(a[0]).valueOf());
  }, [validOrders]);

  const dateOrders = useMemo(() => {
    return validOrders.filter(o => dayjs(o.groupDate).isSame(selectedDate, 'day'));
  }, [validOrders, selectedDate]);

  const summary = useMemo(() => ({
    orderCount: dateOrders.length,
    itemCount: dateOrders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0),
    totalAmount: dateOrders.reduce((sum, o) => sum + o.totalAmount, 0),
    commission: dateOrders.reduce((sum, o) => sum + o.commissionAmount, 0)
  }), [dateOrders]);

  const handleDateSelect = () => {
    const dates = Array.from(new Set(validOrders.map(o => o.groupDate)))
      .sort((a, b) => dayjs(b).valueOf() - dayjs(a).valueOf());
    
    Taro.showActionSheet({
      itemList: dates.map(d => dayjs(d).format('YYYY-MM-DD')),
      success: (res) => {
        setSelectedDate(dates[res.tapIndex]);
      }
    });
  };

  const handleExport = () => {
    Taro.showModal({
      title: '导出Excel',
      content: `确认导出 ${dayjs(selectedDate).format('YYYY-MM-DD')} 的订单数据？`,
      success: (res) => {
        if (res.confirm) {
          Taro.showLoading({ title: '导出中...' });
          setTimeout(() => {
            Taro.hideLoading();
            Taro.showToast({ title: '导出成功', icon: 'success' });
            console.log('[Export] 导出订单数据:', { date: selectedDate, count: dateOrders.length });
          }, 1000);
        }
      }
    });
  };

  const handleOrderClick = (orderId: string) => {
    Taro.navigateTo({
      url: `/pages/order-detail/index?id=${orderId}`
    });
  };

  return (
    <ScrollView className={styles.ordersPage} scrollY>
      <View className={styles.filterBar}>
        <View className={styles.dateSelector} onClick={handleDateSelect}>
          <View>
            <Text className={styles.dateLabel}>选择日期</Text>
            <View style={{ marginTop: 8 }}>
              <Text className={styles.dateValue}>
                {dayjs(selectedDate).format('YYYY-MM-DD')}
              </Text>
            </View>
          </View>
          <Text className={styles.dateIcon}>📅</Text>
        </View>

        <View className={styles.summaryCard}>
          <View className={styles.summaryItem}>
            <Text className={styles.value}>{summary.orderCount}</Text>
            <Text className={styles.label}>订单数</Text>
          </View>
          <View className={styles.summaryItem}>
            <Text className={styles.value}>{summary.itemCount}</Text>
            <Text className={styles.label}>商品数</Text>
          </View>
          <View className={styles.summaryItem}>
            <Text className={styles.value}>¥{formatMoney(summary.totalAmount)}</Text>
            <Text className={styles.label}>销售额</Text>
          </View>
          <View className={styles.summaryItem}>
            <Text className={styles.value} style={{ color: '#07c160' }}>
              ¥{formatMoney(summary.commission)}
            </Text>
            <Text className={styles.label}>佣金</Text>
          </View>
        </View>

        <Button className={styles.exportBtn} onClick={handleExport}>
          📊 导出当日订单 Excel
        </Button>
      </View>

      <View className={styles.orderList}>
        {groupedOrders.map(([date, dateOrderList]) => (
          <View key={date} className={styles.dateGroup}>
            <View className={styles.dateHeader}>
              <Text className={styles.dateTitle}>
                {dayjs(date).format('YYYY-MM-DD')}
                {dayjs(date).isSame(dayjs(), 'day') && ' (今日)'}
              </Text>
              <Text className={styles.dateStats}>
                {dateOrderList.length} 单 · ¥{formatMoney(dateOrderList.reduce((s, o) => s + o.totalAmount, 0))}
              </Text>
            </View>
            {dateOrderList.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onClick={() => handleOrderClick(order.id)}
                onPickup={markAsPicked}
              />
            ))}
          </View>
        ))}

        {groupedOrders.length === 0 && (
          <EmptyState text="暂无订单数据" icon="📋" />
        )}
      </View>
    </ScrollView>
  );
};

export default OrdersPage;
