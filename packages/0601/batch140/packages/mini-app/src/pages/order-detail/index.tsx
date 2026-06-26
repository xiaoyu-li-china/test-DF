import React, { useEffect, useState } from 'react';
import { View, Text, Button, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useAppStore } from '../../store';
import { formatMoney, formatDateTime } from '../../utils/format';
import { ORDER_STATUS_LABELS, PICKUP_STATUS_LABELS } from '../../types/shared';
import styles from './index.module.scss';

const OrderDetailPage: React.FC = () => {
  const [orderId, setOrderId] = useState('');
  const { orders, markAsPicked } = useAppStore();

  useEffect(() => {
    const pages = Taro.getCurrentPages();
    const currentPage = pages[pages.length - 1];
    const id = (currentPage as any)?.options?.id;
    if (id) {
      setOrderId(id);
    }
  }, []);

  const order = orders.find(o => o.id === orderId);

  const handlePickup = () => {
    if (!order) return;
    Taro.showModal({
      title: '确认提货',
      content: `确认订单 ${order.orderNo} 已提货？`,
      success: (res) => {
        if (res.confirm) {
          markAsPicked(order.id);
          Taro.showToast({ title: '提货成功', icon: 'success' });
        }
      }
    });
  };

  const handleCall = () => {
    if (!order) return;
    Taro.makePhoneCall({ phoneNumber: order.buyer.phone });
  };

  if (!order) {
    return (
      <View style={{ padding: 100, textAlign: 'center' }}>
        <Text>订单不存在</Text>
      </View>
    );
  }

  return (
    <ScrollView className={styles.orderDetailPage} scrollY>
      <View className={styles.statusHeader}>
        <Text className={styles.statusText}>
          {order.pickupStatus === 'picked'
            ? PICKUP_STATUS_LABELS.picked
            : ORDER_STATUS_LABELS[order.status]}
        </Text>
        <Text className={styles.statusDesc}>
          {order.pickupStatus === 'picked' ? '感谢使用' : '请及时核销提货码'}
        </Text>
      </View>

      {order.pickupStatus !== 'picked' && (
        <View className={styles.pickupCodeBox}>
          <Text className={styles.pickupCodeLabel}>提货码</Text>
          <Text className={styles.pickupCode}>{order.pickupCode}</Text>
        </View>
      )}

      <View className={styles.orderInfo}>
        <View className={styles.infoRow}>
          <Text className={styles.label}>订单编号</Text>
          <Text className={styles.value}>{order.orderNo}</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.label}>成团日期</Text>
          <Text className={styles.value}>{order.groupDate}</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.label}>下单时间</Text>
          <Text className={styles.value}>{formatDateTime(order.createdAt)}</Text>
        </View>
        {order.remark && (
          <View className={styles.infoRow}>
            <Text className={styles.label}>备注</Text>
            <Text className={styles.value}>{order.remark}</Text>
          </View>
        )}
      </View>

      <View className={styles.buyerInfo}>
        <Text className={styles.sectionTitle}>收货人</Text>
        <View className={styles.buyerRow}>
          <Text className={styles.label}>姓名：</Text>
          <Text className={styles.value}>{order.buyer.name}</Text>
        </View>
        <View className={styles.buyerRow}>
          <Text className={styles.label}>电话：</Text>
          <Text className={styles.value}>{order.buyer.phone}</Text>
        </View>
      </View>

      <View className={styles.itemsList}>
        {order.items.map((item, index) => (
          <View key={index} className={styles.itemCard}>
            <View className={styles.itemInfo}>
              <Text className={styles.itemName}>{item.productName}</Text>
              {item.spec && <Text className={styles.itemSpec}>{item.spec}</Text>}
            </View>
            <View className={styles.itemRight}>
              <Text className={styles.itemPrice}>¥{formatMoney(item.productPrice)}</Text>
              <Text className={styles.itemQuantity}>x{item.quantity}</Text>
            </View>
          </View>
        ))}
      </View>

      <View className={styles.amountSummary}>
        <View className={styles.summaryRow}>
          <Text className={styles.label}>商品总额</Text>
          <Text className={styles.value}>¥{formatMoney(order.totalAmount)}</Text>
        </View>
        <View className={`${styles.summaryRow} ${styles.commission}`}>
          <Text className={styles.label}>佣金收入</Text>
          <Text className={styles.value}>+¥{formatMoney(order.commissionAmount)}</Text>
        </View>
        <View className={`${styles.summaryRow} ${styles.total}`}>
          <Text className={styles.label}>实付金额</Text>
          <Text className={styles.value}>¥{formatMoney(order.totalAmount)}</Text>
        </View>
      </View>

      <View className={styles.actionBar}>
        <Button className={`${styles.actionBtn} ${styles.secondary}`} onClick={handleCall}>
          联系买家
        </Button>
        {order.pickupStatus !== 'picked' && (
          <Button className={`${styles.actionBtn} ${styles.primary}`} onClick={handlePickup}>
            确认提货
          </Button>
        )}
      </View>
    </ScrollView>
  );
};

export default OrderDetailPage;
