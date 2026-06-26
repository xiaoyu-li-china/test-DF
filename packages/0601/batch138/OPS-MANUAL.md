# 羽毛球馆订场系统 - 运维手册

## 1. 订场占坑 15 分钟 TTL 实现（Redis 方案）

### 1.1 问题背景

用户下单到完成支付存在时间差（约 15 分钟），需要：
- 在此期间锁定场地，防止超卖
- 超时未支付自动释放，场地回归库存
- 与 Postgres 数据最终一致

### 1.2 Redis Key 设计

```
Prefix: booking:hold:

Key Pattern:
  booking:hold:{court_id}:{date}:{start_hour}

Value (JSON):
  {
    "booking_id": 1024,
    "member_phone": "13800138000",
    "created_at": 1717305600000,
    "out_trade_no": "BKlq7x2abc123"
  }

TTL: 900 秒 (15 分钟)
```

**示例：**
```
Key:   booking:hold:1:2026-06-15:10
Value: {"booking_id":1024,"member_phone":"13800138000","created_at":1717305600000,"out_trade_no":"BKlq7x2abc123"}
TTL:   900
```

### 1.3 辅助索引 Key

```
// 按订单号反向查找（取消/支付时用）
Key:   booking:id:hold:{booking_id}
Value: booking:hold:{court_id}:{date}:{start_hour}
TTL:   900

// 按手机号查询用户所有占坑
Key:   booking:user:hold:{phone}
Value: Set [ "booking:hold:1:2026-06-15:10", ... ]
TTL:   900

// 当日所有占坑（运维清理用）
Key:   booking:date:hold:{date}
Value: Set [ "booking:hold:1:2026-06-15:10", ... ]
TTL:   86400 (24小时)
```

### 1.4 核心流程时序

```
用户下单 POST /api/bookings
    │
    ├─ Postgres: INSERT bookings (status=unpaid)
    ├─ Postgres: INSERT payments (status=pending)
    ├─ Redis:    SET booking:hold:1:2026-06-15:10  NX EX 900
    ├─ Redis:    SET booking:id:hold:1024            EX 900
    ├─ Redis:    SADD booking:user:hold:138...        EX 900
    ├─ Redis:    SADD booking:date:hold:2026-06-15   EX 86400
    │
    └─ 返回 201，携带 out_trade_no 给前端

┌─────────────────────────────────────────────────────┐
│  超时 15 分钟未支付                                    │
│  ─────────────────────────────────────────────────── │
│  Redis 自动 TTL 过期 → Key 消失                        │
│  定时任务 60s 轮询 Postgres:                           │
│    UPDATE payments SET status='cancelled'              │
│    WHERE status='pending' AND created_at < NOW-15min   │
│    → 触发 promoteWaitlist → 场地给候补                 │
└─────────────────────────────────────────────────────┘

支付成功 POST /api/payments/wechat/callback
    │
    ├─ 查 Redis: GET booking:id:hold:1024 → key
    ├─ Redis: DEL booking:hold:...
    ├─ Redis: DEL booking:id:hold:1024
    ├─ Redis: SREM booking:user:hold:138...
    ├─ Redis: SREM booking:date:hold:2026-06-15
    │
    ├─ Postgres: UPDATE payments SET status='paid'
    ├─ Postgres: UPDATE bookings SET payment_status='paid'
    │
    └─ 返回微信 SUCCESS

用户取消 DELETE /api/bookings/:id
    │
    ├─ 同上清理 Redis Key
    ├─ Postgres: UPDATE ... SET status='cancelled'
    ├─ promoteWaitlist → 场地给候补
    └─ 返回 200
```

### 1.5 Redis 原子操作脚本（Lua）

