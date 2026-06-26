import { useState, useEffect } from 'react';
import { SCORE_LEVEL_LABELS, getScoreLevel, inspectionService } from '@inspection/shared';
import styles from './StoreRanking.module.css';

export default function StoreRanking() {
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const unsubscribe = inspectionService.subscribe((type) => {
      if (type === 'store') {
        setRefreshKey((k) => k + 1);
      }
    });
    return unsubscribe;
  }, []);

  const rankings = inspectionService.getStoreRankings();
  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank.toString();
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return '↑';
    if (trend === 'down') return '↓';
    return '→';
  };

  const getTrendColor = (trend: string) => {
    if (trend === 'up') return '#00b42a';
    if (trend === 'down') return '#f53f3f';
    return '#86909c';
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>门店得分排名</h2>
          <div className={styles.legend}>
            <span className={styles.legendItem}>
              <span style={{ color: '#00b42a' }}>↑</span> 上升
            </span>
            <span className={styles.legendItem}>
              <span style={{ color: '#f53f3f' }}>↓</span> 下降
            </span>
            <span className={styles.legendItem}>
              <span style={{ color: '#86909c' }}>→</span> 持平
            </span>
          </div>
        </div>
        <div className={styles.rankingList}>
          {rankings.map((store) => {
            const scoreLevel = getScoreLevel(store.averageScore, 100);
            return (
              <div key={store.storeId} className={styles.rankingItem}>
                <div className={styles.rank}>
                  <span className={store.rank <= 3 ? styles.topRank : ''}>
                    {getRankIcon(store.rank)}
                  </span>
                </div>
                <div className={styles.storeInfo}>
                  <div className={styles.storeName}>{store.storeName}</div>
                  <div className={styles.storeMeta}>
                    <span className={styles.areaTag}>{store.area}</span>
                    <span className={styles.inspectionCount}>
                      巡检 {store.inspectionCount} 次
                    </span>
                  </div>
                </div>
                <div className={styles.scoreSection}>
                  <div className={styles.scoreValue}>{store.averageScore}</div>
                  <div
                    className={styles.scoreLevel}
                    style={{
                      backgroundColor:
                        scoreLevel === 'excellent'
                          ? '#e6ff7a15'
                          : scoreLevel === 'good'
                          ? '#165dff15'
                          : scoreLevel === 'average'
                          ? '#ff7d0015'
                          : '#f53f3f15',
                      color:
                        scoreLevel === 'excellent'
                          ? '#e6ff7a'
                          : scoreLevel === 'good'
                          ? '#165dff'
                          : scoreLevel === 'average'
                          ? '#ff7d00'
                          : '#f53f3f',
                    }}
                  >
                    {SCORE_LEVEL_LABELS[scoreLevel]}
                  </div>
                </div>
                <div
                  className={styles.trend}
                  style={{ color: getTrendColor(store.trend) }}
                >
                  {getTrendIcon(store.trend)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
