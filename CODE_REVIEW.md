# CMap 代码审查报告

> 共发现 **30** 个问题，按严重性排序。建议从上往下逐一处理。
> 
> 每个问题包含：文件路径、问题描述、原因分析、修复建议。

---

## 严重问题（高优先级）

---

### 问题 1 — 安全漏洞：`new Function()` 执行任意字符串代码

**文件**: `src/core/Cache/index.ts`（约第 94–96 行）

**当前代码**:
```typescript
stringParseToFunction(str: any) {
  return new Function('"use strict"; return (' + str + ')')()
}
```

**问题**: `new Function()` 执行动态字符串，属于严重的代码注入漏洞。只要 sessionStorage 中的数据被篡改，就可以执行任意代码。

**建议修复**: 不要序列化/反序列化函数。改用事件发射器或 callback registry 模式，将函数存在内存中，只持久化数据部分。

---

### 问题 2 — 逻辑错误：`Fill.move()` 三元表达式颠倒

**文件**: `src/modules/Plot/plugins/Fill/index.ts`（约第 113–116 行）

**当前代码**:
```typescript
const drag: LngLat | null =
  this.center === null ? this.center : this.updateEvent.getDragLngLat()
```

**问题**: 逻辑颠倒。`this.center === null` 时应该取拖拽坐标，但现在直接返回 null，导致拖拽功能失效。

**建议修复**:
```typescript
const drag: LngLat | null =
  this.center === null ? this.updateEvent.getDragLngLat() : this.center
```

---

### 问题 3 — 逻辑错误：`Track.markItem()` 用航向角检查速度

**文件**: `src/modules/Track/index.ts`（约第 235–236 行）

**当前代码**:
```typescript
const isPrevStopped = prevCog < 0.5
const isCurrStopped = curCog < 0.5
```

**问题**: `cog` 是航迹向（0–360°），不是速度。用航向角是否 < 0.5 来判断是否停船，逻辑完全错误，几乎所有船只都会被判断为"停止"。

**建议修复**:
```typescript
const isPrevStopped = prev.speed < 0.5
const isCurrStopped = cur.speed < 0.5
```

---

### 问题 4 — Bug：`Cache.removeAll()` 数组越界

**文件**: `src/core/Cache/index.ts`（约第 70–88 行）

**当前代码**:
```typescript
for (let i = 0; i <= window.sessionStorage.length; i++) {
```

**问题**: `<=` 导致最后一次循环时 `key(i)` 返回 null，后续操作会报错。

**建议修复**:
```typescript
for (let i = 0; i < window.sessionStorage.length; i++) {
```

---

### 问题 5 — 内存泄漏：Tooltip `zoom`/`zoomend` 事件监听器堆积

**文件**: `src/core/Tooltip/index.ts`（约第 19–30 行）

**问题**: `zoom` 和 `zoomend` 监听器在构造函数中绑定为箭头函数，`hide/remove` 时无法正确移除（引用不同），导致多次 show/hide 后监听器堆积。

**建议修复**: 在 `show()` 时绑定事件，在 `hide()` 时用相同的函数引用移除；或在构造函数中保存函数引用：
```typescript
this._onZoom = this._onZoom.bind(this)
this._onZoomEnd = this._onZoomEnd.bind(this)
```

---

### 问题 6 — 性能问题：`CMap.mapLoaded()` 使用 16ms 轮询而非事件

**文件**: `src/modules/CMap/index.ts`（约第 145–183 行）

**问题**: 用 `setInterval` 每 16ms 轮询 `map._loaded`，浪费 CPU，且访问了 mapbox 私有属性。

**建议修复**:
```typescript
mapLoaded(): Promise<Map> {
  return new Promise((resolve) => {
    if (this.getMap().loaded()) {
      resolve(this.getMap())
    } else {
      this.getMap().once('load', () => resolve(this.getMap()))
    }
  })
}
```

