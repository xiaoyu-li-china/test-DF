---
title: "深入理解 Next.js 14 App Router"
date: "2024-12-01"
author: "张三"
excerpt: "Next.js 14 引入了全新的 App Router，带来了服务端组件、流式渲染和增量静态再生等强大特性。"
---

## 什么是 App Router？

Next.js 14 的 App Router 是基于 React Server Components 架构构建的新路由系统。它使用文件系统路由，`app` 目录下的每个文件夹代表一个路由段。

### 核心概念

1. **服务端组件（Server Components）**：默认所有组件都是服务端组件，只在服务器上渲染，不会发送 JavaScript 到客户端
2. **客户端组件（Client Components）**：通过 `'use client'` 指令声明，会在客户端进行水合（hydration）
3. **布局（Layouts）**：跨路由共享的 UI，不会在导航时重新渲染
4. **加载状态（Loading）**：内置的 Suspense 集成，提供即时加载状态

## 服务端组件 vs 客户端组件

| 特性 | 服务端组件 | 客户端组件 |
|------|-----------|-----------|
| 获取数据 | ✅ | ❌ |
| 访问后端资源 | ✅ | ❌ |
| 交互（onClick等） | ❌ | ✅ |
| 使用 useState/useEffect | ❌ | ✅ |
| bundle 大小 | 更小 | 更大 |

## 最佳实践

- 将交互逻辑下沉到叶子组件，让父组件保持为服务端组件
- 使用组合模式：服务端组件作为容器，客户端组件负责交互
- 通过 props 从服务端组件向客户端组件传递数据

```tsx
// 服务端组件
export default function BlogPage() {
  const post = getPost();
  return <LikeButton initialLikes={post.likes} />;
}
```

这种混合模式让首屏 HTML 包含完整内容，同时交互部分按需水合，实现了性能与交互的平衡。
