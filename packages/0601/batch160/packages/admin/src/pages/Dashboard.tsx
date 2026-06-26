import { useState, useEffect } from 'react';
import { formatDate, STATUS_LABELS, STATUS_COLORS, inspectionService } from '@inspection/shared';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const unsubscribe = inspectionService.subscribe(() => {
      setRefreshKey((k) => k + 1);
    });
    return unsubscribe;
  }, []);

  const today = formatDate(new Date().toISOString());
  const allInspections = inspectionService.getInspections();
  const allStores = inspectionService.getStores();
  const todayInspections = allInspections.filter((i) => i.scheduledDate === today);
  const completedCount = todayInspections.filter((i) => i.status === 'completed').length;
  const pendingCount = todayInspections.filter((i) => i.status === 'pending').length;
  const inProgressCount = todayInspections.filter((i) => i.status === 'in_progress').length;

  return (
    <div className={styles.container}>
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📋</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{todayInspections.length}</div>
            <div className={styles.statLabel}>今日待巡</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statSuccess}`}>
          <div className={styles.statIcon}>✅</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{completedCount}</div>
            <div className={styles.statLabel}>已完成</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statWarning}`}>
          <div className={styles.statIcon}>⏳</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{inProgressCount}</div>
            <div className={styles.statLabel}>进行中</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statInfo}`}>
          <div className={styles.statIcon}>🏪</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{allStores.length}</div>
            <div className={styles.statLabel}>门店总数</div>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>今日巡检进度</h2>
        <div className={styles.card}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${(completedCount / todayInspections.length) * 100}%` }}
            />
          </div>
          <div className={styles.progressText}>
            完成进度：{completedCount} / {todayInspections.length} 家门店
            <span className={styles.progressPercent}>
              ({Math.round((completedCount / todayInspections.length) * 100)}%)
            </span>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>今日巡检列表</h2>
        <div className={styles.card}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>门店名称</th>
                <th>门店地址</th>
                <th>巡检状态</th>
                <th>得分</th>
              </tr>
            </thead>
            <tbody>
              {todayInspections.map((inspection) => (
                <tr key={inspection.id}>
                  <td className={styles.storeName}>{inspection.storeName}</td>
                  <td className={styles.storeAddress}>{inspection.storeAddress}</td>
                  <td>
                    <span
                      className={styles.statusBadge}
                      style={{
                        backgroundColor: `${STATUS_COLORS[inspection.status]}15`,
                        color: STATUS_COLORS[inspection.status],
                      }}
                    >
                      {STATUS_LABELS[inspection.status]}
                    </span>
                  </td>
                  <td className={styles.score}>
                    {inspection.status === 'completed'
                      ? `${inspection.totalScore}分`
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
