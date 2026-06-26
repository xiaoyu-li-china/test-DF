# Unity Animator 角色动画状态机配置指南

## 一、创建 Animator Controller

1. 在 Unity 编辑器的 Project 窗口中，右键 → Create → Animator Controller
2. 命名为 `PlayerAnimatorController`

## 二、添加 Animator 参数

双击打开 Animator Controller，在 Parameters 面板添加以下参数：

| 参数名           | 类型    | 说明                     |
|-----------------|---------|--------------------------|
| Speed           | Float   | 移动速度，用于 Idle/Walk/Run 切换 |
| IsGrounded      | Bool    | 是否在地面               |
| Jump            | Trigger | 跳跃触发                 |
| Land            | Trigger | 落地触发                 |
| Attack          | Trigger | 攻击触发                 |
| CastSpell       | Trigger | 施法触发                 |
| IsUsingSkill    | Bool    | 是否正在使用技能         |
| Expression      | Int     | 表情类型（0-7）          |
| ExpressionBlend | Float   | 表情混合程度 (0-1)       |
| Blink           | Trigger | 眨眼触发                 |

## 三、创建动画层 (Layers)

在 Animator 窗口的 Layers 面板中创建以下层：

### Base Layer（已有）
- **Weight**: 1
- **Blending**: Override
- **Mask**: 无（控制全身）

### Head Layer（新建）
- **名称**: Head Layer
- **Weight**: 1
- **Blending**: Override
- **Mask**: 创建一个只包含头部骨骼的 Avatar Mask
  - 右键 Project → Create → Avatar Mask
  - 在 Avatar Mask 的 Humanoid 面板中，只勾选头部相关骨骼
  - 将此 Mask 拖拽到 Head Layer 的 Mask 字段
- **IK Pass**: 可选

## 四、创建动画状态

### Base Layer 状态

在 Base Layer 中创建以下状态（右键 → Create State → Empty）：

#### 1. Idle 状态
- 设置为默认状态（右键 → Set as Layer Default State）
- Motion: 拖拽 Idle 动画剪辑

#### 2. Walk 状态
- Motion: 拖拽 Walk 动画剪辑
- Speed: 可根据需要调整

#### 3. Run 状态
- Motion: 拖拽 Run 动画剪辑
- Speed: 可根据需要调整

#### 4. Jump 状态
- Motion: 拖拽 Jump 动画剪辑
- 取消勾选 "Has Exit Time"
- 取消勾选 "Fixed Duration"

#### 5. Attack 状态
- Motion: 拖拽 Attack 动画剪辑
- 取消勾选 "Has Exit Time"
- 取消勾选 "Fixed Duration"
- **添加 Animation Event**：在动画结束帧添加事件，方法名为 `OnAttackAnimationEnd`

#### 6. CastSpell 状态
- Motion: 拖拽 CastSpell 动画剪辑
- 取消勾选 "Has Exit Time"
- 取消勾选 "Fixed Duration"
- **添加 Animation Event**：在动画结束帧添加事件，方法名为 `OnCastSpellAnimationEnd`

### Head Layer 状态

在 Head Layer 中创建以下状态，用于表情控制：

#### 1. Neutral（默认状态）
- Motion: 拖拽 Neutral 表情动画或空状态
- 右键 → Set as Layer Default State

#### 2. Happy
- Motion: 拖拽 Happy 表情动画
- 条件: `Expression` Equals `1`

#### 3. Angry
- Motion: 拖拽 Angry 表情动画
- 条件: `Expression` Equals `2`

#### 4. Sad
- Motion: 拖拽 Sad 表情动画
- 条件: `Expression` Equals `3`

#### 5. Surprised
- Motion: 拖拽 Surprised 表情动画
- 条件: `Expression` Equals `4`

#### 6. Scared
- Motion: 拖拽 Scared 表情动画
- 条件: `Expression` Equals `5`

#### 7. Concentrated
- Motion: 拖拽 Concentrated 表情动画
- 条件: `Expression` Equals `6`

#### 8. Pain
- Motion: 拖拽 Pain 表情动画
- 条件: `Expression` Equals `7`

**表情转换设置**：
- 所有表情转换的 Transition Duration: 0.15-0.2
- 取消勾选 "Has Exit Time"
- 取消勾选 "Fixed Duration"

## 五、设置状态转换

### Base Layer - 移动相关转换

#### Idle ↔ Walk
1. Idle → Walk
   - 条件: `Speed` Greater than `0.1`
   - 条件: `IsUsingSkill` Equals `false`
   - 取消勾选 "Has Exit Time"
   - 取消勾选 "Fixed Duration"
   - Transition Duration: `0.2`
   - Transition Offset: `0`

