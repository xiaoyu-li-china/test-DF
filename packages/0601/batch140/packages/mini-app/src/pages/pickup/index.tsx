import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, Input, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useAppStore } from '../../store';
import OrderCard from '../../components/OrderCard';
import EmptyState from '../../components/EmptyState';
import styles from './index.module.scss';

type TabType = 'pending' | 'picked';

const PickupPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [searchKeyword, setSearchKeyword] = useState('');
  
  const {
    orders,
    fetchOrders,
    markAsPicked,
    getPendingPickupOrders,
    searchOrders
  } = useAppStore();

  useEffect(() => {
    fetchOrders();
  }, []);

  const pendingOrders = useMemo(() => getPendingPickupOrders(), [orders]);
  const pickedOrders = useMemo(() => 
    orders.filter(o => o.pickupStatus === 'picked' && o.status !== 'cancelled'),
    [orders]
  );

  const displayOrders = useMemo(() => {
    const baseOrders = activeTab === 'pending' ? pendingOrders : pickedOrders;
    if (searchKeyword) {
      return searchOrders(searchKeyword).filter(o => 
        activeTab === 'pending' 
          ? o.pickupStatus === 'pending' 
          : o.pickupStatus === 'picked'
      );
    }
    return baseOrders;
  }, [activeTab, pendingOrders, pickedOrders, searchKeyword, searchOrders]);

  const handleOrderClick = (orderId: string) => {
    Taro.navigateTo({
      url: `/pages/order-detail/index?id=${orderId}`
    });
  };

  return (
    <ScrollView className={styles.pickupPage} scrollY>
      <View className={styles.searchBar}>
        <Text className={styles.searchIcon}>🔍</Text>
        <Input
          className={styles.searchInput}
          placeholder="搜索订单号、姓名、提货码"
          value={searchKeyword}
          onInput={(e) => setSearchKeyword(e.detail.value)}
        />
      </View>

      <View className={styles.tabs}>
        <Text
          className={`${styles.tab} ${activeTab === 'pending' ? styles.active : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          待提货 ({pendingOrders.length})
        </Text>
        <Text
          className={`${styles.tab} ${activeTab === 'picked' ? styles.active : ''}`}
          onClick={() => setActiveTab('picked')}
        >
          已提货 ({pickedOrders.length})
        </Text>
      </View>

      {activeTab === 'pending' && (
        <View className={styles.statsBar}>
          <View className={styles.statItem}>
            <Text className={styles.value}>{pendingOrders.length}</Text>
            <Text className={styles.label}>待提货</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.value} style={{ color: '#07c160' }}>
              {pendingOrders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0)}
            </Text>
            <Text className={styles.label}>待提商品</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.value} style={{ color: '#f59e0b' }}>
              ¥{pendingOrders.reduce((sum, o) => sum + o.totalAmount, 0).toFixed(2)}
            </Text>
            <Text className={styles.label}>待提金额</Text>
          </View>
        </View>
      )}

      <View className={styles.orderList}>
        {displayOrders.length > 0 ? (
          displayOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              showPickupCode={activeTab === 'pending'}
              showAction={activeTab === 'pending'}
              onPickup={markAsPicked}
              onClick={() => handleOrderClick(order.id)}
            />
          ))
        ) : (
          <EmptyState
            text={activeTab === 'pending' ? '暂无待提货订单' : '暂无已提货订单'}
            icon={activeTab === 'pending' ? '📦' : '✅'}
          />
        )}
      </View>
    </ScrollView>
  );
};

export default PickupPage;
