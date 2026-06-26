import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import {
  MOCK_INSPECTOR,
  STATUS_LABELS,
  formatDate,
  isToday,
  inspectionService,
} from '@inspection/shared';
import styles from './index.module.scss';
import classnames from 'classnames';

export default function HomePage() {
  const [inspections, setInspections] = useState(inspectionService.getInspections());
  const [loading, setLoading] = useState(false);

  const todayInspections = inspections.filter((i) => isToday(i.scheduledDate));
  const completedCount = todayInspections.filter((i) => i.status === 'completed').length;
  const pendingCount = todayInspections.filter((i) => i.status === 'pending').length;
  const inProgressCount = todayInspections.filter((i) => i.status === 'in_progress').length;

  useEffect(() => {
    console.log('[HomePage] 页面加载，今日巡检数量:', todayInspections.length);
    const unsubscribe = inspectionService.subscribe((type) => {
      if (type === 'inspection') {
        console.log('[HomePage] 收到数据更新通知');
        setInspections(inspectionService.getInspections());
      }
    });
    return unsubscribe;
  }, []);

  const onRefresh = () => {
    setLoading(true);
    console.log('[HomePage] 下拉刷新');
    setTimeout(() => {
      setInspections(inspectionService.getInspections());
      setLoading(false);
      Taro.stopPullDownRefresh();
    }, 1000);
  };

  const handleStartInspection = (storeId: string, storeName: string) => {
    console.log('[HomePage] 开始巡检:', storeId, storeName);
    Taro.navigateTo({
      url: `/pages/store-detail/index?storeId=${storeId}`,
    });
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'pending':
        return styles.statusPending;
      case 'in_progress':
        return styles.statusInProgress;
      case 'completed':
        return styles.statusCompleted;
      default:
        return styles.statusPending;
    }
  };

  return (
    <ScrollView
      scrollY
      className={styles.container}
      refresherEnabled
      refresherTriggered={loading}
      onRefresherRefresh={onRefresh}
    >
      <View className={styles.headerCard}>
        <Text className={styles.greeting}>你好，{MOCK_INSPECTOR.name}</Text>
        <Text className={styles.dateText}>{formatDate(new Date().toISOString(), 'YYYY年MM月DD日')}</Text>
        <View className={styles.statsRow}>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{todayInspections.length}</Text>
            <Text className={styles.statLabel}>今日待巡</Text>
          </View>
          <View className={styles.divider} />
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{inProgressCount}</Text>
            <Text className={styles.statLabel}>进行中</Text>
          </View>
          <View className={styles.divider} />
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{completedCount}</Text>
            <Text className={styles.statLabel}>已完成</Text>
          </View>
        </View>
      </View>

      <View className={styles.sectionHeader}>
        <Text className={styles.sectionTitle}>今日待巡门店</Text>
        <Text className={styles.sectionCount}>共 {todayInspections.length} 家</Text>
      </View>

      {todayInspections.length > 0 ? (
        <View className={styles.storeList}>
          {todayInspections.map((inspection) => (
            <View key={inspection.id} className={styles.storeCard}>
              <View className={styles.storeHeader}>
                <Text className={styles.storeName}>{inspection.storeName}</Text>
                <Text className={classnames(styles.statusBadge, getStatusClass(inspection.status))}>
                  {STATUS_LABELS[inspection.status]}
                </Text>
              </View>
              <Text className={styles.storeAddress}>{inspection.storeAddress}</Text>
              <View className={styles.storeFooter}>
                {inspection.status === 'completed' ? (
                  <View className={styles.scoreInfo}>
                    <Text className={styles.scoreValue}>{inspection.totalScore}</Text>
                    <Text className={styles.scoreLabel}>分</Text>
                  </View>
                ) : (
                  <Text className={styles.inspectorInfo}>
                    巡检员：{inspection.inspectorName}
                  </Text>
                )}
                {inspection.status !== 'completed' && (
                  <View
                    className={styles.actionBtn}
                    onClick={() => handleStartInspection(inspection.storeId, inspection.storeName)}
                  >
                    <Text>开始巡检</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View className={styles.emptyState}>
          <Text className={styles.emptyIcon}>🎉</Text>
          <Text className={styles.emptyText}>今日暂无巡检任务</Text>
        </View>
      )}
    </ScrollView>
  );
}
