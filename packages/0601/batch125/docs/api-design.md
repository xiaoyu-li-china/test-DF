# 幼儿园接送签到系统 API 设计文档

## 一、基础信息

- **Base URL**: `/api/v1`
- **认证方式**: JWT Token (Header: `Authorization: Bearer {token}`)
- **请求格式**: `application/json`
- **响应格式**: `application/json`

## 二、通用响应格式

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| code | int | 状态码: 0-成功, 非0-失败 |
| message | string | 响应消息 |
| data | object/array | 响应数据 |

## 三、状态码与常量定义

### 签到状态说明

`checkin_status` 取值:

| 值 | 说明 |
|----|------|
| 0 | 未到达（未入园签到）|
| 1 | 在园（已入园，未离园）|
| 2 | 已接走（已离园签到）|

---

## 四、API 接口列表

### 1. 签到相关接口

#### 1.1 扫码签到（家长端）

**接口**: `POST /checkin/scan`

**描述**: 家长扫描班级二维码进行签到

**请求参数**:
```json
{
  "class_qr_code": "CLASS_001_20240101",
  "student_id": 1001,
  "checkin_type": 1,
  "picker_id": 2001,
  "picker_type": 1
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| class_qr_code | string | 是 | 班级二维码内容 |
| student_id | long | 是 | 学生ID |
| checkin_type | int | 是 | 签到类型: 1-入园, 2-离园 |
| picker_id | long | 是 | 接送人ID |
| picker_type | int | 是 | 接送人类型: 1-家长, 2-临时授权人 |

**响应示例**:
```json
{
  "code": 0,
  "message": "签到成功",
  "data": {
    "record_id": 1,
    "student_name": "小明",
    "checkin_time": "2024-01-01 08:30:00",
    "checkin_type": 1,
    "sequence_no": 15
  }
}
```

---

#### 1.2 手动补签（老师端）

**接口**: `POST /checkin/manual`

**描述**: 老师手动为学生补签

**请求参数**:
```json
{
  "class_id": 1,
  "student_id": 1001,
  "checkin_type": 1,
  "checkin_time": "2024-01-01 08:35:00",
  "picker_name": "张三",
  "picker_relation": "父亲",
  "remark": "晚到补签"
}
```

**响应示例**:
```json
{
  "code": 0,
  "message": "补签成功",
  "data": {
    "record_id": 2
  }
}
```

---

### 2. 签到状态查询接口

#### 2.1 查询班级当日签到状态（老师端）

**接口**: `GET /checkin/class/{class_id}/today`

**描述**: 老师查看班级当日所有学生的签到状态

**请求参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| checkin_type | int | 否 | 签到类型筛选: 1-入园, 2-离园 |

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "class_id": 1,
    "class_name": "小一班",
    "total_students": 30,
    "checked_in_count": 25,
    "not_checked_in_count": 5,
    "students": [
      {
        "student_id": 1001,
        "student_name": "小明",
        "avatar_url": "https://...",
        "checkin_status": 1,
        "checkin_time": "2024-01-01 08:30:00",
        "picker_name": "张三",
        "picker_relation": "父亲"
      },
      {
        "student_id": 1002,
        "student_name": "小红",
        "avatar_url": "https://...",
        "checkin_status": 0,
        "checkin_time": null,
        "picker_name": null,
        "picker_relation": null
      }
    ]
  }
}
```

> checkin_status: 0-未签到, 1-已签到

---

#### 2.2 查询学生签到记录

**接口**: `GET /checkin/student/{student_id}/records`

**描述**: 查询学生的签到历史记录

