# 民宿电子发票申请系统 - 组件文档

## 目录

1. [字段映射关系](#字段映射关系)
2. [iOS 微信端布局适配方案](#ios-微信端布局适配方案)

---

## 字段映射关系

### 前端表单字段 → Backend `InvoiceRequest` DTO

#### 字段映射表

| 前端表单字段 | 类型 | 条件 | Backend DTO 字段 | 说明 |
|-------------|------|------|-----------------|------|
| `titleType` | `'personal' \| 'enterprise'` | 必填 | `titleType` | 抬头类型：个人/企业 |
| `invoiceType` | `'normal' \| 'special'` | 必填 | `invoiceType` | 发票类型：普票/专票 |
| `taxId` | `string` | 企业抬头时必填 | `taxId?` | 18位统一社会信用代码 |
| `bankName` | `string` | 企业专票时必填 | `bankName?` | 开户银行名称 |
| `bankAccount` | `string` | 企业专票时必填 | `bankAccount?` | 银行账号 |
| `email` | `string` | 必填 | `email` | 接收发票的邮箱 |
| `orderId` | `string` | 必填 | `orderId` | 入住订单 ID |
| `amount` | `number` | 必填 | `amount` | 开票金额（从订单同步） |

#### 数据流转图

```
前端表单填写
    ↓
VeeValidate 校验（Yup Schema）
    ↓
handleSubmit 收集数据
    ↓
条件过滤（根据 titleType 和 invoiceType）
    ↓
submitInvoice API 调用
    ↓
Backend InvoiceRequest DTO
```

#### 条件校验规则

```typescript
// 企业抬头时：税号必填
// 企业专票时：开户银行 + 银行账号 额外必填
const schema = yup.object({
  titleType: yup.string().oneOf(['personal', 'enterprise']).required(),
  invoiceType: yup.string().oneOf(['normal', 'special']).required(),
  taxId: yup
    .string()
    .when('titleType', {
      is: 'enterprise',
      then: (s) => s.required().length(18).matches(TAX_ID_REGEX),
      otherwise: (s) => s.notRequired(),
    }),
  bankName: yup
    .string()
    .when(['titleType', 'invoiceType'], {
      is: (t, i) => t === 'enterprise' && i === 'special',
      then: (s) => s.required(),
      otherwise: (s) => s.notRequired(),
    }),
  // ...
})
```

#### Backend DTO 定义

```typescript
// src/types/index.ts
export interface InvoiceRequest {
  titleType: 'personal' | 'enterprise'
  invoiceType: 'normal' | 'special'
  taxId?: string           // 企业抬头时存在
  bankName?: string        // 企业专票时存在
  bankAccount?: string     // 企业专票时存在
  email: string
  orderId: string
  amount: number
}

export interface InvoiceResponse {
  success: boolean
  message: string
  estimatedDays: string
  applicationNo: string
  pdfUrl: string
}
```

---

## iOS 微信端布局适配方案

### 问题描述

在 iOS 微信内置浏览器中，存在两个典型布局问题：

1. **键盘顶飞输入框**：弹出键盘时，输入框被键盘遮挡或滚动位置不正确
2. **Fixed 底部按钮遮挡**：`position: fixed` 的按钮被底部安全区域或微信导航栏遮挡

---

### 解决方案 1：键盘顶飞输入框

#### 核心思路

输入框聚焦时，使用 `scrollIntoView()` 配合延迟执行，确保键盘弹出后输入框在可视区域内。

#### 实现代码

**Composable: `src/composables/useInputScroll.ts`**

```typescript
export function useInputScroll() {
  const scrollIntoView = (el: HTMLElement | null, delay = 300) => {
    if (!el) return
    setTimeout(() => {
      el.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      })
    }, delay)
  }
  return { scrollIntoView }
}
```

**组件使用示例**

```vue
<script setup lang="ts">
import { useInputScroll } from '@/composables/useInputScroll'

const { scrollIntoView } = useInputScroll()
const taxIdInputRef = ref<HTMLInputElement | null>(null)

const onTaxIdFocus = () => {
  scrollIntoView(taxIdInputRef.value, 300)
}
</script>

<template>
  <input
    ref="taxIdInputRef"
    type="text"
    @focus="onTaxIdFocus"
  />
</template>
```

#### CSS 辅助

```css
/* src/style.css */
html {
  scroll-padding-bottom: 300px; /* 预留键盘空间 */
}
```

#### 关键点

| 参数 | 值 | 说明 |
|------|----|------|
| 延迟时间 | `300ms` | 等待 iOS 键盘完全弹出 |
| 滚动行为 | `smooth` | 平滑滚动体验 |
| 垂直对齐 | `center` | 输入框居中于可视区域 |

---

### 解决方案 2：Fixed 底部按钮遮挡

#### 核心思路

不使用 `position: fixed`，改为流式布局 + 安全区域内边距。

#### 实现代码

**全局样式: `src/style.css`**

```css
.safe-bottom {
  padding-bottom: calc(env(safe-area-inset-bottom) + 1rem);
}
```

**HTML Viewport**

```html
<!-- index.html -->
<meta name="viewport" 
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
```

**页面布局结构**

```vue
<template>
  <div class="min-h-screen bg-inn-cream">
    <header>...</header>
    
    <main class="safe-bottom">
      <form>
        <!-- 表单内容 -->
        
        <!-- 提交按钮在表单底部，流式布局 -->
        <button type="submit">
          提交申请
        </button>
      </form>
    </main>
  </div>
</template>
```

#### 对比：Fixed vs 流式布局

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| `position: fixed` | 按钮始终可见 | 易被安全区域遮挡 | 短表单 |
| 流式布局 + `safe-bottom` | 安全无遮挡，适配所有设备 | 按钮需要滚动才能看到 | 长表单，微信/移动端 |

---

### 其他 iOS 适配细节

#### 1. 点击高亮移除

```css
* {
  -webkit-tap-highlight-color: transparent;
}
```

#### 2. 输入框默认样式重置

```css
input, select, textarea {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
}
```

#### 3. 输入框属性配置

```vue
<input
  autocapitalize="off"      <!-- 关闭自动大写 -->
  autocorrect="off"        <!-- 关闭自动纠错 -->
  spellcheck="false"       <!-- 关闭拼写检查 -->
  inputmode="text"         <!-- 税号使用文本键盘 -->
/>
```

---

### 验证清单

部署到 iOS 微信端前，请验证以下项：

- [ ] 点击税号输入框，键盘弹出后输入框可见
- [ ] 点击邮箱输入框，键盘弹出后输入框可见
- [ ] 滑动到底部，提交按钮完整可见
- [ ] 底部安全区域（iPhone X+）有适当间距
- [ ] 输入框无黑色点击高亮
- [ ] 输入框无 iOS 默认圆角阴影

---

## 参考文件

| 功能 | 文件路径 |
|------|----------|
| 表单页面 | [InvoiceForm.vue](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0601/batch157/src/pages/InvoiceForm.vue) |
| 滚动 Composable | [useInputScroll.ts](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0601/batch157/src/composables/useInputScroll.ts) |
| 全局样式 | [style.css](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0601/batch157/src/style.css) |
| 类型定义 | [types/index.ts](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0601/batch157/src/types/index.ts) |
| 校验规则 | [utils/validation.ts](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0601/batch157/src/utils/validation.ts) |
