# 物品交换状态机设计

## 一、整体状态流图

```
                        ┌───────────────────┐
                        │   Item (物品)     │
                        └───────────────────┘
                                 │
                                 ▼
     ┌─────────┐        ┌─────────────┐        ┌─────────────┐        ┌───────────┐
     │  draft  │───────▶│  available  │───────▶│ exchanging  │───────▶│ completed │
     └─────────┘ 发布   └─────────────┘ 发起请求 └─────────────┘ 同意  └───────────┘
          │                   │                  │     │
          │删除               │删除/下架         │拒绝  │超时
          ▼                   ▼                  ▼     ▼
     ┌─────────┐        ┌─────────────┐        ┌─────────────┐
     │ deleted │        │  removed    │        │  available  │
     └─────────┘        └─────────────┘        └─────────────┘
                                                 (回退)

                        ┌───────────────────┐
                        │ ExchangeRequest   │
                        │  (交换请求)        │
                        └───────────────────┘
                                 │
                                 ▼
     ┌─────────┐        ┌─────────────┐        ┌─────────────┐
     │ pending │───────▶│  accepted   │        │  rejected   │
     └─────────┘ 同意   └─────────────┘        └─────────────┘
          │                                        ▲
          │超时                                     │
          ▼                                        │拒绝
     ┌─────────┐                                   │
     │ expired │───────────────────────────────────┘
     └─────────┘
```

---

## 二、物品 (Item) 状态机

### 状态定义

| 状态 | 说明 | 触发时机 |
|------|------|----------|
| `draft` | 草稿 | 用户编辑中，未发布 |
| `available` | 可交换 | 已发布，等待他人请求 |
| `exchanging` | 交换中 | 有人发起请求，等待对方响应 |
| `completed` | 已完成 | 交换成功 |
| `removed` | 已下架 | 用户主动下架/删除 |
| `deleted` | 已删除 | 草稿被删除 |

### 状态转换规则

| 当前状态 | 目标状态 | 触发 API / 事件 | 说明 |
|----------|----------|-----------------|------|
| - | `draft` | `POST /api/items?saveAsDraft=true` | 创建草稿 |
| `draft` | `available` | `PUT /api/items/:id/publish` | 发布草稿 |
| `draft` | `deleted` | `DELETE /api/items/:id` | 删除草稿 |
| `available` | `exchanging` | `POST /api/exchange` | 有人发起交换请求 |
| `available` | `removed` | `DELETE /api/items/:id` | 下架物品 |
| `exchanging` | `completed` | `PUT /api/exchange/:id/accept` | 对方同意交换 |
| `exchanging` | `available` | `PUT /api/exchange/:id/reject` | 对方拒绝，物品回退到可交换 |
| `exchanging` | `available` | 定时任务（超时） | 请求超时自动关闭，物品回退 |
| `completed` | - | - | 终态，不可变更 |
| `removed` | `available` | `PUT /api/items/:id/restore` | 重新上架 |

### API 与状态变更映射

| API | 物品状态变更 | 说明 |
|-----|--------------|------|
| `POST /api/items` (draft=true) | `→ draft` | 保存草稿 |
| `POST /api/items` (draft=false) | `→ available` | 直接发布 |
| `PUT /api/items/:id/publish` | `draft → available` | 发布草稿 |
| `PUT /api/items/:id` | 不改变状态 | 更新信息 |
| `DELETE /api/items/:id` (草稿) | `draft → deleted` | 删除草稿 |
| `DELETE /api/items/:id` (已发布) | `available/exchanging → removed` | 下架物品 |
| `PUT /api/items/:id/restore` | `removed → available` | 重新上架 |
| `POST /api/exchange` | `available → exchanging` | 有人发起请求 |
| `PUT /api/exchange/:id/accept` | `exchanging → completed` | 同意交换（两个物品同时变更） |
| `PUT /api/exchange/:id/reject` | `exchanging → available` | 拒绝，物品恢复可交换 |
| 定时任务（超时） | `exchanging → available` | 超时自动关闭 |

---

## 三、交换请求 (ExchangeRequest) 状态机

### 状态定义

| 状态 | 说明 | 触发时机 |
|------|------|----------|
| `pending` | 待处理 | 刚发起，等待对方响应 |
| `accepted` | 已同意 | 对方同意交换 |
| `rejected` | 已拒绝 | 对方拒绝交换 |
| `expired` | 已超时 | 超时未处理，自动关闭 |

