# nightstock - 夜市摆摊库存管理 CLI

夜市摆摊进货、销售、库存、毛利、盘点、周报一站式管理。数据存储在本地 SQLite。

## 快速开始

```bash
pip install -e .

# 短命令 ns
ns buy 烤肠 50 1.5 -s 批发市场
ns sell 烤肠 20 5.0
ns stock
ns profit
```

## 命令清单

| 命令 | 功能 |
|------|------|
| `ns buy 品名 数量 单价 [-s 供应商] [--stall-id ID]` | 进货 |
| `ns sell 品名 数量 售价 [--stall-id ID]` | 销售 |
| `ns stock [--export csv] [--stall-id ID]` | 查库存 |
| `ns profit [-d YYYY-MM-DD] [--export csv] [--stall-id ID]` | 查毛利 |
| `ns buys [-d 日期] [--export csv] [--stall-id ID]` | 查进货记录 |
| `ns sells [-d 日期] [--export csv] [--stall-id ID]` | 查销售记录 |
| `ns check [-i / -n x -a y] [--stall-id ID]` | 收摊盘点 |
| `ns ocr 小票.jpg [-y]` | 小票 OCR 识别进货 |
| `ns report [--webhook URL] [--save] [--dry-run]` | 企业微信周报 |

## SQLite 表结构

数据库文件: `~/.nightstock/inventory.db`

### 进货表 `purchases`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER PK | 自增主键 |
| `name` | TEXT | 品名 |
| `quantity` | INTEGER | 进货数量 |
| `price` | REAL | 进货单价 |
| `supplier` | TEXT | 供应商 |
| `stall_id` | TEXT | 摊位 ID（默认 "default"） |
| `date` | TEXT | 日期 `YYYY-MM-DD` |
| `created_at` | TEXT | 创建时间 ISO |

### 销售表 `sales`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER PK | 自增主键 |
| `name` | TEXT | 品名 |
| `quantity` | INTEGER | 销售数量 |
| `price` | REAL | 销售单价 |
| `cost_price` | REAL | 记录时的平均成本价 |
| `stall_id` | TEXT | 摊位 ID |
| `date` | TEXT | 日期 |
| `created_at` | TEXT | 创建时间 |

### 盘点表 `stock_check`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER PK | 自增主键 |
| `name` | TEXT | 品名 |
| `expected_qty` | INTEGER | 账面库存 |
| `actual_qty` | INTEGER | 实盘数量 |
| `diff_qty` | INTEGER | 差异（实盘-账面） |
| `stall_id` | TEXT | 摊位 ID |
| `date` | TEXT | 日期 |
| `created_at` | TEXT | 创建时间 |

## 毛利计算逻辑

### 成本价：加权平均法

每次进货后，该品名的平均成本价重新计算：

```
avg_cost = Σ(进货数量 × 进货单价) / Σ(进货数量)
```

代码见 [db.py get_avg_cost_price](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0601/batch149/nightstock/db.py#L96-L107)。

### 销售时锁成本

`ns sell` 调用时，会**即时**查询当前该品名的平均成本价并写入 `sales.cost_price` 字段：

```python
# add_sale 函数
cost_price = get_avg_cost_price(name)  # 记录当前的平均成本
cursor.execute(
    "INSERT INTO sales (..., cost_price, ...) VALUES (..., ?, ...)",
    (..., cost_price, ...)
)
```

代码见 [db.py add_sale](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0601/batch149/nightstock/db.py#L62-L80)。

**为什么锁成本？**
- 后续再进货会拉高/拉低成本，但已完成销售的毛利不受影响
- 历史毛利查询结果稳定，不会因新进货而变化

### 毛利公式

```
单条销售毛利 = 销售数量 × (售价 - cost_price)
单日总毛利 = Σ(所有销售毛利)
```

代码见 [db.py get_profit](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0601/batch149/nightstock/db.py#L138-L164)。

### 示例

| 操作 | 库存变化 | 平均成本 |
|------|----------|----------|
| buy 烤肠 50 1.5 | 50 | 1.50 |
| buy 烤肠 30 2.0 | 80 | (50×1.5+30×2.0)/80 = **1.6875** |
| sell 烤肠 20 5.0 | 60 | 锁 cost_price = 1.6875 |

该条销售毛利 = 20 × (5.0 - 1.6875) = **¥66.25**

## 多摊位 `--stall-id`

支持多个摊位独立记账，数据按 `stall_id` 隔离。

```bash
# 东门摊位进货
ns buy 烤肠 100 1.5 --stall-id east

# 西门摊位进货
ns buy 烤肠 80 1.4 --stall-id west

# 查东门库存
ns stock --stall-id east

# 查西门今日毛利
ns profit --stall-id west

# 东门盘点
ns check -i --stall-id east
```

不指定 `--stall-id` 时，默认使用 `default` 摊位。

## 周报推送企业微信

```bash
# 保存 Webhook
ns report --webhook https://qyapi.weixin.qq.com/cgi-bin/webhook/xxx --save

# 预览周报
ns report --dry-run

# 推送
ns report
```

## 小票 OCR（可选）

```bash
pip install nightstock[ocr]

# 识别并录入
ns ocr 进货小票.jpg -y -s 批发市场
```

## CSV 导出

所有查询命令支持 `--export csv`，CSV 带 UTF-8 BOM，Excel 打开中文不乱码。

```bash
ns stock --export csv
ns profit --export csv
```

## 测试

```bash
python3 -m pytest tests/ -v
```