---

### 问题 7 — 性能问题：`Tooltip.getOffDOMSize()` 每次都克隆 DOM

**文件**: `src/core/Tooltip/index.ts`（约第 185–228 行）

**问题**: 每次调用都创建 clone 节点、插入 DOM、读取尺寸、再移除，在 zoom 事件高频触发时开销极大。

**建议修复**: 缓存已计算的尺寸，只在内容变化时重新计算：
```typescript
private _cachedSize: { width: number; height: number } | null = null

getOffDOMSize(): { width: number; height: number } {
  if (this._cachedSize) return this._cachedSize
  // ... 克隆计算逻辑
  this._cachedSize = { width, height }
  return this._cachedSize
}

// 内容更新时调用
invalidateSize() {
  this._cachedSize = null
}
```

---

### 问题 8 — 性能问题：`Track.render()` 每次全量销毁重建 Tooltip

**文件**: `src/modules/Track/index.ts`（约第 440–445 行）

**问题**: 每次 render 都调用 `removeAllTooltip()` + `createTooltip()`，全量重建所有 tooltip DOM，造成大量不必要的 DOM 操作。

**建议修复**: 实现增量更新，比较新旧数据，只更新发生变化的 tooltip。

---

### 问题 9 — Bug：`Collision.isIntersect()` 实现的是"包含"而非"相交"

**文件**: `src/core/Collision/CollisionItem.ts`（约第 86–89 行）

**当前代码**:
```typescript
isIntersect(box: BBox): boolean {
  const { minX, minY, maxX, maxY } = box
  return minX <= this.minX && minY <= this.minY && this.maxX <= maxX && this.maxY <= maxY
}
```

**问题**: 方法名叫 `isIntersect`（相交），但实现的是"this 被 box 完全包含"的逻辑，两种语义不同。

**建议修复（真正的相交检查）**:
```typescript
isIntersect(box: BBox): boolean {
  return !(box.maxX < this.minX || box.minX > this.maxX ||
           box.maxY < this.minY || box.minY > this.maxY)
}
```
或者将方法重命名为 `isContainedBy()`。

---

### 问题 10 — 访问私有 API：`CMap.change()` 使用 `_data`

**文件**: `src/modules/CMap/index.ts`（约第 99–100 行）

**当前代码**:
```typescript
const runtime: GeoJSONSource = map.getSource(id)!
return { id, spec: { ...source, data: runtime._data } as SourceSpecification }
```

**问题**: 访问 mapbox-gl 的私有属性 `_data`，未来版本升级可能直接导致功能失效，且使用 `!` 断言绕过了空值检查。

**建议修复**: 维护自己的 source data 缓存，或查找是否有官方 API 获取当前数据。

---

## 中等问题（中优先级）

---

### 问题 11 — 内存泄漏：`Track` 中 zoomend 监听器可能叠加

**文件**: `src/modules/Track/index.ts`（约第 115–118 行）

**问题**: 在 `_onHandle()` 中反复 `add`/`remove` `zoomend` 监听，如果快速多次触发，可能出现监听器未被正确移除就再次添加的情况。

**建议修复**: 使用防抖，或在添加前先无条件 `off` 一次：
```typescript
this.context.map.off('zoomend', this._handleZoomEnd)
this.context.map.on('zoomend', this._handleZoomEnd)
```

---

### 问题 12 — 类型不安全：`EventManager` 存储 `any` 类型处理器

**文件**: `src/core/EventManager/index.ts`（约第 15、112 行）

**当前代码**:
```typescript
private activeLayerListeners = new Map<string, (e: any) => void>()
```

**问题**: Map 声明为 `any`，但实际传入 `MapMouseEvent`，类型不一致，会丢失类型检查保护。

**建议修复**:
```typescript
private activeLayerListeners = new Map<string, (e: MapMouseEvent) => void>()
```

---

