# 游泳馆储物柜管理系统 API 文档

## 目录
- [1. 储物柜状态机](#1-储物柜状态机)
- [2. Redis Key 设计](#2-redis-key-设计)
- [3. 闸机 Webhook 时序](#3-闸机-webhook-时序)
- [4. API 接口参考](#4-api-接口参考)
- [5. 状态流转示例](#5-状态流转示例)

---

## 1. 储物柜状态机

### 1.1 状态定义

| 状态 | 标识 | 说明 |
|------|------|------|
| 空闲 | `free` | 柜未被分配，可正常使用 |
| 占用 | `<wristbandId>` | 已分配给手环，存储手环号作为状态值 |
| 维修 | `maintenance` | 柜处于维修状态，不可分配 |
| 超时释放 | 自动流转 | 占用超过 2 小时自动转为空闲 |

### 1.2 状态机图

```
                     ┌─────────────┐
                     │    维修     │
                     │ maintenance │
                     └──────▲──────┘
                            │
                    维修/恢复操作
                            │
┌─────────────┐     ┌──────┴──────┐     ┌─────────────┐
│    空闲     │────▶│    占用     │────▶│  超时释放   │
│    free     │ 分配 │<wristbandId>│ 2h后 │  (自动)    │
└──────▲──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │                   │ 释放操作          │
       │                   │                   │
       └───────────────────┴───────────────────┘
                        转为空闲
```

### 1.3 状态流转规则

| 起始状态 | 事件 | 目标状态 | 触发方式 |
|----------|------|----------|----------|
| free | 分配柜号 | `<wristbandId>` | POST /api/lockers/assign |
| `<wristbandId>` | 释放柜号 | free | PATCH /api/lockers/release |
| `<wristbandId>` | 超时 2h | free | 后台定时任务自动执行 |
| free | 标记维修 | maintenance | 管理端操作 |
| maintenance | 恢复使用 | free | 管理端操作 |
| `<wristbandId>` | 出场闸机 | free | POST /api/gate/webhook?event=exit |

---

## 2. Redis Key 设计

### 2.1 Key 总览

| Key 类型 | Key 名称 | 说明 | 数据结构 |
|----------|----------|------|----------|
| 系统标记 | `lockers:initialized` | 是否已初始化 | String |
| 柜状态 | `lockers:status` | 所有柜的状态 | Hash |
| 手环映射 | `lockers:wristband` | 手环号 → 柜号 | Hash |
| 入场时间 | `lockers:checkin` | 柜号 → 入场时间戳 | Hash |
| 男区空闲 | `lockers:free:male` | 男区所有空闲柜 | Set |
| 男区 VIP 空闲 | `lockers:free:male:vip` | 男区 VIP 空闲柜 | Set |
| 女区空闲 | `lockers:free:female` | 女区所有空闲柜 | Set |
| 女区 VIP 空闲 | `lockers:free:female:vip` | 女区 VIP 空闲柜 | Set |

### 2.2 详细设计

#### 2.2.1 `lockers:status` (Hash)
存储所有 200 个柜的当前状态
- **Field**: 柜号 (M001-M100, F001-F100)
- **Value**: 
  - `"free"` - 空闲
  - `"<wristbandId>"` - 被该手环占用
  - `"maintenance"` - 维修中

**示例：**
```
HGETALL lockers:status
1) "M001"
2) "WB001"        # 被 WB001 占用
3) "M002"
4) "free"         # 空闲
5) "M010"
6) "maintenance"  # 维修中
```

#### 2.2.2 `lockers:wristband` (Hash)
手环号到柜号的反向映射，用于快速查询
- **Field**: 手环号
- **Value**: 柜号

**示例：**
```
HGET lockers:wristband WB001
"M001"
```

#### 2.2.3 `lockers:checkin` (Hash)
存储每个被占用柜的入场时间戳（秒级），用于超时判断
- **Field**: 柜号
- **Value**: Unix 时间戳（秒）

**示例：**
```
HGET lockers:checkin M001
"1717300000"
```

#### 2.2.4 `lockers:free:{gender}[:vip]` (Set)
空闲柜集合，用于快速随机分配
- `lockers:free:male` - 男区所有空闲柜（含 VIP）
- `lockers:free:male:vip` - 男区 VIP 空闲柜（M001-M010）
- `lockers:free:female` - 女区所有空闲柜（含 VIP）
- `lockers:free:female:vip` - 女区 VIP 空闲柜（F001-F010）

**示例：**
```
SMEMBERS lockers:free:male:vip
1) "M001"
2) "M002"
...
10) "M010"
```

### 2.3 并发控制机制

使用 Redis `WATCH` + `MULTI` 事务保证分配/释放的原子性：

```
WATCH lockers:free:male lockers:wristband
  ↓
HGET lockers:wristband <wristbandId>  # 检查是否已分配
  ↓
SRANDMEMBER lockers:free:male         # 随机选一个空闲柜
  ↓
MULTI
  SREM lockers:free:male <locker>
  SREM lockers:free:male:vip <locker>  # 如果是 VIP 柜
  HSET lockers:status <locker> <wristbandId>
  HSET lockers:wristband <wristbandId> <locker>
  HSET lockers:checkin <locker> <timestamp>
EXEC  # 如果 WATCH 的 key 被修改，返回 null，需要重试
```

### 2.4 数据一致性保证

每次状态变更**必须**同时更新相关的 Key：

| 操作 | 必须更新的 Key |
|------|----------------|
| 分配 | `lockers:status` ✓, `lockers:wristband` ✓, `lockers:checkin` ✓, `lockers:free:*` ✓ |
| 释放 | `lockers:status` ✓, `lockers:wristband` ✓, `lockers:checkin` ✓, `lockers:free:*` ✓ |
| 超时释放 | 同上，由后台任务自动执行 |

---

## 3. 闸机 Webhook 时序

### 3.1 入场闸机时序（分配柜号）

```
┌──────────┐        ┌────────────┐        ┌──────────────┐        ┌──────────────┐
│  游泳者  │        │  入场闸机  │        │  储物柜 API  │        │   Redis DB   │
└────┬─────┘        └─────┬──────┘        └──────┬───────┘        └──────┬───────┘
     │  刷手环入场        │                      │                        │
     │───────────────────>│                      │                        │
     │                    │  POST /api/gate/webhook?event=entry          │
     │                    │ { gender, wristbandId, isVip }                │
     │                    │─────────────────────>│                        │
     │                    │                      │  WATCH + MULTI 事务    │
     │                    │                      │───────────────────────>│
     │                    │                      │  SPOP 从空闲集合取柜   │
     │                    │                      │  更新 status/wristband │
     │                    │                      │  checkin 记录时间戳    │
     │                    │                      │<───────────────────────│
     │                    │    返回分配结果       │                        │
     │                    │<─────────────────────│                        │
     │   显示柜号 M005    │                      │                        │
     │<───────────────────│                      │                        │
     │                    │                      │  notifyWebhooks()      │
     │                    │                      │───> 订阅者 (开柜指令)  │
     │                    │                      │                        │
```

### 3.2 出场闸机时序（释放柜号）

```
┌──────────┐        ┌────────────┐        ┌──────────────┐        ┌──────────────┐
│  游泳者  │        │  出场闸机  │        │  储物柜 API  │        │   Redis DB   │
└────┬─────┘        └─────┬──────┘        └──────┬───────┘        └──────┬───────┘
     │  刷手环出场        │                      │                        │
     │───────────────────>│                      │                        │
     │                    │  POST /api/gate/webhook?event=exit           │
     │                    │ { wristbandId }      │                        │
     │                    │─────────────────────>│                        │
     │                    │                      │  WATCH + MULTI 事务    │
     │                    │                      │───────────────────────>│
     │                    │                      │  HGET 查柜号           │
     │                    │                      │  SADD 放回空闲集合     │
     │                    │                      │  删除映射/入场时间     │
     │                    │                      │<───────────────────────│
     │                    │    返回释放结果       │                        │
     │                    │<─────────────────────│                        │
     │   出场成功         │                      │                        │
     │<───────────────────│                      │                        │
     │                    │                      │  notifyWebhooks()      │
     │                    │                      │───> 订阅者             │
     │                    │                      │                        │
```

### 3.3 超时自动释放时序

```
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│  后台定时器  │        │  储物柜 API  │        │   Redis DB   │
└──────┬───────┘        └──────┬───────┘        └──────┬───────┘
       │  每 60s 触发          │                        │
       │──────────────────────>│                        │
       │                       │  HGETALL checkin        │
       │                       │───────────────────────>│
       │                       │<───────────────────────│
       │                       │  遍历 checkin < cutoff │
       │                       │  (当前时间 - 2小时)     │
       │                       │                        │
       │                       │  对每个超时柜:          │
       │                       │  tryReleaseLocker()    │
       │                       │───────────────────────>│
       │                       │  WATCH + MULTI         │
       │                       │  原子释放 + 回收到空闲集│
       │                       │<───────────────────────│
       │                       │  notifyWebhooks()      │
       │                       │───> auto-release 事件  │
       │                       │                        │
```

### 3.4 Webhook 事件类型

| 事件类型 | 触发时机 | 数据字段 |
|----------|----------|----------|
| `assign` | 手动分配柜号 | `locker`, `wristbandId`, `isVip` |
| `release` | 手动释放柜号 | `locker`, `wristbandId` |
| `auto-release` | 超时自动释放 | `locker`, `wristbandId` |
| `gate-entry` | 入场闸机联动 | `locker`, `wristbandId`, `isVip` |
| `gate-exit` | 出场闸机联动 | `locker`, `wristbandId` |

**Webhook Payload 格式：**
```json
{
  "event": "gate-entry",
  "data": {
    "locker": "M005",
    "wristbandId": "WB001",
    "isVip": true
  },
  "timestamp": "2026-06-02T10:30:00.000Z"
}
```

---

## 4. API 接口参考

### 4.1 分配柜号

**POST** `/api/lockers/assign`

**请求体：**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `gender` | string | 是 | `male` 或 `female` |
| `wristbandId` | string | 是 | 手环编号 |
| `isVip` | boolean | 否 | 是否 VIP，默认 `false` |

**成功响应 (200)：**
```json
{
  "success": true,
  "locker": "M001",
  "wristbandId": "WB001",
  "isVip": true
}
```

**错误响应：**
- `400` - 参数错误 / 手环已分配柜号
- `409` - 无可用柜号

---

### 4.2 查询手环柜号

**GET** `/api/lockers/wristband/:wristbandId`

**路径参数：**
- `wristbandId` - 手环编号

**成功响应 (200)：**
```json
{
  "wristbandId": "WB001",
  "locker": "M001",
  "isVip": true,
  "checkinTime": "2026-06-02T10:30:00.000Z",
  "autoReleaseIn": "115 minutes"
}
```

**错误响应：**
- `404` - 未找到该手环的柜号

---

### 4.3 释放柜号

**PATCH** `/api/lockers/release`

**请求体：**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `wristbandId` | string | 是 | 手环编号 |

**成功响应 (200)：**
```json
{
  "success": true,
  "locker": "M001",
  "wristbandId": "WB001"
}
```

**错误响应：**
- `404` - 未找到该手环的柜号

---

### 4.4 查询空闲柜列表

**GET** `/api/lockers/available`

**成功响应 (200)：**
```json
{
  "male": {
    "count": 95,
    "vipCount": 8,
    "lockers": ["M002", "M003", ...],
    "vipLockers": ["M002", "M003", ...]
  },
  "female": {
    "count": 98,
    "vipCount": 10,
    "lockers": ["F001", "F002", ...],
    "vipLockers": ["F001", "F002", ...]
  }
}
```

---

### 4.5 管理端统计

**GET** `/api/lockers/stats`

**成功响应 (200)：**
```json
{
  "male": {
    "free": 95,
    "occupied": 5,
    "total": 100,
    "vipFree": 8,
    "vipOccupied": 2
  },
  "female": {
    "free": 98,
    "occupied": 2,
    "total": 100,
    "vipFree": 10,
    "vipOccupied": 0
  },
  "total": {
    "free": 193,
    "occupied": 7,
    "total": 200
  },
  "autoRelease": {
    "timeoutHours": 2,
    "checkIntervalMinutes": 1
  }
}
```

---

### 4.6 闸机 Webhook 入口

**POST** `/api/gate/webhook`

**请求体 - 入场：**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `event` | string | 是 | 固定为 `entry` |
| `gender` | string | 是 | `male` / `female` |
| `wristbandId` | string | 是 | 手环编号 |
| `isVip` | boolean | 否 | 是否 VIP |

**请求体 - 出场：**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `event` | string | 是 | 固定为 `exit` |
| `wristbandId` | string | 是 | 手环编号 |

---

### 4.7 Webhook 订阅管理

**POST** `/api/webhooks/subscribe`
```json
{
  "url": "https://your-system.com/webhook",
  "events": ["gate-entry", "auto-release"]  // ["*"] 接收所有
}
```

**DELETE** `/api/webhooks/subscribe`
```json
{ "url": "https://your-system.com/webhook" }
```

**GET** `/api/webhooks` - 查看所有订阅

---

## 5. 状态流转示例

### 5.1 正常流程：入场 → 使用 → 出场

```
1. 空闲 M005 ──entry 闸机──▶ 占用 M005(WB001)
   lockers:status[M005] = "WB001"
   lockers:wristband[WB001] = "M005"
   lockers:checkin[M005] = 1717300000
   lockers:free:male 移除 M005

2. 占用 1.5 小时 ...

3. 占用 M005(WB001) ──exit 闸机──▶ 空闲 M005
   lockers:status[M005] = "free"
   lockers:wristband 删除 WB001
   lockers:checkin 删除 M005
   lockers:free:male 加入 M005
```

### 5.2 超时释放流程

```
1. 占用 M010(WB002) ──(超过 2 小时无人)──▶ 超时检测
   checkin[M010] = 1717300000
   当前时间 = 1717307200 (2小时+后)
   1717300000 < (1717307200 - 7200) = 1717300000 ✓ 触发释放

2. 自动转为空闲
   lockers:status[M010] = "free"
   lockers:wristband 删除 WB002
   lockers:checkin 删除 M010
   lockers:free:male:vip 加入 M010
   lockers:free:male 加入 M010
```

---

## 代码参考

- 状态机核心逻辑：[tryAssignLocker](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0601/batch156/app.js#L63-L109)
- 释放逻辑：[tryReleaseLocker](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0601/batch156/app.js#L111-L144)
- 闸机 Webhook：[/api/gate/webhook](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0601/batch156/app.js#L337-L395)
- 自动释放定时器：[startAutoReleaseChecker](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0601/batch156/app.js#L158-L183)
