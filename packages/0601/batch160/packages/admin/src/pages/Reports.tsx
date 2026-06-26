import { useState, useEffect } from 'react';
import { inspectionService } from '@inspection/shared';
import styles from './Reports.module.css';

export default function Reports() {
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const unsubscribe = inspectionService.subscribe(() => {
      setRefreshKey((k) => k + 1);
    });
    return unsubscribe;
  }, []);

  const report = inspectionService.getMonthlyReport(selectedMonth);

  const handleExportCSV = () => {
    console.log('[Reports] 导出CSV报告:', selectedMonth);
    inspectionService.downloadReport(selectedMonth, 'csv');
    alert(`已导出 ${selectedMonth} 月度巡检报告 CSV（UTF-8 编码，Excel 可正常打开）`);
  };

  const handleExportPDF = () => {
    alert(`正在导出 ${selectedMonth} 月度巡检报告 PDF...\n\n（PDF 导出将调用后端服务生成，CSV 已支持中文编码）`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>月度巡检报告</h2>
          <div className={styles.headerActions}>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className={styles.monthInput}
            />
            <button className={styles.exportButtonSecondary} onClick={handleExportCSV}>
              📊 导出 CSV
            </button>
            <button className={styles.exportButton} onClick={handleExportPDF}>
              📄 导出 PDF
            </button>
          </div>
        </div>

        <div className={styles.summarySection}>
          <h3 className={styles.sectionTitle}>数据概览</h3>
          <div className={styles.statsGrid}>
            <div className={styles.statBox}>
              <div className={styles.statNumber}>{report.totalInspections}</div>
              <div className={styles.statLabel}>巡检总数</div>
            </div>
            <div className={styles.statBox}>
              <div className={styles.statNumber}>{report.completedInspections}</div>
              <div className={styles.statLabel}>完成数</div>
            </div>
            <div className={styles.statBox}>
              <div className={styles.statNumber}>{report.averageScore}</div>
              <div className={styles.statLabel}>平均分</div>
            </div>
            <div className={styles.statBox}>
              <div className={styles.statNumber}>{report.passRate}%</div>
              <div className={styles.statLabel}>通过率</div>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>各区域统计</h3>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>区域</th>
                <th>门店数</th>
                <th>巡检次数</th>
                <th>平均分</th>
                <th>通过率</th>
              </tr>
            </thead>
            <tbody>
              {report.areaStatistics.map((area) => (
                <tr key={area.area}>
                  <td className={styles.areaName}>{area.area}</td>
                  <td>{area.storeCount}</td>
                  <td>{area.inspectionCount}</td>
                  <td className={styles.score}>{area.averageScore}</td>
                  <td>
                    <div className={styles.passRateBar}>
                      <div
                        className={styles.passRateFill}
                        style={{ width: `${area.passRate}%` }}
                      />
                      <span className={styles.passRateText}>{area.passRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>门店排名 TOP 5</h3>
          <div className={styles.topList}>
            {report.storeRankings.slice(0, 5).map((store, index) => (
              <div key={store.storeId} className={styles.topItem}>
                <span className={styles.topRank}>{index + 1}</span>
                <span className={styles.topStoreName}>{store.storeName}</span>
                <span className={styles.topScore}>{store.averageScore}分</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