### 问题 13 — 性能问题：`ResourceRegister` 删除元素时 O(n) 更新索引

**文件**: `src/core/ResourceRegister/index.ts`（约第 156–180 行）

**问题**: 删除 feature 时，需要更新所有后续元素的 `featureIndex`，数据量大时性能很差。

**建议修复**: 改用 `Map<id, feature>` 存储，避免依赖数组索引：
```typescript
private features = new Map<string, Feature>()
```

---

### 问题 14 — 代码重复：`Line` 中存在几乎完全相同的方法对

**文件**: `src/modules/Plot/plugins/Line/index.ts`（约第 505–607 行）

**问题**: `reindexPoints()` 与 `_reindexPoints()`、`syncMidPoints()` 与 `_syncMidPoints()` 几乎完全相同，功能重复。

**建议修复**: 删除私有版本，统一用公开版本。

---

### 问题 15 — 代码重复：`EventState` 中 `switch()` 和 `changeStatus()` 功能重叠

**文件**: `src/core/EventState/index.ts`（约第 20–38 行）

**问题**: 两个方法功能几乎一样，但 `changeStatus()` 没有调用 `enabled/disabled`，行为不一致且容易混淆。

**建议修复**: 删除 `changeStatus()`，统一使用功能完整的 `switch()`。

---

### 问题 16 — 性能问题：`Line.render()` 逐个调用 point.render() 导致多次重绘

**文件**: `src/modules/Plot/plugins/Line/index.ts`（约第 257–286 行）

**问题**: 在循环中逐个调用每个 point 的 `render()` 和 `setGeoJSONData()`，每次都触发地图��绘。

**建议修复**: 先收集所有 Feature，再一次性调用 `setGeoJSONData()`。

---

### 问题 17 — 类型问题：`AisShip.offset()` 未检查 options 属性是否存在

**文件**: `src/modules/Ship/plugins/AisShip.ts`（约第 441–458 行）

**问题**: 直接访问 `this.options.top`、`this.options.bottom` 等属性，未检查是否为 `undefined`，可能在 options 未完整传入时产生运行时错误。

**建议修复**:
```typescript
offset(): Point {
  const { top = 0, bottom = 0, left = 0, right = 0 } = this.options ?? {}
  // ...
}
```

---

### 问题 18 — Bug：`Tooltip.connectLine()` 坐标 fallback 为 `[0, 0]`

**文件**: `src/core/Tooltip/index.ts`（约第 303–314 行）

**问题**: 当 `endPoint` 为 null 时，返回坐标为 `[0, 0]` 的 LineString Feature，会在地图上绘制一条奇怪的线到经纬度 (0,0) 处（几内亚湾）。

**建议修复**: 返回 `geometry: null` 的空 Feature：
```typescript
if (!endPoint) {
  return { type: 'Feature', geometry: null, id, properties: {} }
}
```

---

## 低优先级问题

---

### 问题 19 — 写法问题：`validate.ts` 的 `isNull()` 不够健壮

**文件**: `src/utils/validate.ts`（约第 4–14 行）

**当前代码**:
```typescript
return ['null', null, undefined, 'undefined', ''].includes(val)
// 以及
JSON.stringify(val) === '{}'
```

**问题**: 
- 检查字符串 `'null'` 可能产生误判
- `JSON.stringify` 检查空对象性能差，且无法处理含不可枚举属性的对象

**建议修复**:
```typescript
export function isNull(val: any): boolean {
  if (val === null || val === undefined) return true
  if (typeof val === 'string') return val === ''
  if (Array.isArray(val)) return val.length === 0
  if (typeof val === 'object') return Object.keys(val).length === 0
  return false
}
```

---

### 问题 20 — 精度问题：`Focus._expandBBox()` 使用固定的米/度换算常数

**文件**: `src/core/Focus/index.ts`（约第 180–188 行）

**当前代码**:
```typescript
const METERS_PER_DEGREE_LAT = 111319
```

