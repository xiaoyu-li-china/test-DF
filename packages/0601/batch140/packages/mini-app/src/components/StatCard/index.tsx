import React from 'react';
import { View, Text } from '@tarojs/components';
import classNames from 'classnames';
import styles from './index.module.scss';

interface StatCardProps {
  value: string | number;
  label: string;
  type?: 'primary' | 'success' | 'warning' | 'error';
  isMoney?: boolean;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
  value,
  label,
  type = 'primary',
  isMoney = false,
  onClick
}) => {
  return (
    <View
      className={classNames(
        styles.statCard,
        styles[type],
        isMoney && styles.money
      )}
      onClick={onClick}
    >
      <Text className={styles.value}>{value}</Text>
      <Text className={styles.label}>{label}</Text>
    </View>
  );
};

export default StatCard;