### 状态转换规则

| 当前状态 | 目标状态 | 触发 API / 事件 | 说明 |
|----------|----------|-----------------|------|
| - | `pending` | `POST /api/exchange` | 发起交换请求 |
| `pending` | `accepted` | `PUT /api/exchange/:id/accept` | 对方同意 |
| `pending` | `rejected` | `PUT /api/exchange/:id/reject` | 对方拒绝 |
| `pending` | `expired` | 定时任务（超时） | 超时未处理 |
| `accepted` | - | - | 终态 |
| `rejected` | - | - | 终态（可重新发起新请求） |
| `expired` | - | - | 终态（可重新发起新请求） |

### API 与状态变更映射

| API | 请求状态变更 | 说明 |
|-----|--------------|------|
| `POST /api/exchange` | `→ pending` | 发起新请求 |
| `PUT /api/exchange/:id/accept` | `pending → accepted` | 同意 |
| `PUT /api/exchange/:id/reject` | `pending → rejected` | 拒绝 |
| 定时任务（超时） | `pending → expired` | 超时自动关闭 |

### 侧效应（Side Effects）

当交换请求状态变更时，会触发以下关联操作：

| 请求状态变更 | 物品状态变更 | 其他请求处理 |
|--------------|--------------|--------------|
| `→ pending` | 两个物品 `available → exchanging` | - |
| `pending → accepted` | 两个物品 `exchanging → completed` | 涉及这两个物品的其他 `pending` 请求 → `rejected` |
| `pending → rejected` | 两个物品 `exchanging → available` | - |
| `pending → expired` | 两个物品 `exchanging → available` | - |

---

## 四、超时自动关闭规则设计

### 规则说明

| 场景 | 超时时间 | 动作 |
|------|----------|------|
| 交换请求待处理（pending） | 48小时（可配置） | 请求状态 → `expired`，物品状态 → `available` |
| 物品长期无人问津 | 30天（可配置） | 可选：自动下架 → `removed`，通知用户 |

### 实现方案

#### 方案 A：MongoDB TTL 索引 + Change Stream（推荐）

```javascript
// 1. 给 ExchangeRequest 添加 TTL 索引
exchangeRequestSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 48 * 60 * 60, // 48小时
    partialFilterExpression: { status: 'pending' }
  }
);

// 2. 监听 Change Stream
const changeStream = ExchangeRequest.watch([
  { $match: { operationType: 'delete' } }
]);

changeStream.on('change', async (change) => {
  if (change.operationType === 'delete' && change.fullDocumentBeforeChange?.status === 'pending') {
    // 超时自动删除触发，回退物品状态
    const { offeredItem, requestedItem } = change.fullDocumentBeforeChange;
    await Item.updateMany(
      { _id: { $in: [offeredItem, requestedItem] } },
      { status: 'available' }
    );
    // 发送通知
  }
});
```

**注意**：TTL 索引是删除文档，不是更新状态。如果要保留历史记录，用方案 B。

#### 方案 B：定时任务（Cron Job）

```javascript
// 每小时运行一次
const cron = require('node-cron');

cron.schedule('0 * * * *', async () => {
  const timeoutThreshold = new Date(Date.now() - 48 * 60 * 60 * 1000);

  // 1. 查找超时的待处理请求
  const expiredRequests = await ExchangeRequest.find({
    status: 'pending',
    createdAt: { $lt: timeoutThreshold }
  });

  for (const request of expiredRequests) {
    // 2. 更新请求状态为 expired
    request.status = 'expired';
    await request.save();

    // 3. 回退物品状态
    await Item.findByIdAndUpdate(request.offeredItem, { status: 'available' });
    await Item.findByIdAndUpdate(request.requestedItem, { status: 'available' });

    // 4. 发送通知给双方
  }
});
```

### 推荐方案

**使用方案 B（定时任务）**，原因：
1. 保留历史记录（状态变为 `expired` 而非删除）
2. 便于统计和查询
3. 可灵活调整超时时间
4. 触发通知更可靠

---

## 五、数据模型变更建议

### Item 模型新增字段

