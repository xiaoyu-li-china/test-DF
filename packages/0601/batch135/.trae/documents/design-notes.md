# 滑雪场 3D 可视化 - 技术设计说明

## 一、雪道热力着色方案：Vertex Color vs Texture 投影

### 1.1 当前实现方案

本项目采用 **Vertex Color（顶点颜色）** 方案实现雪道热力着色，具体实现见 [SlopePath.tsx](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0601/batch135/src/components/SlopePath.tsx#L47-L64)。

### 1.2 技术选型对比

| 维度 | Vertex Color（顶点颜色） | Texture Projection（纹理投影） |
|------|--------------------------|--------------------------------|
| **性能** | ✅ 零额外显存开销<br/>✅ GPU 友好，直接插值 | ⚠️ 需要额外纹理采样<br/>⚠️ Mipmap 占用显存 |
| **动态着色** | ✅ 直接修改 material.color<br/>✅ 无需重新生成纹理 | ❌ 需要更新纹理数据<br/>❌ 频繁更新性能差 |
| **渐变效果** | ✅ GPU 硬件插值，平滑自然 | ⚠️ 依赖纹理分辨率，可能锯齿 |
| **实现复杂度** | ✅ 一行代码搞定 | ⚠️ 需要 UV 映射、纹理生成 |
| **数据驱动** | ✅ 与 JSON 数据直接映射 | ⚠️ 需要数据→纹理转换层 |
| **发光效果** | ✅ emissive + emissiveIntensity | ⚠️ 需要额外发光贴图 |

### 1.3 为什么选择 Vertex Color

#### 场景特点匹配：
1. **单雪道单色**：每条雪道整体用一个颜色表示拥挤度，不需要雪道内部复杂图案
2. **实时更新**：拥挤度数据周期性变化（5秒刷新），需要高频颜色更新
3. **数量规模**：10 条雪道 × 单颜色，顶点颜色完全胜任

#### 代码简洁性：
```typescript
// Vertex Color 方案 - 简洁直接
<meshStandardMaterial
  color={getCongestionColor(congestion)}  // 直接用拥挤度映射颜色
  emissive={emissiveColor}               // 拥挤度越高发光越强
  emissiveIntensity={0.8 + (congestion / 100) * 0.8}
/>
```

对比 Texture 方案需要：
- 生成 Canvas 纹理（创建、绘制、转换为 Three.js Texture）
- 管理 UV 坐标
- 雪道沿曲线的纹理投影变形问题
- 纹理更新时的 dispose 内存管理

### 1.4 Vertex Color 的增强优化

为了弥补单色的单调感，我们增加了 **发光强度渐变**：
- 拥挤度越高 → `emissiveIntensity` 越强
- 形成"拥挤度越高越刺眼"的视觉反馈
- 从"颜色" + "亮度"两个维度传达信息

### 1.5 什么时候该用 Texture 投影？

如果未来需求升级，以下场景建议切换到 Texture：
1. **雪道内局部热力图**：雪道起点拥挤、终点宽松，需要沿路径渐变
2. **复杂图案**：需要显示雪道编号、方向箭头等标记
3. **超高密度**：上百条雪道，InstancedMesh + 单纹理批处理

---

## 二、为什么 Safari 要避开 `LineBasicMaterial.linewidth`

### 2.1 问题本质

**WebGL 标准规定**：`gl.lineWidth()` 只支持 **1px** 线宽。

Three.js 的 `LineBasicMaterial.linewidth` 参数是一个"善意的谎言"——它在底层调用 `gl.lineWidth()`，但：
- ✅ **Windows (ANGLE)**：部分驱动支持 >1px（非标准扩展）
- ✅ **Chrome/Firefox (Linux)**：部分支持
- ❌ **macOS/iOS Safari**：**永远 1px**，参数被忽略

### 2.2 本项目的规避策略

本项目没有使用 `LineBasicMaterial`，而是用 **`TubeGeometry`（管道几何体）** 实现雪道，见 [SlopePath.tsx](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0601/batch135/src/components/SlopePath.tsx#L35-L37)：

```typescript
// 用 TubeGeometry 而不是 Line + LineBasicMaterial
const tubeGeo = new THREE.TubeGeometry(
  curve,    // 雪道曲线
  64,       // 曲线分段
  1.2,      // 管道半径 = "线宽"
  12,       // 圆周分段（圆的边数）
  false     // 不闭合
);
```

### 2.3 TubeGeometry vs LineBasicMaterial 对比

| 特性 | TubeGeometry（推荐） | LineBasicMaterial.linewidth |
|------|---------------------|-----------------------------|
| **跨平台一致性** | ✅ 所有平台完全一致 | ❌ Safari 永远 1px |
| **视觉效果** | ✅ 3D 立体管道，有厚度 | ❌ 2D 细线，无体积感 |
| **光照反应** | ✅ 支持法线、阴影、PBR | ❌ 无光照，扁平 |
| **透视效果** | ✅ 近大远小正确 | ❌ 屏幕空间线宽，透视失效 |
| **Pick 交互** | ✅ 射线检测面积大 | ❌ 细线难以点击 |
| **性能开销** | ⚠️ 每个雪道 ~1000 面 | ✅ 极低开销 |

### 2.4 性能考量

对于 10 条雪道的规模：
- **TubeGeometry**：10 × ~800 三角形 = 8,000 triangles
- **现代 GPU**：轻松处理百万级三角形

结论：**视觉质量提升 > 性能开销可忽略**

### 2.5 如果非要用宽线...

如果确实需要 2D 宽线效果，正确做法是：

**方案 A：`Line2` from three.js examples**
```typescript
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
// 这才是真正的跨平台宽线实现（用三角形模拟）
```

**方案 B：Shader 实现**
- 顶点着色器扩展线段为四边形
- 片元着色器抗锯齿
- 实现复杂度高

---

## 三、总结

| 决策 | 原因 |
|------|------|
| **Vertex Color 着色** | 单雪道单色、实时更新、代码简洁 |
| **TubeGeometry 雪道** | 跨平台线宽一致、3D 体积感、支持光照、易于点击 |
| **避开 LineBasicMaterial.linewidth** | Safari 不支持 >1px，破坏设计一致性 |