**问题**: 地球不是完美球体，实际上 1 纬度对应的米数随纬度变化。在高纬度地区（如北欧）会产生明显偏差。

**建议修复**: 使用动态公式：
```typescript
const metersPerDegree = 111132.92 - 559.82 * Math.cos(2 * latRad) + 1.175 * Math.cos(4 * latRad)
```

---

### 问题 21 — 写法问题：`Line` 中 Point ID 来源混乱

**文件**: `src/modules/Plot/plugins/Line/index.ts`（约第 303–345 行）

**问题**: `createVertex()` 和 `createMid()` 接受一个 `id` 参数，但又在 `properties` 中生成了另一个不同的 id，两个 id 并存造成混淆。

**建议修复**: 统一 id 来源，只使用一个 id，避免两个不同含义的 id 字段。

---

### 问题 22 — 可维护性：`Track.simplifyTrackByZoom()` 中的魔法数字

**文件**: `src/modules/Track/index.ts`（约第 289–301 行）

**问题**: zoom 等级阈值、角度阈值等全部硬编码，无法在不修改源码的情况下调整。

**建议修复**: 将这些阈值提取为可配置的选项参数：
```typescript
interface SimplifyOptions {
  zoomThresholds: number[]
  angleThresholds: number[]
}
```

---

### 问题 23 — 设计问题：`Module` 中 `onAdd()` 可能被调用两次

**文件**: `src/core/Module/index.ts`（约第 14–28 行）

**问题**: 构造函数调用 `onAdd()`，`mount()` 方法也调用 `onAdd()`，如果使用方法不当会导致重复初始化。

**建议修复**: 明确规定只在 `mount()` 中调用 `onAdd()`，构造函数中不做初始化。

---

### 问题 24 — 内存泄漏：`IconManager` 异步加载缺少超时机制

**文件**: `src/core/IconManager/index.ts`（约第 16–17、63–92 行）

**问题**: `loadingPromises` Map 缓存进行中的 Promise，如果网络请求永远不返回，这个缓存项永远不会清理。

**建议修复**: 添加超时：
```typescript
const timeoutId = setTimeout(() => {
  this.loadingPromises.delete(name)
  reject(new Error(`Icon load timeout: ${name}`))
}, 10000)
```

---

### 问题 25 — 性能问题：`AisShip.getShape()` 重复调用投影计算

**文件**: `src/modules/Ship/plugins/AisShip.ts`（约第 166–187 行）

**问题**: `this.position()` 内部重复调用 `this.context.map.project()`，而 `getShape` 在 `getFeature` 中被调用，可能在同一帧内多次执行相同的投影计算。

**建议修复**: 计算一次位置后传入，避免重复投影：
```typescript
const pos = this.position()
const shape = this.getShape(pos)
```

---

### 问题 26 — 事件处理：`PointEvents` 中事件绑定/解绑可能因引用不同失效

**文件**: `src/modules/Plot/plugins/Events/PointEvents.ts`（约第 25–178 行）

**问题**: 类属性箭头函数在某些场景下重新创建后引用不同，`off()` 时找不到原始函数引用，导致监听器无法正确移除。

**建议修复**: 在构造函数中统一绑定：
```typescript
constructor() {
  this.onMousedown = this.onMousedown.bind(this)
  this.onMousemove = this.onMousemove.bind(this)
  this.onMouseup = this.onMouseup.bind(this)
}
```

---

### 问题 27 — 写法问题：`Point.getFeature()` 空状态属性结构不一致

**文件**: `src/modules/Plot/plugins/Point/index.ts`（约第 90–105 行）

**问题**: 当 `options.position` 为 null 时，返回的 Feature 缺少其他情况下应有的属性字段，消费方需要做额外的判断。

**建议修复**: 保证返回 Feature 的 properties 结构始终一致，使用空值而非缺失字段。

---

