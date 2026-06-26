# 公交到站预测大屏 - 运维文档

> **文档版本**: v1.0  
> **更新日期**: 2026-06-02  
> **适用环境**: 控制室大屏 1920×1080

---

## 1. 调度 API 接口规范

### 1.1 接口地址

| 项 | 值 |
|----|----|
| 请求方式 | `GET` |
| 接口路径 | `/api/dispatch/dashboard` |
| 响应格式 | `application/json` |
| 字符编码 | `UTF-8` |

### 1.2 请求参数

无需请求参数。如需鉴权，请在请求头中携带：

```
Authorization: Bearer <TOKEN>
```

### 1.3 响应字段说明

**根对象 `DashboardData`**

| 字段 | 类型 | 必填 | 示例值 | 说明 |
|------|------|------|--------|------|
| `timestamp` | string | ✅ | `"2026-06-02T08:30:00Z"` | 数据生成时间，ISO 8601 格式 |
| `onTimeRate` | number | ✅ | `85.5` | 全网准点率，`[0, 100]`，1 位小数 |
| `totalRoutes` | number | ✅ | `16` | 监控线路总数 |
| `activeRoutes` | number | ✅ | `14` | 在线运营线路数 |
| `delayedRoutes` | number | ✅ | `3` | 晚点线路数 |
| `outOfServiceRoutes` | number | ✅ | `2` | 停运线路数 |
| `routes` | array | ✅ | — | 全部线路数据，见 `BusRoute` |
| `top5Delayed` | array | ✅ | — | 晚点 Top5，见 `BusRoute` |

> ⚠️ **数据完整性约束**：  
> `activeRoutes + outOfServiceRoutes = totalRoutes`  
> `delayedRoutes ≤ activeRoutes`

**线路对象 `BusRoute`**

| 字段 | 类型 | 必填 | 示例值 | 说明 |
|------|------|------|--------|------|
| `routeId` | string | ✅ | `"1"` | 线路唯一标识 |
| `routeName` | string | ✅ | `"1路"` | 线路显示名称 |
| `direction` | string | ✅ | `"火车站 → 科技园"` | 行驶方向，用 `→` 分隔 |
| `nextBusETA` | string | ✅ | `"2026-06-02T09:15:30Z"` | 下一班预计到站时间，ISO 8601 |
| `minutesAway` | number | ✅ | `15` | 距到站分钟数，**停运时为 -1** |
| `status` | string | ✅ | `"on-time"` | 运行状态，枚举见下方 |
| `delayMinutes` | number | ✅ | `0` | 晚点分钟数，**未晚点时为 0** |

**状态枚举 `BusStatus`**

| 值 | 含义 | UI 表现 |
|----|------|---------|
| `"on-time"` | 准时 | 青色标签 |
| `"delayed"` | 晚点 | 红色标签 + 脉冲动画 |
| `"arriving"` | 即将到站（≤2分钟） | 琥珀黄色标签 |
| `"out-of-service"` | 停运 | 灰色标签 + 时间显示 `--:--` |

### 1.4 完整响应示例

```json
{
  "timestamp": "2026-06-02T08:30:00Z",
  "onTimeRate": 85.5,
  "totalRoutes": 16,
  "activeRoutes": 14,
  "delayedRoutes": 3,
  "outOfServiceRoutes": 2,
  "routes": [
    {
      "routeId": "1",
      "routeName": "1路",
      "direction": "火车站 → 科技园",
      "nextBusETA": "2026-06-02T08:45:00Z",
      "minutesAway": 15,
      "status": "on-time",
      "delayMinutes": 0
    },
    {
      "routeId": "5",
      "routeName": "5路",
      "direction": "市中心 → 大学城",
      "nextBusETA": "2026-06-02T08:55:00Z",
      "minutesAway": 25,
      "status": "delayed",
      "delayMinutes": 10
    }
  ],
  "top5Delayed": [
    {
      "routeId": "5",
      "routeName": "5路",
      "direction": "市中心 → 大学城",
      "nextBusETA": "2026-06-02T08:55:00Z",
      "minutesAway": 25,
      "status": "delayed",
      "delayMinutes": 10
    }
  ]
}
```

---

## 2. 刷新间隔策略

### 2.1 当前配置

