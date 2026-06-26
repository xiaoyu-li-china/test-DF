# 农险理赔影像系统 - OpenAPI 补充文档

## 目录
1. [理赔影像状态机](#1-理赔影像状态机)
2. [MinIO 预签名 URL 过期策略](#2-minio-预签名-url-过期策略)
3. [API 接口补充说明](#3-api-接口补充说明)

---

## 1. 理赔影像状态机

### 1.1 状态定义

| 状态值 | 枚举常量 | 说明 | 颜色标记 |
|--------|----------|------|----------|
| `pending` | ImageStatus.PENDING | **待审核** - 影像刚上传，等待核赔人员审核 | 🟡 黄色 |
| `需补拍` | ImageStatus.NEEDS_RESHOOT | **需补拍** - 影像质量不合格，需重新拍摄 | 🔴 红色 |
| `已通过` | ImageStatus.APPROVED | **已通过** - 影像审核通过，可进入理赔流程 | 🟢 绿色 |

### 1.2 状态流转图

```
                    ┌─────────────┐
                    │   上传成功   │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   待审核    │
                    │   pending   │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │   已通过    │ │   需补拍    │ │ (保持待审)   │
    │  APPROVED   │ │ NEEDS_RSHT  │ │             │
    └──────┬──────┘ └──────┬──────┘ └─────────────┘
           │               │
           └───────┬───────┘
                   │
                   ▼
            状态可重复切换
```

### 1.3 流转规则

| 当前状态 | 可切换至 | 触发条件 |
|----------|----------|----------|
| **待审核 (pending)** | 已通过 / 需补拍 | 核赔人员审核后作出决定 |
| **需补拍 (需补拍)** | 已通过 / 待审核 | 重新上传补拍影像后，需审核人员重新确认 |
| **已通过 (已通过)** | 需补拍 / 待审核 | 审核有误时可回退状态 |

### 1.4 状态变更 API

#### PATCH /images/{image_id}/status

**请求体：**
```json
{
  "status": "已通过",
  "remark": "照片清晰，角度合规，信息完整"
}
```

**字段说明：**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `status` | string | ✅ | 目标状态，可选值：`pending` / `已通过` / `需补拍` |
| `remark` | string | ❌ | 审核备注，建议在标记「需补拍」时填写补拍要求 |

**响应示例：**
```json
{
  "id": 1,
  "policy_id": 1,
  "uploaded_by_id": 1,
  "file_name": "现场照片_001.jpg",
  "status": "已通过",
  "remark": "照片清晰，角度合规，信息完整",
  "created_at": "2024-06-02T14:30:00+08:00",
  "updated_at": "2024-06-02T15:00:00+08:00"
}
```

### 1.5 状态变更场景示例

#### 场景一：审核通过
```http
PATCH /images/123/status
Authorization: Bearer <token>

{
  "status": "已通过",
  "remark": "现场照片清晰，GPS 与出险地点吻合"
}
```

#### 场景二：要求补拍
```http
PATCH /images/123/status
Authorization: Bearer <token>

{
  "status": "需补拍",
  "remark": "请重新拍摄：1. 照片模糊 2. 缺少车辆全景图"
}
```

#### 场景三：审核有误回退
```http
PATCH /images/123/status
Authorization: Bearer <token>

{
  "status": "pending",
  "remark": "前次审核有误，退回待重新审核"
}
```

---

## 2. MinIO 预签名 URL 过期策略

### 2.1 过期时间配置

| 场景 | 过期时间 | 配置项 |
|------|----------|--------|
| **图片预览 URL** | **3600 秒 (1 小时)** | `storage.get_file_url(object_name, expires=3600)` |

### 2.2 预签名 URL 生成规则

#### 2.2.1 URL 结构
```
http://minio-server:9000/claim-images/POLICY001/abc123.jpg
?X-Amz-Algorithm=AWS4-HMAC-SHA256
&X-Amz-Credential=minioadmin%2F20240602%2Fus-east-1%2Fs3%2Faws4_request
&X-Amz-Date=20240602T063000Z
&X-Amz-Expires=3600
&X-Amz-SignedHeaders=host
&X-Amz-Signature=abcdef123456...
```

#### 2.2.2 关键参数
| 参数 | 说明 |
|------|------|
| `X-Amz-Expires` | 过期秒数，默认 3600 |
| `X-Amz-Date` | 签名生成时间（UTC） |
| `X-Amz-Signature` | HMAC-SHA256 签名 |

### 2.3 过期处理建议

#### 前端处理方案

**方案一：前端缓存 + 过期刷新**
```javascript
// 缓存 URL 及过期时间
const urlCache = new Map();

function getImageUrl(imageId) {
  const cached = urlCache.get(imageId);
  
  // 提前 5 分钟刷新
  if (cached && Date.now() < cached.expireAt - 300000) {
    return cached.url;
  }
  
  // 重新请求获取新 URL
  const freshUrl = await fetch(`/images/${imageId}`).then(r => r.json()).then(r => r.file_url);
  urlCache.set(imageId, {
    url: freshUrl,
    expireAt: Date.now() + 3600000  // 1小时
  });
  return freshUrl;
}
```

**方案二：URL 过期时自动重试**
```javascript
async function loadImage(imageId) {
  try {
    const imageData = await fetch(`/images/${imageId}`).then(r => r.json());
    return imageData.file_url;
  } catch (error) {
    if (error.status === 403 || error.message.includes('expired')) {
      // URL 过期，重新获取
      return loadImage(imageId);
    }
    throw error;
  }
}
```

### 2.4 后端可调参数

如需调整过期时间，可修改 [storage.py](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0601/batch152/app/storage.py#L49-L57)：

```python
def get_file_url(self, object_name: str, expires: int = 3600) -> str:
    # expires 参数可按需调整，单位：秒
    # MinIO 最大支持 7 天 (604800 秒)
    return self.client.presigned_get_object(
        bucket_name=self.bucket_name,
        object_name=object_name,
        expires=expires  # 建议值：1800~7200 秒
    )
```

---

## 3. API 接口补充说明

### 3.1 影像齐全 Webhook 通知

当保单有效影像数达到阈值（默认 3 张）时，系统会自动向核赔系统发送 Webhook。

#### 3.1.1 Webhook 配置

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `WEBHOOK_URL` | 核赔系统接收地址 | `http://claim-system.example.com/webhook/image-ready` |
| `WEBHOOK_SECRET` | 签名密钥 | 需双方约定 |
| `REQUIRED_IMAGE_COUNT` | 影像齐全阈值 | 3 张 |

#### 3.1.2 请求 Headers

```http
Content-Type: application/json
X-Webhook-Signature: sha256=<hmac_signature>
X-Event-Type: images_ready_for_review
```

**签名验证方法：**
```python
import hmac
import hashlib
import json

def verify_signature(payload: dict, signature_header: str, secret: str) -> bool:
    payload_str = json.dumps(payload, sort_keys=True, separators=(',', ':'))
    expected = hmac.new(
        secret.encode('utf-8'),
        payload_str.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(expected, signature_header.replace('sha256=', ''))
```

#### 3.1.3 请求 Payload 示例

```json
{
  "event_type": "images_ready_for_review",
  "timestamp": "2024-06-02T06:30:25.123Z",
  "policy": {
    "policy_number": "NX2024000001",
    "policy_holder_name": "李农民",
    "insurance_type": "水稻种植保险"
  },
  "images": {
    "total_count": 5,
    "required_count": 3,
    "is_complete": true,
    "images": [
      {
        "id": 1,
        "file_name": "现场_全景.jpg",
        "status": "已通过",
        "ocr_license_plate": "京A12345",
        "ocr_vin_number": "LBV1Z3108KM000001",
        "created_at": "2024-06-02T06:25:00Z"
      }
    ]
  }
}
```

### 3.2 OCR 识别字段说明

每张影像上传后自动进行 OCR 识别，结果存储在以下字段：

| 字段 | 说明 | 示例值 |
|------|------|--------|
| `ocr_license_plate` | 识别到的车牌号 | `京A12345` |
| `ocr_vin_number` | 识别到的车架号（VIN） | `LBV1Z3108KM000001` |
| `ocr_raw_text` | OCR 原始识别文本 | 用于人工复核 |

**识别支持：**
- 车牌：中国大陆蓝牌、黄牌、新能源车牌
- 车架号：17 位标准 VIN 码（自动过滤 I/O/Q 易混淆字符）

### 3.3 水印叠加规则

上传的图片会自动叠加水印，内容包括：
```
查勘员: surveyor001 | 拍摄时间: 2024-06-02 14:30:25
```

**水印位置：** 右下角
**透明度：** 60%
**字体大小：** 24px

可通过环境变量调整：
```env
WATERMARK_POSITION=bottom-right    # top-left/top-right/bottom-left/center
WATERMARK_OPACITY=0.6
WATERMARK_FONT_SIZE=24
```

---

## 附录：核赔系统对接 Checklist

- [ ] 配置 `WEBHOOK_URL` 指向核赔系统接收地址
- [ ] 双方约定 `WEBHOOK_SECRET` 签名密钥
- [ ] 确认影像齐全阈值 `REQUIRED_IMAGE_COUNT`
- [ ] 确认预签名 URL 过期时间是否满足业务需求
- [ ] 核赔系统实现签名验证逻辑
- [ ] 测试 Webhook 通知送达及重试机制
