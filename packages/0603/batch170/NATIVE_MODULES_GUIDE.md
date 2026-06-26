# React Native Native 模块与 JS 层交互原理

## 一、Native 模块与 JS 层交互原理

### 1. 整体架构
React Native 通过 **JavaScriptCore** (iOS) 或 **Hermes** (Android) 运行 JS 代码，Native 层与 JS 层通过 **Bridge** 进行异步消息通信。

```
┌──────────────────┐       JSON Message        ┌──────────────────┐
│  JavaScript Code │ ───────────────────────►  │   Native (ObjC)  │
│   (JS Thread)    │  ◄──────────────────────  │ (Main Thread)    │
└──────────────────┘       Async Batched       └──────────────────┘
        │                      Messages                  │
        │                                                │
        ▼                                                ▼
┌──────────────────┐                            ┌──────────────────┐
│ NativeModules.XX │                            │ RCT_EXPORT_MODULE│
│  (Proxy Object)  │                            │ @ReactMethod     │
└──────────────────┘                            └──────────────────┘
```

### 2. 通信机制详解

#### 2.1 模块注册流程
1. **Native 端**：使用 `RCT_EXPORT_MODULE` (iOS) 或继承 `ReactContextBaseJavaModule` + `getName()` (Android) 注册模块
2. **Bridge 初始化**：RN 启动时扫描所有注册的 Native 模块，生成模块配置表（Module Config）
3. **JS 端代理对象创建**：通过 `NativeModules` 生成对应 JS 代理对象，方法调用会被序列化为 JSON 消息

#### 2.2 方法调用流程
```
JS: NativeModules.SplashScreen.hide()
      │
      ▼
  序列化调用信息: {module: 'SplashScreen', method: 'hide', args: []}
      │
      ▼
  通过 Bridge 发送到 Native 端 (Shadow Queue)
      │
      ▼
  Native 端反序列化，找到对应模块和方法
      │
      ▼
  在主线程执行 hide() 方法
      │
      ▼
  (可选) 通过 Callback / Promise 返回结果到 JS
```

#### 2.3 事件发送流程（Native → JS）
使用 `NativeEventEmitter` 实现 Native 向 JS 主动发送事件：

```
Native 端 (iOS):
  [self sendEventWithName:@"SplashScreenHidden" body:params];

Native 端 (Android):
  context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
         .emit("SplashScreenHidden", params);

JS 端接收:
  const emitter = new NativeEventEmitter(NativeModules.SplashScreen);
  emitter.addListener('SplashScreenHidden', callback);
```

### 3. 关键 API

| API | 用途 |
|-----|------|
| `NativeModules` | JS 访问 Native 模块的入口，返回代理对象 |
| `NativeEventEmitter` | 订阅 Native 发送的事件 |
| `RCT_EXPORT_MODULE` | iOS 导出模块宏 |
| `RCT_EXPORT_METHOD` | iOS 导出方法宏 |
| `@ReactMethod` | Android 导出方法注解 |
| `Callback` / `Promise` | 方法返回结果给 JS |

---

## 二、冷启动白屏问题及解决方案

### 1. 白屏产生的原因

```
用户点击 App 图标
      │
      ▼
  系统启动 App (显示系统 Launch Screen)
      │
      ▼
  初始化 React Native Bridge (耗时 1-3 秒)
      │  ◄─── 此阶段：系统 Launch Screen 消失，但 JS Bundle
      ▼               还未加载完成 → 显示空白 View
  JS Bundle 加载 & 执行
      │
      ▼
  AppRegistry.registerComponent 调用
      │
      ▼
  React Root View 渲染
```

**根本原因**：
1. 系统级 Launch Screen（Android 的 `windowBackground`，iOS 的 `LaunchScreen.storyboard`）在 App 进程初始化完成后会自动消失
2. React Native Bridge 初始化 + JS Bundle 加载需要 1-3 秒时间
3. 两者之间存在时间差，导致出现白屏

### 2. 标准解决方案：双层 Splash 方案

**第一步：原生层持续显示 Splash（最关键）**
- Android：在 `MainActivity.onCreate()` 中通过原生代码主动显示 Splash，不依赖系统自动消失
- iOS：在 `AppDelegate` 中添加一个覆盖层 View 持续显示 Launch Screen