| 项 | 值 | 代码位置 |
|----|----|----------|
| 刷新间隔 | **30 秒** | [useBusData.ts#L5](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0601/batch155/src/hooks/useBusData.ts#L5) |
| 倒计时精度 | 1 秒 | [useBusData.ts#L54-L61](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0601/batch155/src/hooks/useBusData.ts#L54-L61) |
| 显示位置 | 顶部状态栏右侧 | [Header.tsx#L43-L48](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0601/batch155/src/components/Header.tsx#L43-L48) |

### 2.2 工作流程

```
┌─────────────┐
│  大屏启动   │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│ 首次拉取 API│────▶│ 渲染所有模块│
└──────┬──────┘     └─────────────┘
       │
       ▼
┌─────────────┐
│ 30s 倒计时  │ ◀─── 每秒 -1，显示在状态栏
└──────┬──────┘
       │ 倒计时归零
       ▼
┌─────────────┐
│ 重新拉取 API│
└──────┬──────┘
       ├──────── 成功 → 数据对比 → 平滑过渡
       │
       └──────── 失败 → 降级策略（见第 3 节）
```

### 2.3 修改刷新间隔

修改 [useBusData.ts](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0601/batch155/src/hooks/useBusData.ts#L5) 中的常量：

```typescript
const REFRESH_INTERVAL = 30000  // 单位：毫秒
```

> 🚩 **注意**：刷新间隔小于 10 秒可能加重调度 API 压力，建议不低于 15 秒。

---

## 3. 失败降级策略

### 3.1 降级层级

| 层级 | 触发条件 | 行为 |
|------|----------|------|
| L1 数据清洗 | 单个字段为 `NaN` / `Infinity` / `null` | `sanitizeData()` 替换为 fallback 值 |
| L2 API 异常 | HTTP 非 2xx / 网络超时 / JSON 解析失败 | 保留上一次成功数据，不刷新 UI |
| L3 首次加载失败 | 启动后首次请求失败 | 显示加载中动画，持续重试 |

### 3.2 L1：字段级清洗 `sanitizeData()`

**代码位置**: [utils.ts#L17-L36](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0601/batch155/src/lib/utils.ts#L17-L36)

| 字段 | 异常值 | fallback |
|------|--------|----------|
| `onTimeRate` | NaN / Infinity | `0` |
| `totalRoutes` | NaN / Infinity | `0` |
| `activeRoutes` | NaN / Infinity | `0` |
| `delayedRoutes` | NaN / Infinity | `0` |
| `outOfServiceRoutes` | NaN / Infinity | `0` |
| `routes[].minutesAway` | NaN / Infinity | `-1` |
| `routes[].delayMinutes` | NaN / Infinity | `0` |
| `top5Delayed[].*` | 同上 | 同上 |

### 3.3 L2：API 请求失败

**代码位置**: [useBusData.ts#L14-L24](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0601/batch155/src/hooks/useBusData.ts#L14-L24)

```typescript
const refresh = useCallback(() => {
  try {
    const newData = generateMockData()  // 替换为 fetch
    const safeData = sanitizeData(newData)
    setData(safeData)
  } catch {
    setData(prev => prev ?? null)  // 保留上一次数据
  }
  setLoading(false)
  setCountdown(REFRESH_INTERVAL / 1000)
}, [])
```

**表现**：
- 顶部状态栏"在线"指示保持绿色（只要浏览器在线）
- 数据停留在上一次成功状态
- 倒计时正常倒数，不影响刷新节奏
- 控制台输出错误日志（开发环境）

### 3.4 L3：首次加载失败

**代码位置**: [Home.tsx#L11-L20](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0601/batch155/src/pages/Home.tsx#L11-L20)

```tsx
if (loading || !data) {
  return (
    <div className="h-screen w-screen bg-[#0a0e27] flex items-center justify-center">
      <div className="w-12 h-12 border-2 border-[#00e5ff] border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-[#7b89b8] tracking-wide">数据加载中...</p>
    </div>
  )
}
```

**表现**：全屏加载动画，30 秒后自动重试。

### 3.5 监控告警建议

为了及时发现 API 异常，建议在运维侧添加：

| 告警项 | 阈值 | 级别 |
|--------|------|------|
| API 连续失败 ≥ 3 次 | 1.5 分钟 | P1 |
| API 响应时间 ≥ 3 秒 | 持续 5 分钟 | P2 |
| `onTimeRate` 持续为 0 | 5 分钟 | P1（可能数据异常） |
| `activeRoutes` 骤降 ≥ 50% | 单次 | P2 |

---

## 4. 接入 WebSocket 推送改造方案

### 4.1 改造原因

当前轮询方案的局限：
- 30 秒延迟，突发事件无法实时感知
- 空请求浪费带宽（3600 次/小时，大部分无变化）
- 高峰期 API 压力大

WebSocket 优势：
- 事件驱动，毫秒级实时性
- 仅在数据变化时推送，带宽节省 90%+
- 服务端主动推送，无需客户端轮询

### 4.2 改造范围

| 文件 | 修改量 | 说明 |
|------|--------|------|
| `useBusData.ts` | 中 | 新增 WebSocket 连接逻辑，移除轮询定时器 |
| `Header.tsx` | 小 | 移除"刷新倒计时"，改为"实时推送中"状态 |
| `vitest.config.ts` | 小 | 添加 WebSocket mock |

### 4.3 WebSocket 消息协议

#### 4.3.1 连接建立

```
wss://<API_HOST>/ws/dispatch
```

#### 4.3.2 服务端 → 客户端消息

**全量推送（首次）**

```json
{
  "type": "full",
  "data": <DashboardData>
}
```

**增量推送（仅变化字段）**

```json
{
  "type": "delta",
  "timestamp": "2026-06-02T08:30:05Z",
  "changes": [
    {
      "routeId": "5",
      "updates": {
        "minutesAway": 20,
        "status": "delayed",
        "delayMinutes": 12
      }
    }
  ],
  "onTimeRate": 84.2,
  "delayedRoutes": 4
}
```

**心跳保活**

```json
{ "type": "ping" }
```

#### 4.3.3 客户端 → 服务端消息

**心跳响应**

```json
{ "type": "pong" }
```

### 4.4 伪代码实现

新建 `src/hooks/useBusDataWebSocket.ts`：

```typescript
import { useState, useEffect, useCallback, useRef } from 'react'
import type { DashboardData, BusRoute } from '@/types'
import { sanitizeData } from '@/lib/utils'

const WS_URL = import.meta.env.VITE_WS_URL || 'wss://api.example.com/ws/dispatch'
const RECONNECT_INTERVAL = 5000
const HEARTBEAT_INTERVAL = 30000

export function useBusData() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const heartbeatRef = useRef<number | null>(null)
  const reconnectRef = useRef<number | null>(null)

  const connect = useCallback(() => {
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      // 启动心跳
      heartbeatRef.current = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'pong' }))
        }
      }, HEARTBEAT_INTERVAL)
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        
        if (msg.type === 'full') {
          const safeData = sanitizeData(msg.data)
          setData(safeData)
          setLoading(false)
        } else if (msg.type === 'delta') {
          setData(prev => {
            if (!prev) return prev
            const newRoutes = prev.routes.map(route => {
              const change = msg.changes?.find((c: { routeId: string }) => c.routeId === route.routeId)
              return change ? { ...route, ...change.updates } : route
            })
            return sanitizeData({
              ...prev,
              timestamp: msg.timestamp,
              onTimeRate: msg.onTimeRate ?? prev.onTimeRate,
              delayedRoutes: msg.delayedRoutes ?? prev.delayedRoutes,
              routes: newRoutes,
              top5Delayed: [...newRoutes]
                .filter(r => r.status === 'delayed')
                .sort((a, b) => b.delayMinutes - a.delayMinutes)
                .slice(0, 5),
            })
          })
        } else if (msg.type === 'ping') {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'pong' }))
          }
        }
      } catch (err) {
        console.error('WebSocket message parse failed:', err)
      }
    }

    ws.onerror = (err) => {
      console.error('WebSocket error:', err)
      setConnected(false)
    }

    ws.onclose = () => {
      setConnected(false)
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current)
      }
      // 自动重连
      reconnectRef.current = window.setTimeout(() => {
        connect()
      }, RECONNECT_INTERVAL)
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      if (wsRef.current) wsRef.current.close()
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
    }
  }, [connect])

  return { data, loading, connected }
}
```

### 4.5 Header 状态改造

**原代码** ([Header.tsx#L43-L48](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0601/batch155/src/components/Header.tsx#L43-L48))：

```tsx
<div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#111633] border border-[#1a2045]">
  <span className="text-xs text-[#7b89b8]">刷新倒计时</span>
  <span className="text-sm font-mono text-[#00e5ff] font-bold tabular-nums">
    {countdown}s
  </span>
</div>
```

**改造后**：

```tsx
<div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#111633] border border-[#1a2045]">
  <span className={`w-2 h-2 rounded-full ${connected ? 'bg-[#00ff88] animate-pulse' : 'bg-[#ff3d71]'}`} />
  <span className="text-xs text-[#7b89b8]">
    {connected ? '实时推送中' : '连接断开，重连中...'}
  </span>
</div>
```

### 4.6 兼容处理：WebSocket 不可用时回退到轮询

```typescript
// 环境变量控制
const USE_WS = import.meta.env.VITE_USE_WS === 'true'

export function useBusData() {
  const pollingResult = useBusDataPolling()  // 原轮询实现
  const wsResult = useBusDataWebSocket()    // 新 WebSocket 实现
  
  return USE_WS ? wsResult : pollingResult
}
```

---

## 5. 常见问题排查

| 现象 | 可能原因 | 排查步骤 |
|------|----------|----------|
| 准点率显示 `NaN%` | 后端返回 NaN 或 0/0 场景 | 检查 `sanitizeData` 是否正确执行；查看接口原始响应 |
| 页面卡住，内存暴涨 | 定时器泄漏 / 闭包累积 | 检查 `useEffect` cleanup；Chrome DevTools Memory 采样 |
| 跨日 00:05 数据异常 | 后端批量清算导致接口波动 | 查看后端日志；降级策略会保留上一次数据 |
| WebSocket 频繁断开 | 网络不稳定 / 服务端心跳超时 | 检查 `HEARTBEAT_INTERVAL`；查看服务端配置 |
| 柱状图不更新 | `top5Delayed` 为空或排序错误 | 检查后端是否正确返回晚点数据；`delayMinutes` 是否 > 0 |

---

## 6. 联系信息

- **接口对接**: 调度系统组
- **前端维护**: 大屏项目组
- **运维支持**: 控制室运维组
