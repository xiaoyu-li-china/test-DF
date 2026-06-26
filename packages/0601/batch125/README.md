# 幼儿园接送实名签到系统

## 项目概述

本系统为幼儿园提供实名制接送签到功能，支持家长扫码签到、老师实时查看签到状态、临时接送人授权管理等核心功能。

## 技术栈

- **后端框架**: Node.js + Express
- **数据库**: MySQL 8.0+
- **ORM**: Sequelize
- **认证**: JWT
- **日期处理**: Day.js

## 数据库设计

系统包含以下核心数据表：

| 表名 | 说明 |
|------|------|
| `kindergartens` | 园所表 |
| `classes` | 班级表 |
| `teachers` | 老师表 |
| `parents` | 家长表 |
| `students` | 学生表 |
| `temp_authorizations` | 临时接送人授权表 |
| `checkin_records` | 签到记录表 |

完整数据库脚本: [schema.sql](database/schema.sql)

## API 接口

### 签到相关

| 接口 | 方法 | 说明 | 角色 |
|------|------|------|------|
| `/api/v1/checkin/scan` | POST | 扫码签到 | 家长 |
| `/api/v1/checkin/manual` | POST | 手动补签 | 老师 |
| `/api/v1/checkin/class/{class_id}/today` | GET | 班级当日签到状态 | 老师 |
| `/api/v1/checkin/student/{student_id}/records` | GET | 学生签到记录 | 家长/老师 |

### 临时接送人授权

| 接口 | 方法 | 说明 | 角色 |
|------|------|------|------|
| `/api/v1/authorization/temp` | POST | 提交授权申请 | 家长 |
| `/api/v1/authorization/{id}/review` | POST | 审核授权 | 老师 |
| `/api/v1/authorization/list` | GET | 授权列表 | 家长/老师 |
| `/api/v1/authorization/student/{id}/valid` | GET | 有效授权查询 | 家长/老师 |

完整API文档: [api-design.md](docs/api-design.md)

## 快速开始

### 1. 环境配置

复制环境配置文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置数据库连接信息：

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=kindergarten_checkin
DB_USER=root
DB_PASSWORD=your_password
```

### 2. 初始化数据库

创建数据库并执行初始化脚本：

```bash
mysql -u root -p
CREATE DATABASE kindergarten_checkin CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. 安装依赖

```bash
npm install
```

### 4. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

服务启动后访问: `http://localhost:3000/api/v1/health`

## 项目结构

```
batch125/
├── src/
│   ├── app.js                    # 应用入口
│   ├── config/
│   │   └── database.js          # 数据库配置
│   ├── controllers/              # 控制器
│   │   ├── checkinController.js
│   │   ├── authorizationController.js
│   │   ├── classController.js
│   │   └── parentController.js
│   ├── middleware/               # 中间件
│   │   ├── auth.js
│   │   └── errorHandler.js
│   ├── models/                   # 数据模型
│   │   ├── index.js
│   │   ├── Kindergarten.js
│   │   ├── Class.js
│   │   ├── Teacher.js
│   │   ├── Parent.js
│   │   ├── Student.js
│   │   ├── TempAuthorization.js
│   │   └── CheckinRecord.js
│   ├── routes/                   # 路由
│   │   ├── checkinRoutes.js
│   │   ├── authorizationRoutes.js
│   │   ├── classRoutes.js
│   │   └── parentRoutes.js
│   └── utils/                    # 工具函数
│       └── response.js
├── database/
│   └── schema.sql               # 数据库脚本
├── docs/
│   └── api-design.md            # API文档
├── package.json
└── .env.example
```

## 核心业务流程

### 扫码签到流程
1. 家长选择要接送的孩子
2. 扫描班级门口的二维码
3. 系统验证家长/临时接送人身份
4. 记录签到信息并生成签到序号
5. 实时推送给老师端

### 临时接送人授权流程
1. 家长填写临时接送人信息并上传身份证
2. 提交申请，状态为"待审核"
3. 老师收到通知并核对身份信息
4. 审核通过后，临时接送人可在有效期内签到