2. Walk → Idle
   - 条件: `Speed` Less than `0.1`
   - 条件: `IsUsingSkill` Equals `false`
   - 取消勾选 "Has Exit Time"
   - 取消勾选 "Fixed Duration"
   - Transition Duration: `0.25`
   - Transition Offset: `0`

#### Walk ↔ Run
1. Walk → Run
   - 条件: `Speed` Greater than `4.5`
   - 条件: `IsUsingSkill` Equals `false`
   - 取消勾选 "Has Exit Time"
   - 取消勾选 "Fixed Duration"
   - Transition Duration: `0.2`
   - Transition Offset: `0`

2. Run → Walk
   - 条件: `Speed` Less than `4.5`
   - 条件: `IsUsingSkill` Equals `false`
   - 取消勾选 "Has Exit Time"
   - 取消勾选 "Fixed Duration"
   - Transition Duration: `0.25`
   - Transition Offset: `0`

### Base Layer - 跳跃相关转换

1. Any State → Jump
   - 条件: `Jump` (Trigger)
   - 条件: `IsGrounded` Equals `true`
   - 条件: `IsUsingSkill` Equals `false`
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

### Base Layer - 技能相关转换

1. Any State → Attack
   - 条件: `Attack` (Trigger)
   - 条件: `IsUsingSkill` Equals `false`
   - 取消勾选 "Has Exit Time"
   - 取消勾选 "Fixed Duration"
   - Transition Duration: `0.1`
   - 勾选 "Can Transition To Self": 否

2. Attack → Idle
   - 无条件（通过 Animation Event 调用 `OnAttackAnimationEnd` 自动转换）
   - 取消勾选 "Has Exit Time"
   - 取消勾选 "Fixed Duration"
   - Transition Duration: `0.15`

3. Any State → CastSpell
   - 条件: `CastSpell` (Trigger)
   - 条件: `IsUsingSkill` Equals `false`
   - 取消勾选 "Has Exit Time"
   - 取消勾选 "Fixed Duration"
   - Transition Duration: `0.1`
   - 勾选 "Can Transition To Self": 否

4. CastSpell → Idle
   - 无条件（通过 Animation Event 调用 `OnCastSpellAnimationEnd` 自动转换）
   - 取消勾选 "Has Exit Time"
   - 取消勾选 "Fixed Duration"
   - Transition Duration: `0.15`

**注意**: 确保技能转换的优先级高于移动转换。

## 六、角色设置

1. 选中角色 GameObject
2. 添加 Animator 组件:
   - Controller: 拖拽 `PlayerAnimatorController`
   - Avatar: 设置角色的 Avatar
   - Apply Root Motion: 勾选（如需代码控制则取消）

3. 添加 CharacterController 组件:
   - 调整 Center、Radius、Height 匹配角色模型

4. 添加 PlayerController 脚本:
   - Ground Mask: 设置为地面所在的 Layer（例如 Default）
   - 可根据需要调整移动速度、跳跃力等参数
   - **动画过渡参数**:
     - `Speed Acceleration`: 速度增加时的平滑系数（默认 10）
     - `Speed Deceleration`: 速度减少时的平滑系数（默认 15），解决 Run→Idle 卡顿问题
   - **跳跃防连跳**:
     - `Jump Cooldown`: 跳跃冷却时间（默认 0.3秒），防止二次跳跃
   - **技能按键**:
     - `Attack Key`: 攻击键（默认 Mouse0）
     - `Cast Spell Key`: 施法键（默认 Mouse1）

5. PlayerAnimator 脚本会自动添加（因为 PlayerController 有 RequireComponent）

6. 可选：添加 AnimationOverrideController 脚本：
   - `Base Controller`: 基础 Animator Controller（可选，不填则使用当前 Animator 的 Controller）
   - `Animation Sets`: 配置多套动画集（每套包含 Idle/Walk/Run/Jump/Attack/CastSpell 动画）

7. 可选：添加 FacialExpression 脚本：
   - `Head Layer Index`: 头部层索引（默认 1）
   - `Default Layer Weight`: 默认层权重（默认 1）
   - `Transition Speed`: 过渡速度（默认 8）
   - `Enable Auto Blink`: 是否启用自动眨眼

8. 可选：添加 PlayerAnimationTest 脚本用于测试

## 七、输入控制

- **WASD / 方向键**: 移动
- **左 Shift**: 按住跑步
- **空格键**: 跳跃（仅在地面时有效）
- **鼠标左键**: 攻击
- **鼠标右键**: 施法

### 测试按键（PlayerAnimationTest）
- **数字键 1**: 攻击
- **数字键 2**: 施法
- **数字键 3**: 下一套动画（换装）
- **数字键 4**: 上一套动画（换装）
- **数字键 5**: 开心表情
- **数字键 6**: 愤怒表情
- **数字键 7**: 中立表情
- **数字键 8**: 眨眼

