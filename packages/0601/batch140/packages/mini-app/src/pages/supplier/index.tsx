import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import dayjs from 'dayjs';
import classNames from 'classnames';
import { useAppStore } from '../../store';
import type { SupplierProduct, Order } from '../../types/shared';
import styles from './index.module.scss';

type TabType = 'products' | 'orders';

const SupplierPage: React.FC = () => {
  const {
    suppliers,
    supplierProducts,
    orders,
    fetchSuppliers,
    fetchOrders,
    getSupplierOrders,
    getSupplierStats,
    getSupplierProducts
  } = useAppStore();

  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('products');

  useEffect(() => {
    fetchSuppliers();
    fetchOrders();
  }, []);

  useEffect(() => {
    if (suppliers.length > 0 && !selectedSupplierId) {
      setSelectedSupplierId(suppliers[0].id);
    }
  }, [suppliers, selectedSupplierId]);

  const supplier = useMemo(() => 
    suppliers.find(s => s.id === selectedSupplierId),
    [suppliers, selectedSupplierId]
  );

  const stats = useMemo(() => {
    if (!selectedSupplierId) return { totalSales: 0, totalQuantity: 0, orderCount: 0 };
    return getSupplierStats(selectedSupplierId);
  }, [selectedSupplierId, getSupplierStats]);

  const products = useMemo(() => {
    if (!selectedSupplierId) return [];
    return getSupplierProducts(selectedSupplierId);
  }, [selectedSupplierId, getSupplierProducts]);

  const supplierOrders = useMemo(() => {
    if (!selectedSupplierId) return [];
    return getSupplierOrders(selectedSupplierId).slice(0, 20);
  }, [selectedSupplierId, getSupplierOrders]);

  const getSupplierItems = (order: Order): SupplierProduct[] => {
    const productIds = products.map(p => p.id);
    return order.items
      .filter(item => productIds.includes(item.productId))
      .map(item => ({
        id: item.productId,
        supplierId: selectedSupplierId || '',
        name: item.productName,
        image: item.productImage,
        price: item.productPrice,
        unit: item.unit,
        spec: item.spec,
        stock: 0,
        sold: 0,
        status: 'on_sale',
        createdAt: ''
      }));
  };

  const getProductIcon = (name: string): string => {
    if (name.includes('莓') || name.includes('樱桃') || name.includes('果')) return '🍓';
    if (name.includes('菜') || name.includes('蔬菜')) return '🥬';
    if (name.includes('蛋') || name.includes('鸡')) return '🥚';
    if (name.includes('奶')) return '🥛';
    if (name.includes('肉')) return '🥩';
    if (name.includes('米') || name.includes('面')) return '🍚';
    if (name.includes('油')) return '🛢️';
    return '🥗';
  };

  return (
    <ScrollView className={styles.supplierPage} scrollY>
      <View className={styles.permissionTip}>
        🔒 当前为供应商视图，仅可见所属SKU数据
      </View>

      <View className={styles.supplierSelector}>
        <Text className={styles.selectorLabel}>选择供应商：</Text>
        <View className={styles.supplierList}>
          {suppliers.map(s => (
            <View
              key={s.id}
              className={classNames(
                styles.supplierChip,
                selectedSupplierId === s.id && styles.active
              )}
              onClick={() => setSelectedSupplierId(s.id)}
            >
              {s.name}
            </View>
          ))}
        </View>
      </View>

      <View className={styles.statsGrid}>
        <View className={styles.statCard}>
          <Text className={styles.statValue}>¥{stats.totalSales.toFixed(0)}</Text>
          <Text className={styles.statLabel}>销售额</Text>
        </View>
        <View className={classNames(styles.statCard, styles.success)}>
          <Text className={styles.statValue}>{stats.totalQuantity}</Text>
          <Text className={styles.statLabel}>销售件数</Text>
        </View>
        <View className={classNames(styles.statCard, styles.warning)}>
          <Text className={styles.statValue}>{stats.orderCount}</Text>
          <Text className={styles.statLabel}>订单数</Text>
        </View>
        <View className={styles.statCard}>
          <Text className={styles.statValue}>{((supplier?.commissionRate || 0) * 100).toFixed(0)}%</Text>
          <Text className={styles.statLabel}>佣金率</Text>
        </View>
      </View>

      <View className={styles.tabs}>
        <Text
          className={classNames(styles.tab, activeTab === 'products' && styles.active)}
          onClick={() => setActiveTab('products')}
        >
          商品列表
        </Text>
        <Text
          className={classNames(styles.tab, activeTab === 'orders' && styles.active)}
          onClick={() => setActiveTab('orders')}
        >
          相关订单
        </Text>
      </View>

      {activeTab === 'products' && (
        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>供应商品</Text>
            <Text style={{ fontSize: 24, color: '#94a3b8' }}>共 {products.length} 件</Text>
          </View>
          <View className={styles.productList}>
            {products.map(product => (
              <View key={product.id} className={styles.productCard}>
                <View className={styles.productImage}>
                  {getProductIcon(product.name)}
                </View>
                <View className={styles.productInfo}>
                  <Text className={styles.productName}>{product.name}</Text>
                  <Text className={styles.productSpec}>{product.spec}</Text>
                  <View className={styles.productStats}>
                    <Text className={styles.productPrice}>¥{product.price}</Text>
                    <Text className={styles.productStock}>库存: {product.stock}</Text>
                  </View>
                  <Text className={styles.productOrders}>
                    已售 {product.sold} 件
                  </Text>
                </View>
              </View>
            ))}
            {products.length === 0 && (
              <View style={{ padding: 80, textAlign: 'center', color: '#94a3b8' }}>
                暂无商品数据
              </View>
            )}
          </View>
        </View>
      )}

      {activeTab === 'orders' && (
        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>相关订单</Text>
            <Text style={{ fontSize: 24, color: '#94a3b8' }}>仅显示含该供应商商品的订单</Text>
          </View>
          <View className={styles.orderList}>
            {supplierOrders.map(order => (
              <View key={order.id} className={styles.orderCard}>
                <View className={styles.orderHeader}>
                  <Text className={styles.orderNo}>{order.orderNo}</Text>
                  <Text
                    className={classNames(
                      styles.orderStatus,
                      order.pickupStatus === 'picked' ? styles.picked : styles.pending
                    )}
                  >
                    {order.pickupStatus === 'picked' ? '已提货' : '待提货'}
                  </Text>
                </View>
                <View className={styles.buyerInfo}>
                  买家：{order.buyer.name}
                </View>
                <View className={styles.orderItems}>
                  {getSupplierItems(order).map((item, i) => (
                    <View key={i} className={styles.orderItem}>
                      <Text className={styles.itemName}>{item.name}</Text>
                      <Text className={styles.itemQuantity}>x{item.stock || 1}</Text>
                    </View>
                  ))}
                </View>
                <View className={styles.orderFooter}>
                  <Text className={styles.orderTime}>
                    {dayjs(order.createdAt).format('MM-DD HH:mm')}
                  </Text>
                  <Text className={styles.orderAmount}>
                    ¥{getSupplierItems(order).reduce((sum, item) => sum + item.price * (item.stock || 1), 0).toFixed(2)}
                  </Text>
                </View>
              </View>
            ))}
            {supplierOrders.length === 0 && (
              <View style={{ padding: 80, textAlign: 'center', color: '#94a3b8' }}>
                暂无订单数据
              </View>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default SupplierPage;
