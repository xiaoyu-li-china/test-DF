# 全局快捷键模块测试

## 测试结构

```
test/
├── unit/
│   └── shortcut-config.test.js    # 配置管理单元测试
├── e2e/
│   └── global-shortcut.e2e.test.js  # E2E 测试 (Spectron)
├── shortcut-test-runner.js        # Electron 主进程直接测试
├── test-app-main.js               # 测试应用主进程
├── test-preload.js                # 测试预加载脚本
├── test-page.html                 # 测试页面
└── README.md                      # 本文档
```

## 测试命令

```bash
# 运行所有测试
npm test

# 只运行单元测试
npm run test:unit

# 只运行 E2E 测试
npm run test:e2e

# 运行 Electron 主进程直接测试
npm run test:shortcut
```

## 测试覆盖范围

### 1. 单元测试 (shortcut-config.test.js)

测试配置文件管理功能：
- ✅ 配置文件路径生成
- ✅ 跨平台修饰键适配 (Command/Ctrl)
- ✅ 默认快捷键配置
- ✅ 配置文件读写操作

### 2. Electron 主进程直接测试 (shortcut-test-runner.js)

直接在 Electron 主进程中测试 globalShortcut API：
- ✅ 快捷键注册前状态检测
- ✅ 快捷键注册功能
- ✅ 注册后状态验证
- ✅ 快捷键注销功能
- ✅ 冲突检测功能
- ✅ 批量注册与注销
- ✅ 无效快捷键处理

### 3. E2E 测试 (global-shortcut.e2e.test.js)

使用 Spectron 进行端到端测试：

**快捷键注册测试：**
- ✅ 成功注册快捷键
- ✅ 检测已注册的快捷键
- ✅ 成功注销快捷键
- ✅ 注销后状态验证

**快捷键回调触发测试：**
- ✅ 注册后触发回调能被记录
- ✅ 多次触发回调正确计数
- ✅ 不同快捷键回调独立计数

**快捷键注销后测试：**
- ✅ 注销后系统快捷键不再触发
- ✅ 批量注销所有快捷键

**平台兼容性测试：**
- ✅ 返回正确的平台信息
- ✅ 修饰键自动适配

## 测试说明

### 关于快捷键实际触发

由于在测试环境中无法真正模拟用户按下全局快捷键（这需要操作系统级别的权限），我们采用以下策略：

1. **API 层测试**：验证 `globalShortcut.register()` 和 `globalShortcut.unregister()` 等 API 正常工作
2. **状态验证**：通过 `globalShortcut.isRegistered()` 验证注册状态
3. **回调模拟**：通过 IPC 调用模拟回调触发，验证回调计数逻辑正确

### 实际触发验证

在真实使用场景中，快捷键的实际触发由操作系统处理。应用程序只需要：
1. 正确注册快捷键
2. 提供回调函数
3. 适时注销快捷键

这些都已在测试中覆盖。

## 测试文件说明

### shortcut-test-runner.js

独立的 Electron 应用，直接在主进程中运行测试。适合快速验证 globalShortcut 基本功能。

### test-app-main.js + test-preload.js + test-page.html

完整的测试应用，通过 IPC 暴露测试接口，供 Spectron E2E 测试调用。

### global-shortcut.e2e.test.js

使用 Spectron 框架的 E2E 测试。启动完整的 Electron 应用，通过 IPC 调用测试接口。
