from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.openapi.utils import get_openapi
from sqlalchemy import or_
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional

from database import (
    get_db,
    init_db,
    SessionLocal,
    Visitor,
    retry_db_write,
    Blacklist,
    WebhookConfig,
    WebhookLog,
)
from auth import (
    authenticate_user,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    get_current_user,
    create_default_user,
)
from schemas import (
    VisitorCreate,
    VisitorResponse,
    VisitorStatus,
    Token,
    BlacklistCreate,
    BlacklistResponse,
    WebhookConfigCreate,
    WebhookConfigResponse,
    WebhookLogResponse,
    VISITOR_STATUS_DESC,
)
from utils import (
    process_photo,
    check_blacklist,
    send_webhook_notification,
    retry_failed_webhooks,
)

VISITOR_STATE_MACHINE_DESC = """
## 访客状态机说明

访客记录有三种状态，由系统自动计算：

| 状态 | 枚举值 | 说明 | 转换条件 |
|------|--------|------|----------|
| 已登记 | `registered` | 访客已登记，正在小区内 | 登记成功后默认状态 |
| 超时未离 | `overdue` | 访客超过预计停留时间仍未签离 | 当前时间 > check_in_time + estimated_stay |
| 已签离 | `checked_out` | 访客已离开小区 | PATCH /visitors/{id}/checkout |

### 状态流转图
```
registered ──(超过预计时间)─→ overdue
     │                            │
     └────────(签离)───────────→ checked_out
                                  ↑
overdue ────────(签离)────────────┘
```

> **注意**：状态字段 `status` 为计算字段，每次查询时根据当前时间自动推导。
"""

WEBHOOK_RETRY_DESC = """
## Webhook 重试策略

系统支持为每户配置独立的 Webhook URL，当访客登记成功后，将向业主推送「您的访客已到」通知。

### 重试配置参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `max_retries` | int | 3 | 最大重试次数（含首次尝试） |
| `retry_delay_seconds` | int | 60 | 首次重试间隔（秒），后续按 **指数退避** 递增 |

### 指数退避算法

第 N 次重试的等待间隔 = `retry_delay_seconds` × 2^(N-1)

**示例**（retry_delay_seconds=60, max_retries=3）：
- 第 1 次（首次）：立即发送
- 第 2 次（重试1）：等待 60 × 2^0 = 60 秒
- 第 3 次（重试2）：等待 60 × 2^1 = 120 秒
- 总尝试次数用尽后标记为 `failed`，可通过 `/webhook-logs/retry` 手动触发重试

### 状态说明

| 状态 | 说明 |
|------|------|
| `pending` | 待发送，入队中 |
| `success` | 发送成功（HTTP 2xx） |
| `failed` | 发送失败，已达最大重试次数 |

### Webhook 推送 Payload

```json
{
  "event": "visitor_arrived",
  "room_number": "1-101",
  "visitor_name": "张三",
  "visitor_phone": "13800138000",
  "visitor_id": 123,
  "message": "您的访客 张三 已到",
  "timestamp": "2026-06-02T03:34:07.834740"
}
```
"""

app = FastAPI(
    title="小区门禁访客登记系统",
    version="1.0.0",
    description=(
        "## 概览\n"
        "小区门禁访客登记 API，支持访客登记、查询、签离，集成照片上传、黑名单拦截、业主 Webhook 通知。\n\n"
        "## 核心功能\n"
        "- **访客登记**：POST /visitors/register，支持 base64 照片上传\n"
        "- **当日列表**：GET /visitors/today，含跨午夜未签离访客\n"
        "- **访客签离**：PATCH /visitors/{id}/checkout\n"
        "- **黑名单管理**：手机号拦截，支持增删查\n"
        "- **Webhook 通知**：访客到达自动推送业主，支持指数退避重试\n\n"
        + VISITOR_STATE_MACHINE_DESC
        + "\n\n"
        + WEBHOOK_RETRY_DESC
        + "\n\n"
        "## 认证\n"
        "所有业务接口需携带 `Authorization: Bearer <JWT Token>`。\n"
        "默认账号：`security` / `sec123`（生产环境请修改！）\n"
    ),
)

tags_metadata = [
    {
        "name": "认证",
        "description": "获取 JWT 访问令牌",
    },
    {
        "name": "访客管理",
        "description": "访客登记、查询、签离。\n" + VISITOR_STATE_MACHINE_DESC,
    },
    {
        "name": "黑名单管理",
        "description": "手机号黑名单增删查，黑名单手机号登记时自动拦截",
    },
    {
        "name": "Webhook 配置",
        "description": "业主通知 Webhook 配置。\n" + WEBHOOK_RETRY_DESC,
    },
    {
        "name": "Webhook 日志",
        "description": "Webhook 推送日志查询与手动重试",
    },
]


@app.on_event("startup")
def startup_event():
    init_db()
    db = SessionLocal()
    create_default_user(db)
    db.close()


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
        tags=tags_metadata,
    )
    openapi_schema["components"]["schemas"]["VisitorStatus"] = {
        "type": "string",
        "enum": [s.value for s in VisitorStatus],
        "description": "访客状态枚举：" + "、".join(
            f"`{s.value}` - {VISITOR_STATUS_DESC[s.value]}" for s in VisitorStatus
        ),
    }
    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi


@app.post(
    "/token",
    response_model=Token,
    tags=["认证"],
    summary="获取访问令牌",
    description="使用用户名密码登录，获取 JWT 访问令牌。令牌有效期 8 小时。",
    responses={
        200: {"description": "登录成功，返回访问令牌"},
        401: {"description": "用户名或密码错误"},
    },
)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.post(
    "/visitors/register",
    response_model=VisitorResponse,
    tags=["访客管理"],
    summary="访客登记",
    description=(
        "登记新访客，记录姓名、手机号、被访户号、预计停留时间。\n\n"
        "**流程**：\n"
        "1. 校验手机号是否在黑名单 → 命中则 403 拒绝\n"
        "2. 处理 base64 照片（可选）→ 生成原图 + 200×200 缩略图存盘\n"
        "3. 写入访客记录（带写入重试）\n"
        "4. 异步触发 Webhook 通知业主（带指数退避重试）\n\n"
        "**状态**：登记后初始状态为 `registered`"
    ),
    responses={
        200: {"description": "登记成功，返回访客记录（含计算状态）"},
        400: {"description": "请求参数错误（手机号格式/照片格式）"},
        401: {"description": "未授权"},
        403: {"description": "手机号在黑名单中"},
        500: {"description": "数据库写入失败"},
    },
)
async def register_visitor(
    visitor: VisitorCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    blacklisted = check_blacklist(db, visitor.phone)
    if blacklisted:
        reason = blacklisted.reason or "无理由"
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"该手机号已被列入黑名单，拒绝访问。原因：{reason}"
        )

    photo_path = None
    thumbnail_path = None
    if visitor.photo_base64:
        try:
            photo_path, thumbnail_path = process_photo(visitor.photo_base64)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    def _do_register():
        db_visitor = Visitor(
            name=visitor.name,
            phone=visitor.phone,
            room_number=visitor.room_number,
            estimated_stay=visitor.estimated_stay,
            photo_path=photo_path,
            thumbnail_path=thumbnail_path,
        )
        db.add(db_visitor)
        db.commit()
        db.refresh(db_visitor)
        return db_visitor

    try:
        db_visitor = retry_db_write(_do_register)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="登记失败，请重试")

    await send_webhook_notification(
        db,
        room_number=visitor.room_number,
        visitor_name=visitor.name,
        visitor_phone=visitor.phone,
        visitor_id=db_visitor.id,
    )

    return db_visitor