### 问题 28 — 性能问题：`AisShip` 标签碰撞检测在每帧全量遍历

**文件**: `src/modules/Ship/plugins/AisShip.ts`

**问题**: 碰撞检测逻辑每次渲染都对所有船只全量运算，在船只数量较多（如数百艘）时性能明显下降。

**建议修复**: 考虑使用空间索引（如 RBush）加速碰撞检测，或在 zoomend 后才触发全量重算，zoom 过程中跳过。

---

### 问题 29 — 写法：多处使用 `as SourceSpecification` 等强制类型转换绕过检查

**文件**: `src/modules/CMap/index.ts` 及其他文件

**问题**: 多处使用 `as XXX` 强制类型转换来绕过 TypeScript 类型检查，降低了类型安全性。

**建议修复**: 逐一排查，改为使用类型守卫或正确的类型定义，减少 `as` 的使用。

---

### 问题 30 — 文档：复杂逻辑缺少注释，注释中英混用

**文件**: 多处（如 `Point.calculateTextOffset()`）

**问题**: 部分复杂计算逻辑无注释，部分文件中英注释混用，影响可读性和维护性。

**建议修复**: 对复杂算法补充注释；统一注释语言（建议全中文或全英文）。

---

## 汇总

| # | 问题 | 文件 | 严重性 |
|---|------|------|--------|
| 1 | `new Function()` 代码注入漏洞 | Cache/index.ts | 严重 |
| 2 | Fill.move() 三元表达式颠倒 | Fill/index.ts | 严重 |
| 3 | Track 用航向角检查速度 | Track/index.ts | 严重 |
| 4 | Cache.removeAll() 越界 | Cache/index.ts | 严重 |
| 5 | Tooltip 事件监听器堆积 | Tooltip/index.ts | 高 |
| 6 | mapLoaded() 轮询替代事件 | CMap/index.ts | 高 |
| 7 | getOffDOMSize() 每次克隆 DOM | Tooltip/index.ts | 高 |
| 8 | Track.render() 全量重建 Tooltip | Track/index.ts | 高 |
| 9 | isIntersect() 实现是包含检查 | CollisionItem.ts | 高 |
| 10 | 访问 mapbox 私有属性 `_data` | CMap/index.ts | 高 |
| 11 | zoomend 监听器可能叠加 | Track/index.ts | 中 |
| 12 | EventManager 存储 any 类型 | EventManager/index.ts | 中 |
| 13 | 删除元素时 O(n) 索引更新 | ResourceRegister/index.ts | 中 |
| 14 | Line 中重复方法对 | Line/index.ts | 中 |
| 15 | EventState 中方法重叠 | EventState/index.ts | 中 |
| 16 | Line.render() 逐个触发重绘 | Line/index.ts | 中 |
| 17 | AisShip.offset() 未检查 undefined | AisShip.ts | 中 |
| 18 | connectLine() fallback 到 (0,0) | Tooltip/index.ts | 中 |
| 19 | isNull() 实现不健壮 | validate.ts | 低 |
| 20 | 固定米/度换算常数 | Focus/index.ts | 低 |
| 21 | Point ID 来源混乱 | Line/index.ts | 低 |
| 22 | 魔法数字无法配置 | Track/index.ts | 低 |
| 23 | onAdd() 可能被调用两次 | Module/index.ts | 低 |
| 24 | 图标加载无超时机制 | IconManager/index.ts | 低 |
| 25 | getShape() 重复投影计算 | AisShip.ts | 低 |
| 26 | PointEvents 事件解绑可能失效 | PointEvents.ts | 低 |
| 27 | 空状态 Feature 属性不一致 | Point/index.ts | 低 |
| 28 | 碰撞检测全量遍历 | AisShip.ts | 低 |
| 29 | 多处 `as` 强制类型转换 | 多处 | 低 |
| 30 | 复杂逻辑缺注释，中英混用 | 多处 | 低 |
