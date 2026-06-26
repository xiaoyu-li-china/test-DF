import React from 'react';
import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';

export default function RecordsPage() {
  return (
    <View className={styles.container}>
      <View className={styles.placeholder}>
        <Text className={styles.icon}>📋</Text>
        <Text className={styles.title}>巡检记录</Text>
        <Text className={styles.desc}>功能正在开发中...</Text>
      </View>
    </View>
  );
}
