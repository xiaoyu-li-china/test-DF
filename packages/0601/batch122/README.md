# 小区闲置物品交换平台 API

基于 Node.js + Express + MongoDB 的后端 API，支持居民发布闲置物品、浏览列表、发起交换请求、意向匹配推荐、距离排序、webhook 通知等功能。

## 技术栈

- **后端框架**: Express.js
- **数据库**: MongoDB
- **认证**: JWT (JSON Web Token)
- **文件上传**: Multer
- **数据验证**: express-validator
- **消息通知**: Webhook（推送至物业小程序）

## 项目结构

```
.
├── src/
│   ├── config/
│   │   └── database.js          # 数据库连接配置
│   ├── middleware/
│   │   ├── auth.js              # JWT 认证中间件
│   │   └── upload.js            # 文件上传中间件
│   ├── models/
│   │   ├── User.js              # 用户模型（含经纬度位置）
│   │   ├── Item.js              # 物品模型（含意向标签）
│   │   └── ExchangeRequest.js   # 交换请求模型
│   ├── routes/
│   │   ├── auth.js              # 用户认证路由
│   │   ├── items.js             # 物品管理路由
│   │   └── exchange.js          # 交换请求路由
│   ├── services/
│   │   └── webhook.js           # Webhook 通知服务
│   └── server.js                # 服务器入口文件
├── uploads/                     # 上传文件存储目录
├── .env                         # 环境变量
├── .env.example                 # 环境变量示例
└── package.json
```

## 快速开始

### 环境要求

- Node.js >= 14.x
- MongoDB >= 4.x

### 安装依赖

```bash
npm install
```

### 配置环境变量

复制 `.env.example` 为 `.env` 并修改配置：

```bash
cp .env.example .env
```

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/community-exchange
JWT_SECRET=your-secret-key-change-in-production
WEBHOOK_URL=https://your-property-app.com/api/webhook
WEBHOOK_SECRET=webhook-secret-for-verification
```

### 启动服务

```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

服务将在 `http://localhost:3000` 启动。

---

## API 文档

### 通用说明

- 所有接口返回 JSON 格式
- 需要认证的接口需在请求头中携带：`Authorization: Bearer <token>`
- 时间格式：ISO 8601

---

### 1. 用户认证

#### 1.1 注册

**接口**: `POST /api/auth/register`

**请求体**:
```json
{
  "phone": "13800138000",
  "password": "123456",
  "nickname": "张三"
}
```

**响应**:
```json
{
  "message": "注册成功",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "60d21b4667d0d8992e610c85",
    "phone": "13800138000",
    "nickname": "张三",
    "avatar": ""
  }
}
```

#### 1.2 登录

**接口**: `POST /api/auth/login`

**请求体**:
```json
{
  "phone": "13800138000",
  "password": "123456"
}
```

#### 1.3 获取用户信息

**接口**: `GET /api/auth/profile`

**需要认证**: 是

**响应**:
```json
{
  "user": {
    "id": "60d21b4667d0d8992e610c85",
    "phone": "13800138000",
    "nickname": "张三",
    "avatar": "",
    "address": "",
    "location": {
      "type": "Point",
      "coordinates": [116.397428, 39.90923]
    }
  }
}
```

#### 1.4 更新用户信息

**接口**: `PUT /api/auth/profile`

**需要认证**: 是

**请求体**:
```json
{
  "nickname": "新昵称",
  "avatar": "https://example.com/avatar.jpg",
  "address": "1号楼3单元501",
  "longitude": 116.397428,
  "latitude": 39.90923
}
```

**说明**: `longitude` 和 `latitude` 用于更新用户位置，设置后可支持距离排序功能。

---

### 2. 物品管理

#### 2.1 发布物品

**接口**: `POST /api/items`

**需要认证**: 是

**Content-Type**: `multipart/form-data`

**字段**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 是 | 物品标题（最多100字） |
| description | string | 是 | 物品描述（最多1000字） |
| expectedExchange | string | 是 | 期望交换什么（最多200字） |
| haveTag | string | 否 | 我有什么（意向标签，如"自行车"） |
| wantTag | string | 否 | 我想换什么（意向标签，如"绘本"） |
| category | string | 否 | 分类，默认"其他" |
| images | file[] | 否 | 图片文件（最多5张，单张5MB） |

**关于意向标签**:
- `haveTag` 表示物品的关键词（如"自行车"、"电风扇"）
- `wantTag` 表示想换取的物品关键词（如"绘本"、"玩具"）
- 设置后系统可通过意向匹配接口推荐可能感兴趣的物品

#### 2.2 意向匹配推荐

**接口**: `GET /api/items/match`

**需要认证**: 是

**说明**: 系统根据当前用户所有可交换物品的 `haveTag`/`wantTag`，自动匹配其他用户的物品。匹配逻辑：
1. 我的 `haveTag` 与对方的 `wantTag` 一致 → 单向匹配（+10分）
2. 我的 `wantTag` 与对方的 `haveTag` 一致 → 单向匹配（+10分）
3. 双向完全匹配（我有X想换Y，对方有Y想换X）→ 完美匹配（+20分加成）

