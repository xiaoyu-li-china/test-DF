import React, { useEffect } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useAppStore } from '../../store';
import { formatMoney } from '../../utils/format';
import styles from './index.module.scss';

const MinePage: React.FC = () => {
  const { leader, fetchLeader } = useAppStore();

  useEffect(() => {
    fetchLeader();
  }, []);

  const menuGroups = [
    {
      title: '团长服务',
      items: [
        { icon: '💳', label: '提现申请', bg: '#ECFDF5', action: () => Taro.navigateTo({ url: '/pages/withdraw/index' }) },
        { icon: '📷', label: '提货核销', bg: '#FEF3C7', action: () => Taro.navigateTo({ url: '/pages/scan/index' }) },
        { icon: '🏠', label: '自提点地址', bg: '#EFF6FF', action: () => Taro.showToast({ title: '功能开发中', icon: 'none' }) },
        { icon: '⏰', label: '营业时间', bg: '#FEF3C7', action: () => Taro.showToast({ title: '功能开发中', icon: 'none' }) },
        { icon: '📱', label: '联系客服', bg: '#FCE7F3', action: () => Taro.showToast({ title: '功能开发中', icon: 'none' }) },
      ]
    },
    {
      title: '供应商视图',
      items: [
        { icon: '🏪', label: '供应商中心', bg: '#F0FDF4', action: () => Taro.navigateTo({ url: '/pages/supplier/index' }) },
      ]
    },
    {
      title: '设置',
      items: [
        { icon: '🔔', label: '消息通知', bg: '#DBEAFE', action: () => Taro.showToast({ title: '功能开发中', icon: 'none' }) },
        { icon: '❓', label: '帮助中心', bg: '#D1FAE5', action: () => Taro.showToast({ title: '功能开发中', icon: 'none' }) },
        { icon: 'ℹ️', label: '关于我们', bg: '#F3E8FF', action: () => Taro.showToast({ title: '功能开发中', icon: 'none' }) },
      ]
    }
  ];

  return (
    <ScrollView className={styles.minePage} scrollY>
      <View className={styles.header}>
        <View className={styles.leaderCard}>
          <View className={styles.avatar}>👤</View>
          <View className={styles.info}>
            <Text className={styles.name}>{leader?.name || '团长'}</Text>
            <Text className={styles.community}>{leader?.communityName}</Text>
            <Text className={styles.phone}>{leader?.phone}</Text>
          </View>
        </View>
        <View className={styles.statsRow}>
          <View className={styles.statItem}>
            <Text className={styles.value}>¥{formatMoney(leader?.totalCommission || 0)}</Text>
            <Text className={styles.label}>累计佣金</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.value}>¥{formatMoney(leader?.availableCommission || 0)}</Text>
            <Text className={styles.label}>可提现</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.value}>{((leader?.commissionRate || 0) * 100).toFixed(0)}%</Text>
            <Text className={styles.label}>佣金比例</Text>
          </View>
        </View>
      </View>

      <View className={styles.menuList}>
        {menuGroups.map((group, groupIndex) => (
          <View key={groupIndex} className={styles.menuCard}>
            {group.items.map((item, itemIndex) => (
              <View
                key={itemIndex}
                className={styles.menuItem}
                onClick={item.action}
              >
                <View
                  className={styles.menuIcon}
                  style={{ background: item.bg }}
                >
                  {item.icon}
                </View>
                <View className={styles.menuContent}>
                  <Text className={styles.menuTitle}>{item.label}</Text>
                </View>
                <Text className={styles.menuArrow}>›</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

export default MinePage;
