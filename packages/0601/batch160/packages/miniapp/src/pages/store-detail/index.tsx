import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, Button, ScrollView, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import {
  inspectionService,
  INSPECTION_CATEGORIES,
  InspectionScore,
  formatDate,
} from '@inspection/shared';
import styles from './index.module.scss';

export default function StoreDetailPage() {
  const [storeId, setStoreId] = useState('');
  const [inspectionId, setInspectionId] = useState('');
  const [currentScore, setCurrentScore] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const params = Taro.getCurrentInstance()?.router?.params || {};
    const sid = params.storeId as string || '';
    setStoreId(sid);
    console.log('[StoreDetailPage] 门店ID:', sid);

    const today = formatDate(new Date().toISOString());
    const storeInspections = inspectionService.getInspectionsByStoreAndDate(sid, today);

    if (storeInspections.length > 0) {
      setInspectionId(storeInspections[0].id);
      const existingScores: Record<string, number> = {};
      storeInspections[0].scores?.forEach((s) => {
        existingScores[s.itemId] = s.score;
      });
      setScores(existingScores);
    }

    const checkResult = inspectionService.canSubmitInspection(sid, today);
    if (!checkResult.allowed) {
      console.log('[StoreDetailPage] 巡检限制:', checkResult.reason);
    }
  }, []);

  const maxTotalScore = useMemo(() => {
    return INSPECTION_CATEGORIES.reduce((total, cat) => {
      return total + cat.items.reduce((sum, item) => sum + item.maxScore, 0);
    }, 0);
  }, []);

  const totalScore = useMemo(() => {
    return Object.values(scores).reduce((sum, s) => sum + s, 0);
  }, [scores]);

  const handleScoreChange = (itemId: string, maxScore: number, delta: number) => {
    setScores((prev) => {
      const current = prev[itemId] || 0;
      const newScore = Math.max(0, Math.min(maxScore, current + delta));
      return { ...prev, [itemId]: newScore };
    });
  };

  const handleSubmit = async () => {
    const today = formatDate(new Date().toISOString());
    const checkResult = inspectionService.canSubmitInspection(storeId, today);

    if (!checkResult.allowed) {
      Taro.showModal({
        title: '提示',
        content: `${checkResult.reason}\n\n是否重新提交？（将创建新版本记录）`,
        confirmText: '重新提交',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            doSubmit();
          }
        },
      });
      return;
    }

    doSubmit();
  };

  const doSubmit = () => {
    setSubmitting(true);

    const scoreData: InspectionScore[] = Object.entries(scores).map(([itemId, score]) => ({
      itemId,
      score,
      remark: remarks[itemId] || '',
      photos: [],
    }));

    const result = inspectionService.submitInspection({
      inspectionId,
      scores: scoreData,
      photos: [],
      totalScore,
      remark: '',
    });

    setSubmitting(false);

    if (result.success) {
      console.log('[StoreDetailPage] 提交成功，审计记录:', result.auditRecord);
      Taro.showToast({
        title: `提交成功 (版本${result.auditRecord?.version})`,
        icon: 'success',
        duration: 2000,
      });
      setTimeout(() => {
        Taro.navigateBack();
      }, 1500);
    } else {
      Taro.showToast({
        title: result.message,
        icon: 'none',
      });
    }
  };

  const auditRecords = storeId
    ? inspectionService.getAuditRecordsByStore(storeId)
    : [];

  return (
    <ScrollView scrollY className={styles.container}>
      <View className={styles.header}>
        <Text className={styles.storeName}>门店巡检打分</Text>
        <View className={styles.scoreSummary}>
          <Text className={styles.scoreValue}>{totalScore}</Text>
          <Text className={styles.scoreMax}>/{maxTotalScore}</Text>
        </View>
      </View>

      {auditRecords.length > 0 && (
        <View className={styles.auditSection}>
          <Text className={styles.sectionTitle}>📋 历史提交记录</Text>
          {auditRecords.slice(0, 3).map((record) => (
            <View key={record.id} className={styles.auditItem}>
              <View className={styles.auditHeader}>
                <Text className={styles.auditVersion}>版本 {record.version}</Text>
                <Text className={styles.auditAction}>
                  {record.action === 'submit' ? '首次提交' : '重新提交'}
                </Text>
              </View>
              <View className={styles.auditDetail}>
                <Text className={styles.auditScore}>
                  得分: {record.beforeScore || 0} → {record.afterScore}
                </Text>
                <Text className={styles.auditTime}>
                  {formatDate(record.timestamp, 'MM-DD HH:mm')}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {INSPECTION_CATEGORIES.map((category) => (
        <View key={category.id} className={styles.categorySection}>
          <Text className={styles.categoryTitle}>{category.name}</Text>
          {category.items.map((item) => (
            <View key={item.id} className={styles.scoreItem}>
              <View className={styles.itemHeader}>
                <Text className={styles.itemName}>
                  {item.name}
                  {item.required && <Text className={styles.required}>*</Text>}
                </Text>
                {item.needPhoto && <Text className={styles.photoTag}>📷 需拍照</Text>}
              </View>
              <Text className={styles.itemDesc}>{item.description}</Text>
              <View className={styles.scoreControl}>
                <Button
                  className={styles.scoreBtn}
                  onClick={() => handleScoreChange(item.id, item.maxScore, -1)}
                >
                  -
                </Button>
                <Text className={styles.scoreDisplay}>
                  {scores[item.id] || 0}/{item.maxScore}
                </Text>
                <Button
                  className={styles.scoreBtn}
                  onClick={() => handleScoreChange(item.id, item.maxScore, 1)}
                >
                  +
                </Button>
              </View>
            </View>
          ))}
        </View>
      ))}

      <View className={styles.footer}>
        <Button
          className={styles.submitBtn}
          loading={submitting}
          onClick={handleSubmit}
        >
          提交巡检结果
        </Button>
      </View>
    </ScrollView>
  );
}
