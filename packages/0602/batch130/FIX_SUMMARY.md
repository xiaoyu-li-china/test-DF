# 充电桩预约系统问题修复说明

## 问题概述

### 问题1：同一桩同一时段两个用户都预约成功
**根本原因**：缺少并发控制机制，多个请求同时通过可用性检查后都能写入数据库。

### 问题2：取消预约后押金24小时还没退回
**根本原因**：缺少退款重试机制，单次调用支付网关失败后无后续处理。

---

## 修复方案

### 一、并发预约问题修复（三重防护）

#### 1. 数据库层 - 唯一索引
**文件**：[schema.sql](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0602/batch130/src/db/schema.sql#L36-L38)

```sql
CREATE UNIQUE INDEX idx_active_reservation_slot 
ON reservations (station_id, slot_start, slot_end) 
WHERE status IN ('pending_payment', 'confirmed', 'charging');
```

**作用**：数据库层面兜底，确保同一桩同一时段只有一个有效预约。

#### 2. 应用层 - 分布式锁
**文件**：[lockService.js](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0602/batch130/src/services/lockService.js#L46-L68)

```javascript
// Redis 分布式锁，SET NX PX
const lock = await lockService.acquireLock(stationId, slotStart, 15000);
if (!lock) throw new ReservationError('LOCK_FAILED', '系统繁忙');
```

**作用**：防止并发请求同时进入数据库检查。

#### 3. 异常捕获 - 友好提示
**文件**：[reservationService.js](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0602/batch130/src/services/reservationService.js#L164-L172)

```javascript
catch (dbErr) {
  if (dbErr.code === '23505' && dbErr.constraint_name === 'idx_active_reservation_slot') {
    throw new ReservationError('SLOT_OCCUPIED', '该时段已被其他业主预约');
  }
  throw dbErr;
}
```

**作用**：捕获唯一索引冲突，转换为用户友好的错误信息。

---

### 二、押金退款问题修复（四层保障）

#### 1. 异步队列处理
**文件**：[refundService.js](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0602/batch130/src/services/refundService.js#L24-L47)

```javascript
// Bull 队列异步处理退款
refundQueue.process(async (job) => {
  const { refundId } = job.data;
  return processRefund(refundId);
});
```

**作用**：取消预约后立即响应，退款异步处理不阻塞。

#### 2. 指数退避重试
**文件**：[refundService.js](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0602/batch130/src/services/refundService.js#L91-L96)

```javascript
// 重试间隔：1min → 2min → 4min → 8min → 16min
function calculateNextRetry(retryCount) {
  const baseDelay = 60 * 1000;
  const delay = baseDelay * Math.pow(2, retryCount);
  return Math.min(delay, 4 * 60 * 60 * 1000); // 最大4小时
}
```

**作用**：网络波动时自动重试，共5次，最长31分钟内完成。

#### 3. 定时重试调度器
**文件**：[refundService.js](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0602/batch130/src/services/refundService.js#L235-L253)

```javascript
// 每5分钟扫描一次失败的退款
function startRetryScheduler(intervalMs = 5 * 60 * 1000) {
  setInterval(async () => {
    await retryFailedRefunds();
  }, intervalMs);
}
```

**作用**：防止队列任务丢失，定时巡检兜底。

#### 4. 死信队列人工处理
**文件**：[refundService.js](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0602/batch130/src/services/refundService.js#L263-L291)

```sql
-- 管理后台死信队列查询接口
GET /api/v1/admin/refunds/dead-letter
POST /api/v1/admin/refunds/:refundId/manual-success
```

**作用**：超过5次重试失败后进入死信队列，管理员可人工处理。

---

## 退款状态机

```
pending → processing → success
            ↓
          failed (重试5次) → dead_letter → 人工处理
```

---

## 数据库核心变更

### 新增 refunds 表
```sql
CREATE TABLE refunds (
    id VARCHAR(30) PRIMARY KEY,
    reservation_id VARCHAR(30),
    user_id VARCHAR(30) NOT NULL,
    amount INT NOT NULL,
    reason VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    retry_count INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 5,
    last_attempt_at TIMESTAMP,
    next_retry_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 新增唯一索引
```sql
CREATE UNIQUE INDEX idx_active_reservation_slot 
ON reservations (station_id, slot_start, slot_end) 
WHERE status IN ('pending_payment', 'confirmed', 'charging');
```

---

## 测试验证

### 并发预约测试
**文件**：[concurrentReservation.test.js](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0602/batch130/tests/concurrentReservation.test.js)

```bash
npm test -- tests/concurrentReservation.test.js
```

测试用例：
- 2用户并发预约 → 1成功1失败
- 5用户并发预约 → 1成功4失败
- 同一用户重复预约 → 失败
- 离线桩预约 → 失败
- 过去时段预约 → 失败

### 退款流程测试
**文件**：[refundProcess.test.js](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0602/batch130/tests/refundProcess.test.js)

```bash
npm test -- tests/refundProcess.test.js
```

测试用例：
- 取消预约自动创建退款记录
- 2小时内取消只退50%
- 退款成功用户余额增加
- 退款失败进入重试队列
- 超过重试次数进入死信队列
- 人工处理死信退款成功

---

## 部署说明

### 环境变量
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=charging_station
DB_USER=postgres
DB_PASSWORD=postgres
REDIS_HOST=localhost
REDIS_PORT=6379
ADMIN_TOKEN=your_admin_token
ENABLE_REFUND_SCHEDULER=true
REFUND_SUCCESS_RATE=0.9
```

### 启动服务
```bash
npm install
npm run db:migrate
npm start
```

### API 端点
```
GET    /api/v1/stations                    # 充电桩列表
GET    /api/v1/stations/:id/slots          # 时段查询
POST   /api/v1/reservations                # 创建预约
DELETE /api/v1/reservations/:id            # 取消预约（自动退款）
GET    /api/v1/reservations/:id/refund     # 退款状态查询
GET    /api/v1/admin/refunds/dead-letter   # 死信队列（管理后台）
POST   /api/v1/admin/refunds/retry-all     # 批量重试（管理后台）
```