**响应**:
```json
{
  "matches": [
    {
      "_id": "60d21b4667d0d8992e610c87",
      "title": "儿童绘本全套",
      "haveTag": "绘本",
      "wantTag": "自行车",
      "matchScore": 30,
      ...
    }
  ],
  "myHaveTags": ["自行车"],
  "myWantTags": ["绘本"]
}
```

#### 2.3 获取物品列表

**接口**: `GET /api/items`

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认1 |
| limit | number | 否 | 每页数量，默认10 |
| category | string | 否 | 分类筛选 |
| status | string | 否 | 状态筛选，默认"available" |
| keyword | string | 否 | 搜索关键词 |
| sortBy | string | 否 | 排序方式，`distance` 按距离排序 |
| lng | number | 否 | 用户经度（sortBy=distance时必填） |
| lat | number | 否 | 用户纬度（sortBy=distance时必填） |
| maxDistance | number | 否 | 最大距离（米），默认5000 |

**按距离排序示例**:
```
GET /api/items?sortBy=distance&lng=116.397428&lat=39.90923&maxDistance=3000
```

**距离排序响应**（额外包含 `distance` 字段，单位：米）:
```json
{
  "items": [
    {
      "_id": "...",
      "title": "儿童自行车",
      "distance": 120,
      "owner": { "nickname": "张三" },
      ...
    }
  ]
}
```

#### 2.4 获取我的物品

**接口**: `GET /api/items/my`

**需要认证**: 是

**查询参数**: 同上（不含距离排序）

#### 2.5 获取物品详情

**接口**: `GET /api/items/:id`

#### 2.6 更新物品

**接口**: `PUT /api/items/:id`

**需要认证**: 是（仅物品所有者）

**请求体**: 同发布物品（字段可选，`haveTag`/`wantTag` 可更新）

#### 2.7 删除物品

**接口**: `DELETE /api/items/:id`

**需要认证**: 是（仅物品所有者）

---

### 3. 交换请求

#### 3.1 发起交换请求

**接口**: `POST /api/exchange`

**需要认证**: 是

**请求体**:
```json
{
  "offeredItemId": "60d21b4667d0d8992e610c86",
  "requestedItemId": "60d21b4667d0d8992e610c87",
  "message": "我想用我的自行车换你的绘本，可以吗？"
}
```

**Webhook 通知**: 发起交换时，系统会向物业小程序推送 `exchange.requested` 事件。

#### 3.2 获取我发起的请求

**接口**: `GET /api/exchange/sent`

**需要认证**: 是

#### 3.3 获取我收到的请求

**接口**: `GET /api/exchange/received`

**需要认证**: 是

#### 3.4 同意交换

**接口**: `PUT /api/exchange/:id/accept`

**需要认证**: 是（仅接收方）

**说明**:
- 同意后，两个物品状态变为 `exchanged`
- 涉及这两个物品的其他待处理请求会被自动拒绝

**Webhook 通知**: 同意交换时，推送 `exchange.accepted` 事件。

#### 3.5 拒绝交换

**接口**: `PUT /api/exchange/:id/reject`

**需要认证**: 是（仅接收方）

**Webhook 通知**: 拒绝交换时，推送 `exchange.rejected` 事件。

#### 3.6 获取交换请求详情

**接口**: `GET /api/exchange/:id`

**需要认证**: 是（仅相关双方）

---

### 4. Webhook 通知

当交换请求状态变化时，系统会向配置的 `WEBHOOK_URL` 发送 POST 请求。

#### Webhook 请求格式

```json
{
  "event": "exchange.requested",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "secret": "webhook-secret-for-verification",
  "data": {
    "requestId": "60d21b4667d0d8992e610c88",
    "fromUser": { "id": "...", "nickname": "张三" },
    "toUser": { "id": "...", "nickname": "李四" },
    "offeredItem": { "id": "...", "title": "儿童自行车" },
    "requestedItem": { "id": "...", "title": "儿童绘本" },
    "message": "想换你的绘本"
  }
}
```

#### 事件类型

| 事件 | 说明 |
|------|------|
| exchange.requested | 有人发起了交换请求 |
| exchange.accepted | 交换请求被同意 |
| exchange.rejected | 交换请求被拒绝 |

#### 安全验证

- 请求头包含 `X-Webhook-Secret`，值为 `WEBHOOK_SECRET`
- 请求体中也包含 `secret` 字段，可用于双重验证
- 物业小程序应验证 secret 后再处理通知

---

## 数据状态说明

### 物品状态 (Item.status)

| 状态 | 说明 |
|------|------|
| available | 可交换 |
| exchanging | 交换中 |
| exchanged | 已交换 |

### 交换请求状态 (ExchangeRequest.status)

| 状态 | 说明 |
|------|------|
| pending | 待处理 |
| accepted | 已同意 |
| rejected | 已拒绝 |

---

## 注意事项

1. 手机号格式：必须是中国大陆手机号（1开头的11位数字）
2. 密码要求：至少6位
3. 图片限制：最多5张，单张不超过5MB，支持 jpg/jpeg/png/gif
4. Token 有效期：7天
5. 距离排序依赖用户经纬度，需先通过 `PUT /api/auth/profile` 设置 `longitude` 和 `latitude`
6. 意向匹配依赖 `haveTag`/`wantTag`，未设置标签的物品不会参与匹配
7. Webhook 为异步非阻塞调用，失败不影响主流程，仅记录日志
