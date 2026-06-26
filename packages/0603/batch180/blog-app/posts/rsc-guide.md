---
title: "React Server Components 实战指南"
date: "2024-11-15"
author: "李四"
excerpt: "React Server Components 让我们能够在服务器上渲染组件，显著减少客户端 JavaScript 体积。"
---

## 为什么需要 Server Components？

传统 React 应用会在客户端下载和执行所有组件代码。随着应用增长，JavaScript bundle 也会不断膨胀，导致页面加载变慢。

React Server Components 解决了这个问题：

- **零客户端 JS**：服务端组件的代码不会发送到浏览器
- **直接访问后端**：可以在组件中直接读取数据库、文件系统
- **自动代码分割**：只有客户端组件会被打包发送

## 实战示例

### 读取文件系统

```tsx
import fs from 'fs';
import path from 'path';

export default async function PostList() {
  const files = fs.readdirSync(path.join(process.cwd(), 'posts'));
  return (
    <ul>
      {files.map(file => <li key={file}>{file}</li>)}
    </ul>
  );
}
```

### 数据库查询

```tsx
import { db } from '@/lib/db';

export default async function UserDashboard({ userId }) {
  const user = await db.user.findUnique({ where: { id: userId } });
  return <div>欢迎回来，{user.name}</div>;
}
```

## 注意事项

- 服务端组件不能使用 `useState`、`useEffect` 等 Hooks
- 不能绑定事件处理器如 `onClick`
- 需要交互时，抽取为客户端组件

正确理解服务端与客户端组件的边界，是构建高性能 Next.js 应用的关键。