**下单加锁（保证原子性）：**
```lua
-- KEYS[1] = booking:hold:{court}:{date}:{hour}
-- KEYS[2] = booking:id:hold:{booking_id}
-- ARGV[1] = value JSON
-- ARGV[2] = ttl (900)
-- ARGV[3] = phone
-- ARGV[4] = date_key

local exist = redis.call('SET', KEYS[1], ARGV[1], 'NX', 'EX', ARGV[2])
if not exist then return 0 end

redis.call('SET', KEYS[2], KEYS[1], 'EX', ARGV[2])
redis.call('SADD', 'booking:user:hold:' .. ARGV[3], KEYS[1])
redis.call('EXPIRE', 'booking:user:hold:' .. ARGV[3], ARGV[2])
redis.call('SADD', 'booking:date:hold:' .. ARGV[4], KEYS[1])
redis.call('EXPIRE', 'booking:date:hold:' .. ARGV[4], 86400)
return 1
```

**释放锁（原子清理所有关联 Key）：**
```lua
-- KEYS[1] = booking:hold:{court}:{date}:{hour}
-- KEYS[2] = booking:id:hold:{booking_id}
-- ARGV[1] = phone
-- ARGV[2] = date_key

redis.call('DEL', KEYS[1])
redis.call('DEL', KEYS[2])
redis.call('SREM', 'booking:user:hold:' .. ARGV[1], KEYS[1])
redis.call('SREM', 'booking:date:hold:' .. ARGV[2], KEYS[1])
return 1
```

### 1.6 占坑查询接口

```
GET /api/courts/available 响应增加字段：

{
  "date": "2026-06-15",
  "businessHours": [8,9,...21],
  "courts": [
    {
      "id": 1,
      "courtNumber": "1号",
      "availableHours": [8,9,11,12,...],
      "bookedSlots": [
        {
          "hour": 10,
          "paymentStatus": "unpaid",
          "waitlistCount": 2,
          "holdExpiresAt": 1717306500000  // ← 新增：占坑过期时间戳
        }
      ]
    }
  ]
}
```

### 1.7 Redis 配置建议

```
maxmemory-policy: volatile-lru    # 只对设置了 TTL 的 Key 进行 LRU 淘汰
maxmemory: 256mb                   # 场地数 × 时段数 × 预估并发
persistence: AOF fsync everysec   # 保障 TTL 精度，不追求极致性能
notify-keyspace-events: Ex         # 监听过期事件（可选，用于实时回调）
```

---

## 2. Postgres 事务隔离级别选型

### 2.1 为什么 GET 查询用 `READ COMMITTED`

**隔离级别对比：**

| 隔离级别 | 脏读 | 不可重复读 | 幻读 | 性能 |
|---------|------|-----------|------|------|
| READ UNCOMMITTED | ✅ | ✅ | ✅ | 最高 |
| **READ COMMITTED** | ❌ | ✅ | ✅ | 高 |
| REPEATABLE READ | ❌ | ❌ | ✅ | 中 |
| SERIALIZABLE | ❌ | ❌ | ❌ | 低 |

**选型理由：**

#### 2.1.1 业务特性匹配

`GET /api/courts/available` 是**查询类接口**，语义是：
> "现在看一眼有哪些场地空闲"

不需要"可重复读"——用户不会在同一个事务里读两次空闲表。
即使两次读结果不同（中间有人取消），也是正确的，因为真实世界的状态确实变了。

#### 2.1.2 数据新鲜度优先

READ COMMITTED 保证每次 SELECT 看到的都是**最新已提交**的数据：
```
T1: DELETE 取消预订 → COMMIT
T2: GET 查询 (RC) → 看到最新数据 ✅
T2: GET 查询 (RR) → 看到旧快照 ❌ (用户看到仍被占用)
```

这正是之前 Bug 的核心：连接池复用导致 RR 级别的快照过旧。
换成 RC 级别后，每次查询都是新鲜快照。

#### 2.1.3 并发性能

- RC 级别只持有短时间锁，并发吞吐是 SERIALIZABLE 的 3~5 倍
- 周末高峰 100+ QPS 的查询场景，RC 可以轻松应对
- 不需要事务回滚，查询失败直接释放连接

