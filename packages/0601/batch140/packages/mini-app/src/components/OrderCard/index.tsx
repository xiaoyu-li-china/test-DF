import React from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classNames from 'classnames';
import type { Order } from '../../types/shared';
import { ORDER_STATUS_LABELS, PICKUP_STATUS_LABELS } from '../../types/shared';
import { formatMoney } from '../../utils/format';
import styles from './index.module.scss';

interface OrderCardProps {
  order: Order;
  showPickupCode?: boolean;
  showAction?: boolean;
  onPickup?: (orderId: string) => void;
  onClick?: () => void;
}

const OrderCard: React.FC<OrderCardProps> = ({
  order,
  showPickupCode = false,
  showAction = false,
  onPickup,
  onClick
}) => {
  const handlePickup = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (order.pickupStatus === 'picked') return;
    Taro.showModal({
      title: '确认提货',
      content: `确认订单 ${order.orderNo} 已提货？`,
      success: (res) => {
        if (res.confirm) {
          onPickup?.(order.id);
        }
      }
    });
  };

  const getStatusClass = () => {
    if (order.pickupStatus === 'picked') return 'picked';
    if (order.status === 'completed') return 'completed';
    return 'pending';
  };

  return (
    <View className={styles.orderCard} onClick={onClick}>
      <View className={styles.header}>
        <Text className={styles.orderNo}>{order.orderNo}</Text>
        <Text className={classNames(styles.status, styles[getStatusClass()])}>
          {order.pickupStatus === 'picked'
            ? PICKUP_STATUS_LABELS.picked
            : ORDER_STATUS_LABELS[order.status]}
        </Text>
      </View>

      <View className={styles.buyerInfo}>
        <Text className={styles.name}>{order.buyer.name}</Text>
        <Text className={styles.phone}>{order.buyer.phone}</Text>
      </View>

      {showPickupCode && order.pickupStatus !== 'picked' && (
        <View className={styles.pickupCode}>
          <Text className={styles.label}>提货码:</Text>
          <Text className={styles.code}>{order.pickupCode}</Text>
        </View>
      )}

      <View className={styles.items}>
        {order.items.slice(0, 3).map((item, index) => (
          <View key={index} className={styles.item}>
            <View style={{ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden' }}>
              <Text className={styles.itemName}>{item.productName}</Text>
              {item.spec && <Text className={styles.itemSpec}>({item.spec})</Text>}
            </View>
            <Text className={styles.itemQuantity}>x{item.quantity}</Text>
          </View>
        ))}
        {order.items.length > 3 && (
          <View className={styles.item}>
            <Text className={styles.itemName} style={{ color: '$color-text-tertiary' }}>
              等{order.items.length}件商品
            </Text>
          </View>
        )}
      </View>

      <View className={styles.footer}>
        <View className={styles.total}>
          <Text>合计:</Text>
          <Text className={styles.amount}>{formatMoney(order.totalAmount)}</Text>
        </View>
        <Text className={styles.commission}>佣金 ¥{formatMoney(order.commissionAmount)}</Text>
        {showAction && (
          <Button
            className={classNames(
              styles.actionBtn,
              order.pickupStatus === 'picked' && styles.disabled
            )}
            onClick={handlePickup}
          >
            {order.pickupStatus === 'picked' ? '已提货' : '确认提货'}
          </Button>
        )}
      </View>
    </View>
  );
};

export default OrderCard;
