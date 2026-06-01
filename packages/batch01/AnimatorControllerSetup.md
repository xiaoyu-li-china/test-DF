# Unity Animator 角色动画状态机配置指南

## 一、创建 Animator Controller

1. 在 Unity 编辑器的 Project 窗口中，右键 → Create → Animator Controller
2. 命名为 `PlayerAnimatorController`

## 二、添加 Animator 参数

双击打开 Animator Controller，在 Parameters 面板添加以下参数：

| 参数名       | 类型    | 说明                     |
|-------------|---------|--------------------------|
| Speed       | Float   | 移动速度，用于 Idle/Walk/Run 切换 |
| IsGrounded  | Bool    | 是否在地面               |
| Jump        | Trigger | 跳跃触发                 |
| Land        | Trigger | 落地触发                 |

## 三、创建动画状态

在 Animator 窗口的 Base Layer 中创建以下状态（右键 → Create State → Empty）：

### 1. Idle 状态
- 设置为默认状态（右键 → Set as Layer Default State）
- Motion: 拖拽 Idle 动画剪辑

### 2. Walk 状态
- Motion: 拖拽 Walk 动画剪辑
- Speed: 可根据需要调整

### 3. Run 状态
- Motion: 拖拽 Run 动画剪辑
- Speed: 可根据需要调整

### 4. Jump 状态
- Motion: 拖拽 Jump 动画剪辑
- 取消勾选 "Has Exit Time"
- 取消勾选 "Fixed Duration"

## 四、设置状态转换

### Idle ↔ Walk
1. Idle → Walk
   - 条件: `Speed` Greater than `0.1`
   - 取消勾选 "Has Exit Time"
   - 取消勾选 "Fixed Duration"
   - Transition Duration: `0.1`

2. Walk → Idle
   - 条件: `Speed` Less than `0.1`
   - 取消勾选 "Has Exit Time"
   - 取消勾选 "Fixed Duration"
   - Transition Duration: `0.1`

### Walk ↔ Run
1. Walk → Run
   - 条件: `Speed` Greater than `4.5`
   - 取消勾选 "Has Exit Time"
   - 取消勾选 "Fixed Duration"
   - Transition Duration: `0.1`

2. Run → Walk
   - 条件: `Speed` Less than `4.5`
   - 取消勾选 "Has Exit Time"
   - 取消勾选 "Fixed Duration"
   - Transition Duration: `0.1`

### 跳跃相关转换
1. Any State → Jump
   - 条件: `Jump` (Trigger)
   - 条件: `IsGrounded` Equals `true`
   - 取消勾选 "Has Exit Time"
   - 取消勾选 "Fixed Duration"
   - Transition Duration: `0.05`
   - 勾选 "Can Transition To Self": 否

2. Jump → Idle
   - 条件: `Land` (Trigger)
   - 条件: `IsGrounded` Equals `true`
   - 取消勾选 "Has Exit Time"
   - 取消勾选 "Fixed Duration"
   - Transition Duration: `0.1`

**注意**: 确保 Jump 状态的转换优先级正确，落地后优先回到 Idle。

## 五、角色设置

1. 选中角色 GameObject
2. 添加 Animator 组件:
   - Controller: 拖拽 `PlayerAnimatorController`
   - Avatar: 设置角色的 Avatar

3. 添加 CharacterController 组件:
   - 调整 Center、Radius、Height 匹配角色模型

4. 添加 PlayerController 脚本:
   - Ground Mask: 设置为地面所在的 Layer（例如 Default）
   - 可根据需要调整移动速度、跳跃力等参数

5. PlayerAnimator 脚本会自动添加（因为 PlayerController 有 RequireComponent）

## 六、输入控制

- **WASD / 方向键**: 移动
- **左 Shift**: 按住跑步
- **空格键**: 跳跃（仅在地面时有效）

## 七、状态机逻辑说明

```
Any State
    ↓ (Jump Trigger + IsGrounded=true)
   Jump
    ↓ (Land Trigger + IsGrounded=true)
   Idle ←→ Walk ←→ Run
    ↑__________↑
      (Speed 参数控制)
```

- **Idle**: Speed < 0.1 时进入
- **Walk**: 0.1 ≤ Speed < 4.5 时进入
- **Run**: Speed ≥ 4.5 时进入
- **Jump**: 按空格且在地面时触发，落地后自动回到 Idle

## 八、调试建议

1. 在 Animator 窗口中，运行游戏时可以观察当前状态和参数变化
2. 调整 PlayerAnimator 中的 `walkThreshold` 和 `runThreshold` 来匹配你的动画
3. 调整 PlayerController 中的 `walkSpeed` 和 `runSpeed` 来控制实际移动速度
4. 确保地面物体设置了正确的 Layer，以便 GroundCheck 正常工作
