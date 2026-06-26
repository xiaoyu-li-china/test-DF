# Debug Session: funnel-count-mismatch + city-keyerror

**Session ID:** `funnel-city-bug`
**Status:** [OPEN]
**Created:** 2026-06-02
**Bug Owner:** Assistant

---

## 🐛 Bug Description

### Bug 1: 漏斗总数计算偏差
- **Symptom:** 看板漏斗总数和 SQL 对不上，差大概 8%
- **Expected:** 漏斗总数应与 SQL 查询结果一致
- **Actual:** 存在约 8% 的偏差

### Bug 2: 「上周」筛选导致地图空白
- **Symptom:** 选「上周」时地图空白，控制台报 `KeyError: city`
- **Expected:** 即使无数据也应友好显示，不应报错
- **Actual:** 页面空白，控制台 KeyError

---

## 🔍 Hypotheses (可证伪假设)

### Hypothesis H1: 日期过滤逻辑包含边界问题
- **Mechanism:** `filter_data` 函数中使用 `>= start_date` 和 `<= end_date`，但 `publish_date` 是 datetime 类型，可能存在时分秒截断问题导致部分日期数据被错误排除/包含，造成约 8% 偏差。
- **Falsification:** 查看 `filter_data` 前后的 `len(df)`，比较按日期字符串过滤 vs 按 datetime 过滤的差异。
- **Observation Point:** `filter_data` 函数入口和出口

### Hypothesis H2: 热力图聚合时 groupby 丢失城市维度
- **Mechanism:** `get_hospital_heatmap_data` 中 `df.groupby(["hospital_id", ...])` 但当筛选后无数据时，返回的 DataFrame 可能缺少 `city` 列，导致后续访问 `heatmap_df["city"]` 时报 KeyError。
- **Falsification:** 查看空数据时 `heatmap_df` 的列名和内容。
- **Observation Point:** `get_hospital_heatmap_data` 返回值、空数据分支

### Hypothesis H3: 漏斗计算时使用了不同的过滤条件
- **Mechanism:** `get_funnel_data` 直接使用传入的 df 计算，但 KPI 计算和漏斗计算可能存在重复计数或排除条件不一致（例如 completed 计算逻辑）。
- **Falsification:** 对比 KPI 计算的 `total_published/accepted/completed` 与 `get_funnel_data` 返回值。
- **Observation Point:** `update_dashboard` 中 KPI 计算与漏斗计算对比

### Hypothesis H4: 城市筛选时热力图数据未正确过滤
- **Mechanism:** `get_hospital_heatmap_data` 接收的 df 已经过城市过滤，但 hospitals_df 是全量的，merge 时可能产生笛卡尔积或空值，导致 city 列异常。
- **Falsification:** 查看城市筛选前后 `heatmap_df` 的 city 列值分布。
- **Observation Point:** `get_hospital_heatmap_data` 内部 merge 操作

### Hypothesis H5: 「上周」筛选时数据为空，空数据分支逻辑不完整
- **Mechanism:** 当选「上周」数据为空时，`heatmap_df` 为空 DataFrame，但后续代码仍尝试访问 `heatmap_df["city"]` 进行地图定位，触发 KeyError。
- **Falsification:** 复现「上周」场景，查看 `heatmap_df` 是否为空以及列结构。
- **Observation Point:** 空数据分支（line 247-253）

---

## 📊 Evidence Log

| Timestamp | Event | Data |
|-----------|-------|------|
| TBD | Instrumentation added | - |
| TBD | Bug 1 reproduced | - |
| TBD | Bug 2 reproduced | - |
| TBD | Root cause identified | - |
| TBD | Fix applied | - |
| TBD | Fix verified | - |

---

## 🔧 Changes Made

| Date | Change |
|------|--------|
| TBD | Added instrumentation logs |
| TBD | Applied fix |

---

## ✅ Verification Checklist

- [ ] Bug 1 (漏斗偏差) 已复现并定位根因
- [ ] Bug 2 (KeyError) 已复现并定位根因
- [ ] 修复已应用
- [ ] Pre-fix vs Post-fix 日志对比确认修复
- [ ] 无回归问题

---

## 💡 Root Cause (待确认)

_将在分析日志后填写_

---

## 📝 Notes

- SQL 数据以什么粒度统计？是否按天聚合？
- 「上周」的具体日期范围是？