```javascript
const itemSchema = new mongoose.Schema({
  // ... 现有字段 ...

  status: {
    type: String,
    enum: ['draft', 'available', 'exchanging', 'completed', 'removed', 'deleted'],
    default: 'available'
  },

  // 用于超时控制
  exchangedAt: {
    type: Date,
    default: null
  },

  // 草稿保存
  isDraft: {
    type: Boolean,
    default: false
  }
});
```

### ExchangeRequest 模型新增字段

```javascript
const exchangeRequestSchema = new mongoose.Schema({
  // ... 现有字段 ...

  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'expired'],
    default: 'pending'
  },

  // 超时时间（可针对单个请求调整）
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 48 * 60 * 60 * 1000) // 默认48小时
  }
});
```

### 索引建议

```javascript
// 定时任务快速查询
exchangeRequestSchema.index({ status: 1, createdAt: 1 });
exchangeRequestSchema.index({ status: 1, expiresAt: 1 });

// 物品状态查询
itemSchema.index({ owner: 1, status: 1 });
itemSchema.index({ status: 1, createdAt: -1 });
```

---

## 六、接口变更清单

### 新增接口

| 接口 | 说明 |
|------|------|
| `POST /api/items?saveAsDraft=true` | 保存为草稿 |
| `PUT /api/items/:id/publish` | 发布草稿 |
| `PUT /api/items/:id/restore` | 重新上架已下架物品 |

### 现有接口调整

| 接口 | 调整内容 |
|------|----------|
| `POST /api/items` | 新增 `saveAsDraft` 参数 |
| `POST /api/exchange` | 更新物品状态为 `exchanging`，设置 `exchangedAt` |
| `PUT /api/exchange/:id/accept` | 处理竞态：再次检查状态是否为 `pending` |
| `PUT /api/exchange/:id/reject` | 回退物品状态为 `available` |

---

## 七、竞态条件防护

### 场景：两人同时同意同一物品

**问题**：用户B和用户C同时向用户A的物品发起请求，用户A可能同时操作两个请求。

**防护措施**：

1. **数据库乐观锁**：
```javascript
// 在 accept 接口中
const result = await ExchangeRequest.findOneAndUpdate(
  { _id: requestId, status: 'pending' }, // 条件：必须是pending状态
  { status: 'accepted' },
  { new: true }
);

if (!result) {
  return res.status(400).json({ message: '该请求已被处理' });
}
```

2. **物品状态二次校验**：
```javascript
// 同意前再次确认物品状态
const session = await mongoose.startSession();
await session.withTransaction(async () => {
  // 1. 锁定并更新物品状态
  const item1 = await Item.findOneAndUpdate(
    { _id: offeredItemId, status: 'exchanging' },
    { status: 'completed' },
    { session, new: true }
  );
  const item2 = await Item.findOneAndUpdate(
    { _id: requestedItemId, status: 'exchanging' },
    { status: 'completed' },
    { session, new: true }
  );

  if (!item1 || !item2) {
    throw new Error('物品状态已变更');
  }

  // 2. 更新请求状态
  await ExchangeRequest.findByIdAndUpdate(
    requestId,
    { status: 'accepted' },
    { session }
  );

  // 3. 拒绝其他相关请求
  await ExchangeRequest.updateMany(
    { ..., status: 'pending' },
    { status: 'rejected' },
    { session }
  );
});
```

3. **唯一约束**：同一物品同一时间只能有一个 `exchanging` 请求
```javascript
// 发起请求时检查
const hasActiveRequest = await ExchangeRequest.findOne({
  $or: [
    { offeredItem: itemId, status: 'pending' },
    { requestedItem: itemId, status: 'pending' }
  ]
});
// 注意：允许多个pending请求，物品状态变为exchanging后可继续接受其他请求
// 但只有第一个被同意的会成功
```

---

## 八、通知触发点

| 事件 | 通知接收方 | 推送方式 |
|------|------------|----------|
| 收到新交换请求 | 物品所有者 | Webhook + 小程序消息 |
| 请求被同意 | 发起方 | Webhook + 小程序消息 |
| 请求被拒绝 | 发起方 | Webhook + 小程序消息 |
| 请求超时 | 双方 | Webhook + 小程序消息 |
| 物品超时自动下架 | 物品所有者 | Webhook + 小程序消息 |