@app.get(
    "/visitors/today",
    response_model=List[VisitorResponse],
    tags=["访客管理"],
    summary="查询当日访客列表",
    description=(
        "查询当日访客列表，自动包含 **跨午夜未签离** 的访客。\n\n"
        "**查询条件**（OR 逻辑）：\n"
        "- 登记时间 >= 今日零点\n"
        "- **或** `is_checked_out = false`（无论哪天登记，只要还没走就显示）\n\n"
        "每条记录包含自动计算的 `status` 字段，见状态机说明。"
    ),
    responses={
        200: {"description": "查询成功，返回访客列表（按登记时间倒序）"},
        401: {"description": "未授权"},
    },
)
def get_today_visitors(
    status_filter: Optional[VisitorStatus] = Query(
        None, description="按访客状态筛选"
    ),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    today = datetime.utcnow().date()
    today_start = datetime(today.year, today.month, today.day)
    query = db.query(Visitor).filter(
        or_(
            Visitor.check_in_time >= today_start,
            Visitor.is_checked_out == False,
        )
    )
    visitors = query.order_by(Visitor.check_in_time.desc()).all()

    if status_filter:
        visitors = [v for v in visitors if VisitorResponse.model_validate(v).status == status_filter]

    return visitors


@app.patch(
    "/visitors/{visitor_id}/checkout",
    response_model=VisitorResponse,
    tags=["访客管理"],
    summary="访客签离",
    description=(
        "访客离开时签离，记录签离时间并将状态置为 `checked_out`。\n\n"
        "**幂等性**：已签离的访客重复签离返回 400。"
    ),
    responses={
        200: {"description": "签离成功，状态变为 `checked_out`"},
        400: {"description": "该访客已签离"},
        401: {"description": "未授权"},
        404: {"description": "访客记录不存在"},
    },
)
def checkout_visitor(
    visitor_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    visitor = db.query(Visitor).filter(Visitor.id == visitor_id).first()
    if not visitor:
        raise HTTPException(status_code=404, detail="访客记录不存在")
    if visitor.is_checked_out:
        raise HTTPException(status_code=400, detail="该访客已签离")

    visitor.is_checked_out = True
    visitor.check_out_time = datetime.utcnow()
    db.commit()
    db.refresh(visitor)
    return visitor


@app.post(
    "/blacklist",
    response_model=BlacklistResponse,
    tags=["黑名单管理"],
    summary="添加黑名单",
    description="将手机号加入黑名单，后续该手机号登记时会被 403 拦截。",
    responses={
        200: {"description": "添加成功"},
        400: {"description": "该手机号已在黑名单中"},
        401: {"description": "未授权"},
        422: {"description": "手机号格式不正确"},
    },
)
def add_blacklist(
    item: BlacklistCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    existing = db.query(Blacklist).filter(Blacklist.phone == item.phone).first()
    if existing:
        raise HTTPException(status_code=400, detail="该手机号已在黑名单中")
    db_item = Blacklist(phone=item.phone, reason=item.reason)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@app.delete(
    "/blacklist/{phone}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["黑名单管理"],
    summary="移除黑名单",
    description="将手机号从黑名单中移除，移除后该手机号可正常登记。",
    responses={
        204: {"description": "删除成功"},
        401: {"description": "未授权"},
        404: {"description": "该手机号不在黑名单中"},
    },
)
def delete_blacklist(
    phone: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    item = db.query(Blacklist).filter(Blacklist.phone == phone).first()
    if not item:
        raise HTTPException(status_code=404, detail="该手机号不在黑名单中")
    db.delete(item)
    db.commit()


@app.get(
    "/blacklist",
    response_model=List[BlacklistResponse],
    tags=["黑名单管理"],
    summary="列出黑名单",
    description="列出所有黑名单手机号，按添加时间倒序排列。",
    responses={
        200: {"description": "查询成功"},
        401: {"description": "未授权"},
    },
)
def list_blacklist(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return db.query(Blacklist).order_by(Blacklist.created_at.desc()).all()


@app.post(
    "/webhook-config",
    response_model=WebhookConfigResponse,
    tags=["Webhook 配置"],
    summary="创建/更新 Webhook 配置",
    description=(
        "为指定户号配置 Webhook URL 和重试策略。\n\n"
        "**幂等性**：同户号重复调用会更新配置（含重试参数）。\n\n"
        + WEBHOOK_RETRY_DESC
    ),
    responses={
        200: {"description": "配置成功"},
        401: {"description": "未授权"},
    },
)
def create_webhook_config(
    config: WebhookConfigCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    existing = db.query(WebhookConfig).filter(
        WebhookConfig.room_number == config.room_number
    ).first()
    if existing:
        existing.webhook_url = config.webhook_url
        existing.max_retries = config.max_retries or 3
        existing.retry_delay_seconds = config.retry_delay_seconds or 60
        db.commit()
        db.refresh(existing)
        return existing
    db_config = WebhookConfig(
        room_number=config.room_number,
        webhook_url=config.webhook_url,
        max_retries=config.max_retries or 3,
        retry_delay_seconds=config.retry_delay_seconds or 60,
    )
    db.add(db_config)
    db.commit()
    db.refresh(db_config)
    return db_config


@app.get(
    "/webhook-config",
    response_model=List[WebhookConfigResponse],
    tags=["Webhook 配置"],
    summary="列出 Webhook 配置",
    description="列出所有户号的 Webhook 配置，含重试参数。",
    responses={
        200: {"description": "查询成功"},
        401: {"description": "未授权"},
    },
)
def list_webhook_configs(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return db.query(WebhookConfig).order_by(WebhookConfig.created_at.desc()).all()


@app.delete(
    "/webhook-config/{room_number}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Webhook 配置"],
    summary="删除 Webhook 配置",
    description="删除指定户号的 Webhook 配置，删除后该户号不再接收通知。",
    responses={
        204: {"description": "删除成功"},
        401: {"description": "未授权"},
        404: {"description": "Webhook 配置不存在"},
    },
)
def delete_webhook_config(
    room_number: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    config = db.query(WebhookConfig).filter(
        WebhookConfig.room_number == room_number
    ).first()
    if not config:
        raise HTTPException(status_code=404, detail="Webhook 配置不存在")
    db.delete(config)
    db.commit()


@app.get(
    "/webhook-logs",
    response_model=List[WebhookLogResponse],
    tags=["Webhook 日志"],
    summary="查询 Webhook 推送日志",
    description="查询 Webhook 推送历史记录，含状态、重试次数、错误信息。",
    responses={
        200: {"description": "查询成功"},
        401: {"description": "未授权"},
    },
)
def list_webhook_logs(
    status: Optional[str] = Query(None, description="按状态筛选：pending/success/failed"),
    room_number: Optional[str] = Query(None, description="按户号筛选"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    query = db.query(WebhookLog)
    if status:
        query = query.filter(WebhookLog.status == status)
    if room_number:
        query = query.filter(WebhookLog.room_number == room_number)
    return query.order_by(WebhookLog.created_at.desc()).all()


@app.post(
    "/webhook-logs/retry",
    tags=["Webhook 日志"],
    summary="手动重试失败的 Webhook",
    description="手动触发最近 24 小时内失败且未达最大重试次数的 Webhook 重新推送。",
    responses={
        200: {"description": "重试任务已触发，返回触发的日志数量"},
        401: {"description": "未授权"},
    },
)
async def retry_webhook_logs(
    hours: int = Query(24, description="重试过去多少小时内的失败记录"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    count = await retry_failed_webhooks(db, hours=hours)
    return {"retried": count}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
