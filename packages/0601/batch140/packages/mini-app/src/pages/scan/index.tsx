import React, { useEffect, useState } from 'react';
import { View, Text, Input, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import dayjs from 'dayjs';
import classNames from 'classnames';
import { useAppStore } from '../../store';
import type { ScanResult } from '../../types/shared';
import styles from './index.module.scss';

const ScanPage: React.FC = () => {
  const { scanResults, scanPickupCode } = useAppStore();

  const [code, setCode] = useState('');
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);

  const handleScan = () => {
    Taro.scanCode({
      scanType: ['qrCode', 'barCode'],
      success: (res) => {
        const result = scanPickupCode(res.result);
        setLastResult(result);
        if (result.success) {
          Taro.vibrateShort();
          Taro.showToast({ title: '核销成功', icon: 'success' });
        } else {
          Taro.showToast({ title: result.message, icon: 'none' });
        }
      },
      fail: () => {
        Taro.showToast({ title: '扫码失败', icon: 'none' });
      }
    });
  };

  const handleVerify = () => {
    if (!code || code.length !== 6) {
      Taro.showToast({ title: '请输入6位提货码', icon: 'none' });
      return;
    }

    const result = scanPickupCode(code);
    setLastResult(result);
    setCode('');

    if (result.success) {
      Taro.vibrateShort();
      Taro.showToast({ title: '核销成功', icon: 'success' });
    } else {
      Taro.showToast({ title: result.message, icon: 'none' });
    }
  };

  const recentResults = scanResults.slice(0, 10);

  return (
    <View className={styles.scanPage}>
      <View className={styles.scanArea} onClick={handleScan}>
        <View className={styles.scanFrame}>
          <View className={styles.scanLine} />
        </View>
        <Text className={styles.scanTips}>点击扫码，对准订单二维码</Text>
      </View>

      <View className={styles.inputArea}>
        <View className={styles.manualInput}>
          <Text className={styles.inputTitle}>手动输入提货码</Text>
          <View className={styles.inputRow}>
            <Input
              className={styles.codeInput}
              type="number"
              maxlength={6}
              placeholder="输入6位提货码"
              value={code}
              onInput={(e) => setCode(e.detail.value)}
            />
            <Button
              className={styles.scanBtn}
              onClick={handleVerify}
            >
              确认
            </Button>
          </View>
        </View>
      </View>

      {lastResult && (
        <View className={styles.resultArea}>
          <View
            className={classNames(
              styles.resultCard,
              lastResult.success ? styles.success : styles.error
            )}
          >
            <Text className={styles.resultIcon}>
              {lastResult.success ? '✅' : '❌'}
            </Text>
            <Text className={styles.resultTitle}>
              {lastResult.message}
            </Text>
            {lastResult.orderNo && (
              <Text className={styles.resultInfo}>
                订单号：{lastResult.orderNo}
              </Text>
            )}
            {lastResult.buyerName && (
              <Text className={styles.resultInfo}>
                买家：{lastResult.buyerName}
              </Text>
            )}
            <Text className={styles.resultInfo}>
              时间：{dayjs(lastResult.timestamp).format('HH:mm:ss')}
            </Text>
          </View>
        </View>
      )}

      <View className={styles.historySection}>
        <Text className={styles.historyTitle}>核销记录</Text>
        <View className={styles.historyList}>
          {recentResults.length > 0 ? (
            recentResults.map((result, index) => (
              <View key={index} className={styles.historyItem}>
                <View
                  className={classNames(
                    styles.historyIcon,
                    result.success ? styles.success : styles.error
                  )}
                >
                  {result.success ? '✅' : '❌'}
                </View>
                <View className={styles.historyInfo}>
                  <Text className={styles.historyCode}>
                    提货码：{result.pickupCode}
                  </Text>
                  <Text className={styles.historyTime}>
                    {dayjs(result.timestamp).format('MM-DD HH:mm')}
                  </Text>
                </View>
                <Text
                  className={classNames(
                    styles.historyStatus,
                    result.success ? styles.success : styles.error
                  )}
                >
                  {result.success ? '成功' : '失败'}
                </Text>
              </View>
            ))
          ) : (
            <View style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
              暂无核销记录
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export default ScanPage;