#### 2.1.4 代码佐证

```javascript
// GET /api/courts/available (app.js 第 60-128 行)
await client.query('BEGIN');
await client.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
// ↓ 这两条查询各在自己的快照，每次都是最新的
const courtsResult   = await client.query('SELECT ...');
const bookingsResult = await client.query('SELECT ... WHERE booking_date = $1', [date]);
// ↓ 即使中间有人插入，读到最新状态才是正确的
await client.query('COMMIT');
```

如果用 RR 级别，两条 SELECT 看到的是同一个快照，即使中间有预订/取消，也看不到变化。

---

### 2.2 为什么 POST 预订用 `SERIALIZABLE`

**核心原因：防超卖**

```javascript
// POST /api/bookings (app.js 第 131-205 行)
await client.query('BEGIN');
await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
// 操作 A: SELECT ... FOR UPDATE (检查是否空闲)
// 操作 B: INSERT bookings (写入预订)
await client.query('COMMIT');
```

SERIALIZABLE 保证 A + B 整体是原子的，等价于：
> "同一时刻只有一个事务能操作这个场地的这个时段"

**三级防护（三重保险）：**

| 层级 | 机制 | 说明 |
|------|------|------|
| 1 | `FOR UPDATE` 行级锁 | 显式锁定场地行，其他事务等待 |
| 2 | `SERIALIZABLE` 隔离 | 即使锁失效，数据库也会检测序列化冲突 |
| 3 | DB 唯一约束 | `UNIQUE(court_id, date, start_hour)` 最后防线 |

**性能权衡：**
- 写入 QPS 低（预订操作相对查询少得多）
- 宁可让用户等待 100ms，也不能超卖
- 冲突时返回 409，让用户重试或走候补队列

---

### 2.3 隔离级别速查表

| 接口 | 隔离级别 | 理由 |
|------|---------|------|
| `GET /api/courts/available` | READ COMMITTED | 追求新鲜度 + 高并发 |
| `GET /api/waitlist` | READ COMMITTED | 查询队列位置，要最新 |
| `GET /api/payments/:no` | READ COMMITTED | 支付状态查询，要最新 |
| `GET /api/group-bookings/:id` | READ COMMITTED | 订单详情查询 |
| `POST /api/bookings` | SERIALIZABLE | 防超卖，数据一致性优先 |
| `POST /api/waitlist` | SERIALIZABLE | 防止重复加入候补 |
| `POST /api/group-bookings` | SERIALIZABLE | 多块场地原子锁定 |
| `DELETE /api/bookings/:id` | SERIALIZABLE | 取消 + 候补递补 原子操作 |
| `POST /api/payments/wechat/callback` | SERIALIZABLE | 防止重复支付回调 |

---

### 2.4 监控指标建议

运维需要关注以下指标：

```
# DB 隔离级别使用占比
SELECT current_setting('transaction_isolation');

# 序列化失败率 (目标 < 1%)
SELECT count(*) FROM pg_stat_statements
WHERE query LIKE 'SET TRANSACTION ISOLATION LEVEL SERIALIZABLE%'
AND calls > 0;

# 锁等待时间 (目标 < 50ms)
SELECT query, total_wait_time / calls AS avg_wait
FROM pg_stat_statements
WHERE query LIKE '%FOR UPDATE%';

# 死锁计数 (目标 = 0)
SELECT * FROM pg_stat_database WHERE datname = 'badminton_booking';
-- 关注 deadlocks 字段
```

---

**参考代码：**
- [app.js - GET RC 隔离](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0601/batch138/src/app.js#L60-L128)
- [app.js - POST SERIALIZABLE 隔离](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0601/batch138/src/app.js#L131-L205)
- [app.js - 超时清理任务](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0601/batch138/src/app.js#L704-L766)
