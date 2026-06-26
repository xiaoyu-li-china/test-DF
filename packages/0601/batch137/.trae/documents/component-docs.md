# 组件开发文档

## 一、日历组件禁用规则配置

### 1.1 当前实现

[CalendarPicker.vue](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0601/batch137/src/components/CalendarPicker.vue) 目前实现了两种禁用规则：

| 禁用类型 | 实现位置 | 逻辑 |
|---------|---------|------|
| 过去日期 | [CalendarPicker.vue#L44](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0601/batch137/src/components/CalendarPicker.vue#L44-L49) | `dateStr < formatDate(today)` |
| 非当前月日期 | [CalendarPicker.vue#L30-L37](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0601/batch137/src/components/CalendarPicker.vue#L30-L37) | 上下月填充日期标记为 `isCurrentMonth: false` |

禁用视觉效果：`text-ivory-300 cursor-not-allowed`

### 1.2 配置方式

#### 方案 A：通过 `disabledDates` Prop 扩展（推荐）

```typescript
// CalendarPicker.vue - Props 扩展
const props = defineProps<{
  modelValue: string | null
  // 新增：完全禁用的日期列表（如调音师休息日）
  disabledDates?: string[]
  // 新增：自定义禁用判断函数
  isDateDisabled?: (date: string) => boolean
}>()
```

使用方式：
```vue
<CalendarPicker
  v-model="selectedDate"
  :disabled-dates="['2026-06-18', '2026-06-19']"  <!-- 固定休息日 -->
  :is-date-disabled="(d) => isRestDay(d)"           <!-- 动态规则 -->
/>
```

#### 方案 B：从后端 API 拉取禁用日期

```typescript
// composables/useDisabledDates.ts
export function useDisabledDates() {
  const disabledDates = ref<string[]>([])
  const restDays = ref<string[]>([])

  async function fetchDisabledDates(month: string) {
    const resp = await fetch(`/api/tuner/disabled-dates?month=${month}`)
    const data = await resp.json()
    disabledDates.value = data.bookedDates    // 已被预约满的日期
    restDays.value = data.restDays           // 调音师休息日
  }

  return { disabledDates, restDays, fetchDisabledDates }
}
```

在 `CalendarPicker.vue` 中集成：
```typescript
const isDateDisabled = (dateStr: string): boolean => {
  // 1. 过去日期
  if (dateStr < todayStr) return true
  // 2. 调音师休息日
  if (props.disabledDates?.includes(dateStr)) return true
  // 3. 自定义规则
  if (props.isDateDisabled?.(dateStr)) return true
  return false
}
```

### 1.3 完整的日期状态层级

优先级从高到低：
```
过去日期 → 调音师休息日 → 已约满日期 → 可选日期
```

视觉状态对应：
| 状态 | 样式 |
|------|------|
| 可选 | `hover:bg-gold-50 text-navy-300` |
| 今天 | `ring-2 ring-gold-400` |
| 已选中 | `bg-navy-500 text-white` |
| 已约满 | `text-red-300 bg-red-50/30` |
| 休息日 | `text-ivory-300` + 🎵 emoji |
| 过去日期 | `text-ivory-300 line-through` |

---

## 二、接入真实 API 时 Optimistic UI 注意事项

### 2.1 什么是 Optimistic UI

在网络请求发出后**立即**更新 UI 显示「成功状态」，而不等待服务器响应。如果请求失败，再回滚状态并显示错误。

**适用场景**：
- 预约提交（显示「预约成功」而不等响应）
- 改期操作（立即显示新日期）
- 时段占用状态（点击后立即置灰）

### 2.2 关键注意事项

#### 1. 状态回滚机制

```typescript
// 反例：无回滚
const submit = async () => {
  isSubmitting.value = true
  await api.submitAppointment(data) // 失败了用户就一直看到加载态
  isSubmitting.value = false
}
```

```typescript
// 正例：完整的 optimistic 更新
const submit = async () => {
  // 1. 保存旧状态用于回滚
  const prevSlotId = selectedSlotId.value
  const prevDate = selectedDate.value

  try {
    // 2. Optimistic 更新 UI
    selectedSlotId.value = newSlotId
    showSuccessToast('预约提交中...')

    // 3. 发请求
    await api.submitAppointment(data)

    // 4. 请求成功，显示最终状态
    showSuccessToast('预约成功！')
    router.push(`/confirmation?id=${resp.id}`)
  } catch (err) {
    // 5. 请求失败，回滚状态
    selectedSlotId.value = prevSlotId
    selectedDate.value = prevDate

    // 6. 显示错误，提供重试选项
    showErrorToast('提交失败，请重试', {
      action: { label: '重试', onClick: () => submit() }
    })
  }
}
```

#### 2.2 幂等性处理

**问题**：用户快速点击提交 → 重复请求 → 重复预约

**解决方案**：
1. 生成客户端唯一的 `requestId`（UUID），后端做幂等校验
2. 第一次点击后立即禁用按钮（`isSubmitting` 锁）

```typescript
// mockApi.ts 扩展
const processedRequests = new Set<string>()

export function submitAppointment(req: AppointmentRequest, requestId?: string) {
  if (requestId && processedRequests.has(requestId)) {
    // 返回缓存的成功响应
    return cachedResponses[requestId]
  }
  if (requestId) processedRequests.add(requestId)
  // ... 处理逻辑
}
```

#### 2.3 时段冲突处理

**问题**：Optimistic 标记了时段为已占用，但实际请求失败

```typescript
// 推荐使用可组合函数封装状态管理
function useSlotBooking() {
  const optimisticallyBookedSlots = ref<Set<string>>(new Set())

  async function bookSlot(date: string, slotId: string, requestFn: () => Promise<any>) {
    const key = `${date}:${slotId}`
    optimisticallyBookedSlots.value.add(key)

    try {
      return await requestFn()
    } finally {
      optimisticallyBookedSlots.value.delete(key)
    }
  }

  const isSlotOptimisticallyBooked = (date: string, slotId: string) => {
    return optimisticallyBookedSlots.value.has(`${date}:${slotId}`)
  }

  return { bookSlot, isSlotOptimisticallyBooked }
}
```

#### 2.4 错误边界与重试策略

| 错误类型 | 处理方式 |
|---------|---------|
| 网络超时 | 自动重试 2 次，间隔 1s，最后失败显示错误 |
| 4xx 客户端错误 | 立即回滚，显示具体错误（如「该时段已被预约」） |
| 5xx 服务端错误 | 回滚 + 重试按钮 + 保留表单数据 |
| 时段冲突（409） | 自动刷新可用时段，显示「该时段已被抢订，请选择其他时段」 |

```typescript
// 重试逻辑示例
const submitWithRetry = async (retries = 2, delay = 1000) => {
  try {
    return await submitAppointment(data)
  } catch (err) {
    if (retries > 0 && isNetworkError(err)) {
      await new Promise(r => setTimeout(r, delay))
      return submitWithRetry(retries - 1, delay * 2)
    }
    throw err
  }
}
```

#### 2.5 与后端同步

Optimistic UI 不等于不同步。在以下时机需要拉取最新数据：
- 页面切换回前台（`visibilitychange` 事件）
- 每 5 分钟轮询一次可用时段（非活跃用户降低频率）
- 任何失败后立即刷新相关数据

```typescript
onMounted(() => {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      refreshSlots()  // 回到前台时刷新
    }
  })
})
```

#### 2.6 避免过度 Optimistic

**不适合 Optimistic 的操作**：
- 短信验证码发送（必须等响应才能显示倒计时）
- 支付相关操作
- 改期时的原时段释放（必须等后端确认才能释放）

**适合 Optimistic 的操作**：
- 时段选择状态
- 照片上传进度显示
- 提交按钮状态
- 预约成功后的确认页跳转（可先跳转再异步同步）

---

## 三、完整测试覆盖

现有测试用例覆盖了核心逻辑：
- [time-slot-conflict.test.ts](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0601/batch137/tests/time-slot-conflict.test.ts) - 5 个测试，验证时段冲突逻辑
- [appointment-id-unique.test.ts](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0601/batch137/tests/appointment-id-unique.test.ts) - 7 个测试，验证预约号唯一性
- [form-validation.test.ts](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0601/batch137/tests/form-validation.test.ts) - 45 个测试，验证表单校验和 mock fetch

接入真实 API 后，建议新增以下测试：
1. Optimistic 回滚逻辑测试
2. 并发请求/竞态条件测试
3. 网络异常重试测试
4. 日期禁用规则测试
