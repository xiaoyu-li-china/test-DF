# 陪诊订单撮合平台 - 数据管道说明

## 一、订单状态到漏斗各层的映射关系

### 1.1 漏斗分层定义

运营看板的转化漏斗分为三层，直接映射订单生命周期的关键节点：

```
┌─────────────────────────────────────────────────────────┐
│                    需求发布 (100%)                       │
│  订单创建即进入，publish_date 有值，order_status ∈ [CREATED]│
└────────────────────────────┬────────────────────────────┘
                             │
                  ───────────┴───────────
                  流失：超时未接单 (15%)
                  ───────────────────────
                             │
┌────────────────────────────▼────────────────────────────┐
│                   陪诊员接单 (~85%)                      │
│  accepted=1，accepted_date 有值，order_status ∈ [ACCEPTED]│
└────────────────────────────┬────────────────────────────┘
                             │
                  ───────────┴───────────
                  流失：用户取消/服务失败 (10%)
                  ───────────────────────
                             │
┌────────────────────────────▼────────────────────────────┐
│                    服务完成 (~76.5%)                     │
│  completed=1，completed_date 有值，order_status ∈ [DONE]  │
└─────────────────────────────────────────────────────────┘
```

### 1.2 字段映射规则

| 漏斗阶段 | 订单状态枚举 | 判定条件 | 统计口径 |
|---------|-------------|---------|---------|
| 需求发布 | `CREATED` | `publish_date IS NOT NULL` | `COUNT(order_id)` |
| 陪诊员接单 | `ACCEPTED`, `IN_PROGRESS`, `DONE` | `accepted = 1 AND accepted_date IS NOT NULL` | `SUM(accepted)` |
| 服务完成 | `DONE` | `completed = 1 AND completed_date IS NOT NULL` | `SUM(completed)` |

### 1.3 转化率计算公式

- **接单率** = `陪诊员接单 / 需求发布 × 100%`
  - 目标值：≥ 85%
  
- **完成率** = `服务完成 / 陪诊员接单 × 100%`
  - 目标值：≥ 90%
  
- **总体转化率** = `服务完成 / 需求发布 × 100%`
  - 目标值：≥ 76.5%

---

## 二、地图热力数据聚合逻辑

### 2.1 数据来源

地图热力**基于医院 POI 位置聚合**，而非实际用户下单的 GPS 位置。

### 2.2 聚合逻辑

```
订单数据 (df)
     │
     ├─ 按 hospital_id 关联医院维度表 (hospitals_df)
     │   └─ 获取医院经纬度 (lat, lon)、城市、等级等属性
     │
     ├─ GROUP BY [hospital_id, hospital_name, city, lat, lon]
     │   ├─ COUNT(order_id) → total_orders  (热力大小)
     │   ├─ SUM(accepted)  → accepted_orders
     │   ├─ SUM(completed) → completed_orders
     │   └─ SUM(price)     → total_amount
     │
     └─ 计算派生指标
         ├─ accept_rate = accepted_orders / total_orders × 100%
         ├─ complete_rate = completed_orders / accepted_orders × 100%
         └─ avg_price = total_amount / total_orders
```

### 2.3 热力渲染规则

| 视觉元素 | 映射字段 | 取值范围 |
|---------|---------|---------|
| 散点位置 | `lat`, `lon` | 医院 POI 坐标 |
| 散点大小 | `total_orders` | `max(15, orders / max_orders × 60)` |
| 散点颜色 | `total_orders` | 红色渐变（Reds 色板） |
| 悬浮提示 | 全部指标 | 医院名、城市、订单量、接单率、完成率、客单价 |

### 2.4 500m 网格下钻逻辑

当用户点击单医院时，切换到网格视图：

1. 以医院坐标为中心，生成 11×11 的 500m 网格（覆盖 5.5km × 5.5km 范围）
2. 每个订单按经纬度分配到所属网格
3. 统计每个网格的订单密度
4. 使用 `DensityMapbox` 渲染热力网格
5. 支持一键返回全局视图

---

## 三、Kafka 实时流接入方案

### 3.1 主题定义

| Topic 名称 | 消息格式 | 生产方 | 消费方 | 保留时长 |
|-----------|---------|-------|-------|---------|
| `order_created` | Avro | 订单服务 | 看板 Flink Job | 7 天 |
| `order_accepted` | Avro | 撮合服务 | 看板 Flink Job | 7 天 |
| `order_completed` | Avro | 服务履约系统 | 看板 Flink Job | 7 天 |
| `order_cancelled` | Avro | 订单服务 | 看板 Flink Job | 7 天 |

### 3.2 实时计算拓扑

```
                    ┌──────────────────┐
                    │  Kafka Source    │
                    │  (4 个 Topic)    │
                    └─────────┬────────┘
                              │
                    ┌─────────▼────────┐
                    │  水印/迟到处理   │
                    │  (5min 乱序容忍) │
                    └─────────┬────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
┌────────▼───────┐  ┌─────────▼────────┐  ┌──────▼─────────┐
│  漏斗聚合      │  │  SLA 达标计算    │  │  医院热力聚合  │
│  (15min 窗口)  │  │  (每日滚动)      │  │  (1h 窗口)     │
└────────┬───────┘  └─────────┬────────┘  └──────┬─────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                    ┌─────────▼────────┐
                    │  Redis Sink       │
                    │  (KV + Hash)      │
                    └─────────┬────────┘
                              │
                    ┌─────────▼────────┐
                    │  Dash 看板        │
                    │  (轮询 + WebSocket)│
                    └──────────────────┘
```

### 3.3 状态存储设计

**Redis Key 设计：**

```
# 漏斗实时计数 (Hash)
funnel:counter:{date}
  ├─ published → 5000
  ├─ accepted  → 4250
  └─ completed → 3825

# SLA 每日达标率 (String)
sla:rate:{date} → 89.5

# 医院热力数据 (Hash)
heatmap:hospital:{hospital_id}:{date}
  ├─ total_orders     → 128
  ├─ accepted_orders  → 115
  ├─ completed_orders → 108
  └─ total_amount     → 38400

# 500m 网格数据 (Sorted Set)
grid:density:{hospital_id}:{date}
  └─ member = "{grid_lat},{grid_lon}", score = order_count
```

### 3.4 与当前离线批处理的切换

当前实现使用 `data_generator.py` 生成的静态数据，接入 Kafka 后：

1. **双写阶段**：保留批处理作为 fallback，实时流优先
2. **切换条件**：实时流延迟 < 2s，数据准确率 > 99.9% 持续 72 小时
3. **数据一致性校验**：每小时对比流处理和批处理的漏斗计数，偏差 > 0.5% 告警

---

## 四、SLA 计算规则

### 4.1 判定标准

- **SLA 达标**：`accepted_date - publish_date <= 15 分钟`
- **SLA 未达标**：`accepted_date - publish_date > 15 分钟`
- **边界值**：恰好 15 分钟算达标

### 4.2 统计口径

- 每日计算当日所有已接单订单的达标率
- 折线图展示最近 30 天的趋势
- 红色虚线标注目标值（95%）