**第二步：JS 准备好后通知原生隐藏**
- JS 层 `AppRegistry.registerComponent` 执行完毕、首屏渲染完成后
- 调用 `NativeModules.SplashScreen.hide()` 通知原生隐藏

**第三步：JS 层业务 Splash（可选）**
- 用于显示 Logo、加载进度、版本信息等
- 完成后跳转到业务首页

```
┌───────────────────────────────────────────────────────────────┐
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │  Native Splash │ → │  JS Splash  │ → │   Home Page   │   │
│  │  (持续显示)   │    │   (2秒)     │    │              │   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
│         │                    │                               │
│         │ JS 准备好后调用    │  业务逻辑完成后               │
│         └── hideSplash() ────┴── navigate('Home') ───────────┘
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### 3. 具体实现代码

#### 3.1 Android 原生层实现

```java
// MainActivity.java
@Override
protected void onCreate(Bundle savedInstanceState) {
    // 在 super.onCreate 之前显示 Splash
    SplashScreen.show(this, R.style.SplashTheme, true);
    super.onCreate(savedInstanceState);
}

// SplashScreenModule.java
@ReactMethod
public void hide() {
    final Activity activity = getCurrentActivity();
    if (activity == null) return;
    activity.runOnUiThread(() -> {
        // 移除 Splash
        activity.getWindow().setBackgroundDrawableResource(android.R.color.transparent);
    });
}
```

#### 3.2 iOS 原生层实现

```objective-c
// AppDelegate.mm
- (BOOL)application:(UIApplication *)application
    didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
    // 添加 Splash 覆盖层
    [RCTSplashScreen show];
    return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

// RCTSplashScreen.m
RCT_EXPORT_METHOD(hide) {
    dispatch_async(dispatch_get_main_queue(), ^{
        [_splashView removeFromSuperview];
        _splashView = nil;
    });
}
```

#### 3.3 JS 层控制时机

```typescript
// App.tsx
import {hideSplash} from './src/modules/NativeSplashScreen';

const App: React.FC = () => {
  const [jsReady, setJsReady] = useState(false);

  useEffect(() => {
    // JS 层初始化完成后隐藏原生 Splash
    hideSplash();
    setJsReady(true);
  }, []);

  if (!jsReady) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

AppRegistry.registerComponent(appName, () => App);
```

### 4. 其他优化方案

| 方案 | 说明 | 适用场景 |
|------|------|---------|
| **Hermes Engine** | Facebook 推出的 JS 引擎，比 JSC 启动更快 | Android |
| **RAM Bundles** | 按需加载 JS Bundle，减少启动时加载量 | 大型应用 |
| **Inline Requires** | 延迟模块加载，加快首屏渲染 | 所有应用 |
| **react-native-splash-screen** | 开源库，封装了双层 Splash 逻辑 | 快速开发 |

---

## 三、本项目中的自定义原生模块使用

### 目录结构
```
src/modules/NativeSplashScreen.ts          # JS 层封装
android/app/src/main/java/com/splashapp/splash/
  ├── SplashScreenModule.java              # Android 模块实现
  └── SplashScreenReactPackage.java        # Android 包注册
ios/SplashApp/SplashScreen/
  ├── RCTSplashScreen.h                    # iOS 头文件
  └── RCTSplashScreen.m                    # iOS 实现
```

### 集成到 App 入口

```typescript
// index.js
import {AppRegistry} from 'react-native';
import App from './App';
import {hideSplash} from './src/modules/NativeSplashScreen';
import {name as appName} from './app.json';

// 延迟隐藏原生 Splash，给 JS 渲染留时间
setTimeout(() => {
  hideSplash();
}, 100);

AppRegistry.registerComponent(appName, () => App);
```

### 结合 JS Splash 使用

```typescript
// src/screens/SplashScreen.tsx
import {hideSplash} from '../modules/NativeSplashScreen';

useEffect(() => {
  // JS Splash 显示 500ms 后隐藏原生层
  const t = setTimeout(() => hideSplash(), 500);
  return () => clearTimeout(t);
}, []);
```

这样就实现了：系统启动 → 原生 Splash 显示 → JS 加载完成 → 隐藏原生 Splash → JS Splash 接管显示 → 2秒后跳转到首页，全程无白屏。