## 八、状态机逻辑说明

```
Any State
    ↓ (Jump/Attack/CastSpell Trigger + !IsUsingSkill)
Jump / Attack / CastSpell
    ↓ (落地/动画结束)
   Idle ←→ Walk ←→ Run
    ↑__________↑
      (Speed 参数 + !IsUsingSkill)

Head Layer (独立控制):
Neutral ←→ Happy / Angry / Sad / ...
    (Expression 参数控制)
```

- **Idle**: Speed < 0.1 且 !IsUsingSkill 时进入
- **Walk**: 0.1 ≤ Speed < 4.5 且 !IsUsingSkill 时进入
- **Run**: Speed ≥ 4.5 且 !IsUsingSkill 时进入
- **Jump**: 按空格且在地面时触发，落地后自动回到 Idle
- **Attack**: 鼠标左键，播放完毕自动回到 Idle
- **CastSpell**: 鼠标右键，播放完毕自动回到 Idle
- **技能进行中**: 无法移动、跳跃或使用其他技能

## 九、AnimatorOverrideController 换装配置

### 1. 创建 AnimatorOverrideController（可选，代码也会自动创建）
- 右键 Project → Create → Animator Override Controller
- 将 `PlayerAnimatorController` 拖拽到 Controller 字段
- 在 Inspector 中可以直接替换各状态的动画剪辑

### 2. 代码动态换装
```csharp
// 通过索引切换
animationOverrideController.ApplyAnimationSet(0);

// 通过名称切换
animationOverrideController.ApplyAnimationSet("Warrior");

// 切换下一套
animationOverrideController.NextAnimationSet();

// 切换上一套
animationOverrideController.PreviousAnimationSet();

// 单独替换某个动画
animationOverrideController.OverrideClip("Attack", newAttackClip);
```

### 3. 在 Inspector 中配置动画集
在 AnimationOverrideController 组件的 `Animation Sets` 列表中：
- Element 0: 配置战士套装动画
- Element 1: 配置法师套装动画
- Element 2: 配置刺客套装动画
- ...

## 十、Animation Event 配置

### 1. 攻击动画结束事件
1. 选中 Attack 动画剪辑
2. 在 Inspector 中展开 Events 面板
3. 点击 Add Event 按钮
4. 将事件拖到动画的最后一帧
5. 在 Function 字段输入 `OnAttackAnimationEnd`
6. 确保角色上挂载了 PlayerAnimator 脚本

### 2. 施法动画结束事件
1. 选中 CastSpell 动画剪辑
2. 同上，最后一帧添加事件
3. Function 字段输入 `OnCastSpellAnimationEnd`

## 十一、调试建议

1. 在 Animator 窗口中，运行游戏时可以观察当前状态和参数变化
2. 调整 PlayerAnimator 中的 `walkThreshold` 和 `runThreshold` 来匹配你的动画
3. 调整 PlayerController 中的 `walkSpeed` 和 `runSpeed` 来控制实际移动速度
4. 确保地面物体设置了正确的 Layer，以便 GroundCheck 正常工作

### 动画卡顿调试
- 如果 Run→Idle 仍然卡顿：增加 `Speed Deceleration` 值（如 20），或增加 Animator 中 Run→Idle 的 Transition Duration
- 如果加速/减速感觉太迟钝：减小 `Speed Acceleration` / `Speed Deceleration` 值
- **关键**：`displaySpeed` 是传给 Animator 的平滑值，`currentSpeed` 是实际移动速度

### 防连跳调试
- 如果仍然可以二次跳跃：增加 `Jump Cooldown` 时间（如 0.5 秒）
- 确保起跳后 `isJumping` 立即设为 true，且只有落地时才重置
- 在 Inspector 中观察 `jumpCooldownTimer` 的变化来调试冷却机制

### 技能动画调试
- 如果技能无法播放：检查 `IsUsingSkill` 参数是否被正确设置
- 如果技能播放完不回到 Idle：检查 Animation Event 是否正确配置
- 如果技能可以叠加：确保 Any State 转换的条件包含 `IsUsingSkill Equals false`

### 换装调试
- 如果换装不生效：检查动画剪辑名称是否与状态名称匹配
- 如果某些动画没替换：确保 AnimationSet 中对应的字段不为 null
- 可以通过 `animationOverrideController.CurrentSetIndex` 查看当前使用的动画集索引

### 表情层调试
- 如果表情不显示：检查 Head Layer 的 Weight 是否为 1
- 如果表情和身体动画冲突：调整 Avatar Mask，确保只包含头部骨骼
- 如果表情切换不流畅：增加 Transition Duration 或减小 `Transition Speed`
- 观察 `Expression` 和 `ExpressionBlend` 参数的变化来调试