**请求参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| start_date | string | 否 | 开始日期 (YYYY-MM-DD) |
| end_date | string | 否 | 结束日期 (YYYY-MM-DD) |
| page | int | 否 | 页码, 默认1 |
| page_size | int | 否 | 每页条数, 默认20 |

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total": 30,
    "page": 1,
    "page_size": 20,
    "list": [
      {
        "record_id": 1,
        "checkin_type": 1,
        "checkin_time": "2024-01-01 08:30:00",
        "picker_name": "张三",
        "picker_relation": "父亲",
        "checkin_method": 1
      }
    ]
  }
}
```

---

### 3. 临时接送人授权接口

#### 3.1 提交临时接送人授权申请（家长端）

**接口**: `POST /authorization/temp`

**描述**: 家长提交临时接送人授权申请

**请求参数**:
```json
{
  "student_id": 1001,
  "authorized_person_name": "李四",
  "authorized_person_phone": "13800138000",
  "authorized_person_id_card": "110101199001011234",
  "id_card_front_url": "https://...",
  "id_card_back_url": "https://...",
  "start_time": "2024-01-01 16:00:00",
  "end_time": "2024-01-01 19:00:00"
}
```

**响应示例**:
```json
{
  "code": 0,
  "message": "授权申请提交成功，等待审核",
  "data": {
    "authorization_id": 1
  }
}
```

---

#### 3.2 审核临时接送人授权（老师端）

**接口**: `POST /authorization/{id}/review`

**描述**: 老师审核临时接送人授权申请

**请求参数**:
```json
{
  "status": 1,
  "review_remark": "审核通过"
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | int | 是 | 审核结果: 1-通过, 2-拒绝 |
| review_remark | string | 否 | 审核备注 |

**响应示例**:
```json
{
  "code": 0,
  "message": "审核完成",
  "data": {
    "authorization_id": 1,
    "status": 1
  }
}
```

---

#### 3.3 查询临时接送人授权列表

**接口**: `GET /authorization/list`

**描述**: 查询临时接送人授权列表

**请求参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| student_id | long | 否 | 学生ID |
| status | int | 否 | 状态: 0-待审核,1-通过,2-拒绝,3-过期 |
| page | int | 否 | 页码 |
| page_size | int | 否 | 每页条数 |

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total": 10,
    "list": [
      {
        "authorization_id": 1,
        "student_id": 1001,
        "student_name": "小明",
        "authorized_person_name": "李四",
        "authorized_person_phone": "13800138000",
        "start_time": "2024-01-01 16:00:00",
        "end_time": "2024-01-01 19:00:00",
        "status": 1,
        "reviewer_name": "王老师"
      }
    ]
  }
}
```

---

#### 3.4 查询当前有效的临时接送人（签到时验证用）

**接口**: `GET /authorization/student/{student_id}/valid`

**描述**: 查询学生当前有效的临时接送人授权

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "authorization_id": 1,
        "authorized_person_name": "李四",
        "authorized_person_phone": "13800138000",
        "authorized_person_id_card": "110101199001011234",
        "start_time": "2024-01-01 16:00:00",
        "end_time": "2024-01-01 19:00:00"
      }
    ]
  }
}
```

---

### 4. 班级相关接口

#### 4.1 获取班级信息

**接口**: `GET /classes/{class_id}`

**描述**: 获取班级详细信息

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "class_id": 1,
    "kindergarten_id": 1,
    "name": "小一班",
    "grade": "小班",
    "class_qr_code": "CLASS_001_20240101",
    "student_count": 30,
    "teachers": [
      {
        "teacher_id": 1,
        "name": "王老师",
        "role": "teacher"
      }
    ]
  }
}
```

---

#### 4.2 获取老师管理的班级列表

**接口**: `GET /teacher/classes`

**描述**: 获取当前登录老师管理的班级列表

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "class_id": 1,
        "name": "小一班",
        "grade": "小班",
        "student_count": 30
      }
    ]
  }
}
```

---

### 5. 家长相关接口

#### 5.1 获取家长的孩子列表

**接口**: `GET /parent/children`

**描述**: 获取当前登录家长的孩子列表

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "student_id": 1001,
        "name": "小明",
        "class_id": 1,
        "class_name": "小一班",
        "relation": "父亲",
        "is_primary": 1
      }
    ]
  }
}
```

---

#### 5.2 获取家长孩子今日接送状态

**接口**: `GET /parent/children/today-status`

**描述**: 获取家长所有孩子今日的接送状态（家长端首页使用）

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "student_id": 1001,
        "name": "小明",
        "class_id": 1,
        "class_name": "小一班",
        "checkin_status": 2,
        "checkin_time": "2024-01-01 17:00:00",
        "picker_name": "张三",
        "picker_relation": "父亲"
      },
      {
        "student_id": 1002,
        "name": "小红",
        "class_id": 2,
        "class_name": "小二班",
        "checkin_status": 1,
        "checkin_time": "2024-01-01 08:30:00",
        "picker_name": "李四",
        "picker_relation": "母亲"
      }
    ]
  }
}
```

> checkin_status: 0-未到达, 1-在园, 2-已接走

---

### 6. 统计接口

#### 6.1 班级签到统计

**接口**: `GET /stats/class/{class_id}/daily`

**描述**: 获取班级每日签到统计

**请求参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| date | string | 否 | 日期, 默认当日 |

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "class_id": 1,
    "class_name": "小一班",
    "date": "2024-01-01",
    "total_students": 30,
    "checkin_stats": {
      "morning": {
        "checked_in": 28,
        "not_checked_in": 2,
        "checkin_rate": 93.33
      },
      "evening": {
        "checked_in": 25,
        "not_checked_in": 5,
        "checkin_rate": 83.33
      }
    }
  }
}
```

## 四、业务流程说明

### 扫码签到流程
1. 家长打开APP，选择孩子
2. 扫描班级二维码
3. 系统验证:
   - 班级二维码有效性
   - 家长与学生的关系
   - 如为临时接送人，验证授权有效性
4. 记录签到信息
5. 实时推送给老师端

### 临时接送人授权流程
1. 家长在APP填写临时接送人信息，上传身份证照片
2. 提交申请，状态为"待审核"
3. 老师收到审核通知
4. 老师核对身份证信息后审核通过/拒绝
5. 审核通过后，临时接送人可在授权时间内扫码签到

### 老师端实时查看流程
1. 老师进入班级签到页面
2. 系统显示班级学生列表及签到状态
3. 新的签到实时更新页面
4. 可查看未签到学生列表
