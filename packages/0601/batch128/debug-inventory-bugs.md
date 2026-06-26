# Debug Session: inventory-bugs
- **Status**: [OPEN]
- **Issue**: 1) 并发出库库存数量对不上；2) 搜索「高白泥」找不到「高白泥（25kg）」
- **Debug Server**: http://127.0.0.1:<port>/event
- **Log File**: .dbg/trae-debug-log-inventory-bugs.ndjson

## Reproduction Steps

**Bug 1 - 并发出库:**
1. 新增物料「测试泥」，初始库存10
2. 开两个窗口同时选中「测试泥」，各出库3
3. 预期剩余库存4，实际可能不是

**Bug 2 - 搜索匹配:**
1. 新增物料「高白泥（25kg）」
2. 搜索框输入「高白泥」
3. 预期能搜到，实际搜不到

## Hypotheses & Verification

| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | add_transaction 中 SELECT + UPDATE 非原子操作，导致并发更新丢失 | High | Low | **Confirmed** |
| B | SQLite 默认事务隔离级别导致读脏数据或不可重复读 | High | Low | **Confirmed** |
| C | 搜索时 LIKE '%高白泥%' 匹配不到带括号的中文内容 | Medium | Low | Rejected |
| D | 搜索输入的编码或空格问题导致匹配失败 | Low | Low | **Confirmed** |
| E | 两个窗口使用不同的数据库连接，事务未及时提交 | Medium | Low | Confirmed |

## Log Evidence

**Bug 1 - 并发丢失更新 (Confirmed Hypothesis A + B + E):
```
[1780323183202] PID=16738 进入 add_transaction (出库3)
[1780323183202] PID=16739 进入 add_transaction (出库3)
[1780323183203] PID=16738 SELECT 读到 current_qty = 10.0
[1780323183203] PID=16739 SELECT 读到 current_qty = 10.0  ← 丢失更新开始: 两个进程都读到10
[1780323183206] PID=16738 计算 new_qty = 7.0
[1780323183207] PID=16739 计算 new_qty = 7.0  ← 都只减了一次
[1780323183209] PID=16738 提交 UPDATE → 7.0
[1780323183212] PID=16739 提交 UPDATE → 7.0  ← 覆盖前一次更新!
结果: 10 - 3 - 3 = 7 (应为 4 ❌
```

**Bug 2 - 搜索空格问题 (Confirmed Hypothesis D):
```
搜索 '高白泥' → ✓ 找到 '高白泥（25kg）
搜索 '高白泥 ' → ✗ 无结果 (末尾空格导致匹配失败)
搜索 ' 高白泥' → ✗ 无结果 (开头空格导致匹配失败)
```

## Root Cause Summary:
1. **并发**: `add_transaction` 使用 SELECT + UPDATE 非原子操作，在默认隔离级别下，两个独立进程读取相同值，后写入者覆盖前者。
2. **搜索**: `search_materials` 未对搜索关键词进行 `strip()`，导致首尾空格时 LIKE 匹配失败。

## Verification Conclusion

[Pre-fix vs post-fix comparison will be added here]
