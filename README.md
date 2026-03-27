# 🌍 CMap-Core

> 基于 Mapbox GL JS 的高性能 WebGIS SDK，专为海事、交管、航运及军标态势标绘领域打造

[![npm version](https://badge.fury.io/js/cmap-core.svg)](https://www.npmjs.com/package/cmap-core)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Mapbox GL](https://img.shields.io/badge/Mapbox%20GL-3.18-green)](https://docs.mapbox.com/mapbox-gl-js/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📖 目录

- [✨ 核心特性](#-核心特性)
- [🛠 技术栈](#-技术栈)
- [📦 安装](#-安装)
- [🚀 快速开始](#-快速开始)
- [🎯 核心模块](#-核心模块)
  - [CMap 地图核心](#1-cmap-地图核心)
  - [Ship 船舶管理](#2-ship-船舶管理)
  - [Track 轨迹管理](#3-track-轨迹管理)
  - [Plot 标绘引擎](#4-plot-标绘引擎)
  - [IconManager 图标管理](#5-iconmanager-图标管理)
  - [EventManager 事件管理](#6-eventmanager-事件管理)
  - [ResourceRegister 资源注册](#7-resourceregister-资源注册)
- [🏗 架构设计](#-架构设计)
- [⚡ 性能优化](#-性能优化)
- [📚 完整 API 参考](#-完整-api-参考)
- [🛠 开发指南](#-开发指南)
- [❓ 常见问题](#-常见问题)

---

## ✨ 核心特性

### 🚢 专业船舶模块
- 内置基于真实长宽比的船体计算算法
- 支持高层级真实船型与低层级图标的无缝切换
- 自动计算航向预测线与转向辅助线
- 智能状态判断（在线、延迟、离线）
- 支持 RBush 空间索引的碰撞检测

### 🛣️ 智能轨迹模块
- 基于视图缩放层级与航向角差值的**抽稀算法**
- 海量历史轨迹秒级渲染
- 自动识别特征点：起点、终点、急转弯、启停状态、时间锚点
- 智能角度平滑处理

### 📐 全功能标绘引擎
- 支持 **7 种**标绘类型：点、序号点、图标点、线、箭头线、序号线、面
- 内置完整的状态机管理
- 支持节点拖拽、中点分裂、整体平滑移动
- 图形尺寸随地图缩放线性变化
- 色彩支持数据驱动同步

### 🚀 极高渲染性能
- **O(1) 哈希表算法**替代传统遍历更新
- **requestAnimationFrame 防抖调度**批量提交更新
- **降维空间计算**：使用 2D 矩阵替代球面几何，性能提升 90%
- **事件委托架构**：唯一监听器代理分发，根除内存泄漏

### 🛡️ 智能防遮挡
- 集成 **RBush 空间索引树**
- 动态计算 Tooltip 锚点位置
- 自动处理海量标签重叠问题

---

## 🛠 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/) | ^3.18.1 | 地图渲染引擎 |
| [TypeScript](https://www.typescriptlang.org/) | ~5.9.3 | 开发语言（严格模式） |
| [Vite](https://vitejs.dev/) | ^7.2.4 | 构建工具 |
| [@turf/turf](https://turfjs.org/) | ^7.1.0 | 地理空间分析 |
| [RBush](https://github.com/mourner/rbush) | ^4.0.1 | 高性能空间索引 |
| [EventEmitter3](https://github.com/primus/eventemitter3) | ^5.0.1 | 事件管理 |
| [dayjs](https://day.js.org/) | ^1.11.19 | 时间处理 |
| [lodash-es](https://lodash.com/) | ^4.17.21 | 工具函数库 |

---

## 📦 安装

### NPM 安装

```bash
# npm
npm install cmap-core

# yarn
yarn add cmap-core

# pnpm（推荐）
pnpm add cmap-core
```

### CDN 引入

```html
<link href="https://unpkg.com/cmap-core/dist/cmap-core.css" rel="stylesheet" />
<script src="https://unpkg.com/cmap-core/dist/index.umd.js"></script>
```

---

## 🚀 快速开始

### 基础示例

```typescript
import { CMap } from 'cmap-core'
import 'cmap-core/dist/cmap-core.css'

// 1. 创建地图实例
const map = new CMap({
  container: 'map-container',
  type: CMap.LAND, // 或 CMap.SATELLITE
  TDTToken: 'your-tianditu-token',
  center: [120.15, 30.28],
  zoom: 12,
})

// 2. 等待地图加载完成
await map.mapLoaded()
console.log('地图已就绪！')

// 3. 添加船舶
import { Ship } from 'cmap-core'

const ship = new Ship(map)
ship.add({
  id: 'ship-001',
  name: '测试船舶',
  position: [120.15, 30.28],
  direction: 45,
  speed: 12.5,
  hdg: 50,
  cog: 48,
  time: new Date(),
})
```

---

## 🎯 核心模块

### 1. CMap 地图核心

`CMap` 是整个 SDK 的基石，封装了 Mapbox GL JS 的 Map 实例，提供统一的地图管理能力。

#### 构造函数

```typescript
new CMap(options: ICMapOptions)
```

#### 参数详解：ICMapOptions

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|:----:|--------|------|
| `container` | `string \| HTMLElement` | ✅ | - | 地图容器 ID 或 DOM 元素 |
| `type` | `MapType` | ❌ | `MapType.LAND` | 底图类型 |
| `TDTToken` | `string` | ❌ | 内置 token | 天地图 Token |
| `center` | `LngLatLike` | ❌ | `[0, 0]` | 初始中心点 [经度, 纬度] |
| `zoom` | `number` | ❌ | `0` | 初始缩放级别 (1-18) |
| `minZoom` | `number` | ❌ | `1` | 最小缩放级别 |
| `maxZoom` | `number` | ❌ | `18` | 最大缩放级别 |
| `bearing` | `number` | ❌ | `0` | 初始方位角（度，0-360） |
| `pitch` | `number` | ❌ | `0` | 初始倾斜角（度，0-60） |
| `style` | `object` | ❌ | - | 地图容器样式 `{ width, height }` |
| ... | - | - | - | 支持所有 Mapbox GL JS 的 MapOptions |

#### MapType 枚举

```typescript
enum MapType {
  LAND = 'land',           // 天地图矢量底图（含路网注记）
  SATELLITE = 'satellite'  // 天地图卫星影像底图（含路网注记）
}
```

#### 实例属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `map` | `Map` | Mapbox GL JS 地图实例（原生） |
| `icon` | `IconManager` | 图标管理器实例 |

#### 主要方法

##### `mapLoaded(): Promise<Map>`

安全地等待地图资源加载完成。内部采用轮询机制（16ms），彻底解决了 Mapbox 原生 `load` 事件偶尔不触发的痛点。

```typescript
await map.mapLoaded()
// 地图已完全加载，可以安全使用
```

**返回值**: `Promise<Map>` - 返回 Mapbox GL JS Map 实例

---

##### `change(type: MapType): void`

无缝切换底图类型。

```typescript
map.change(CMap.SATELLITE)  // 切换到影像底图
map.change(CMap.LAND)       // 切换到矢量底图
```

**参数**:
- `type` - 底图类型（`MapType.LAND` 或 `MapType.SATELLITE`）

---

##### `zoomIn(duration?: number): void`

放大地图（Zoom + 1），自带过渡动画。

```typescript
map.zoomIn(1000)  // 1秒动画放大
```

**参数**:
- `duration` - 动画时长（毫秒），默认 500ms

---

##### `zoomOut(duration?: number): void`

缩小地图（Zoom - 1），自带过渡动画。

```typescript
map.zoomOut(1000)  // 1秒动画缩小
```

**参数**:
- `duration` - 动画时长（毫秒），默认 500ms

---

#### 事件系统

##### `beforeRemove` 事件

在地图被销毁前触发，允许开发者**拦截或阻断销毁流程**。

```typescript
map.map.on('beforeRemove', (e: BeforeRemoveEvent) => {
  if (hasUnsavedChanges) {
    e.cancel()  // 阻止销毁
  } else {
    e.next()    // 继续销毁
  }
})
```

**事件对象**:
```typescript
interface BeforeRemoveEvent {
  cancel: () => void  // 阻止销毁
  next: () => void    // 继续销毁
}
```

---

### 2. Ship 船舶管理

`Ship` 模块负责船舶的加载、渲染、更新和交互管理，支持插件化扩展。

#### 构造函数

```typescript
new Ship(map: Map, options?: ShipModuleOptions)
```

**参数**:
- `map` - Mapbox GL JS Map 实例
- `options` - 配置选项（可选）

#### 主要方法

##### `add<T extends IBaseShipOptions>(data: T): BaseShip<T>`

添加单个船舶。

```typescript
const ship = ship.add({
  id: 'ship-001',
  name: '测试船舶',
  position: [120.15, 30.28],
  direction: 45,
  speed: 12.5,
  hdg: 50,
  cog: 48,
  rot: 0,
  type: 'cargo',
  time: new Date(),
})
```

**返回值**: `BaseShip<T>` - 船舶实例

---

##### `load<T extends IBaseShipOptions>(list: T[]): BaseShip<T>[]`

批量加载船舶数据。

```typescript
const ships = ship.load([
  { id: 'ship-001', name: '船舶1', position: [120.15, 30.28], ... },
  { id: 'ship-002', name: '船舶2', position: [120.16, 30.29], ... },
])
```

**返回值**: `BaseShip<T>[]` - 船舶实例数组

---

##### `select(id: string | number): void`

选中船舶并镜头聚焦。

```typescript
ship.select('ship-001')
```

---

##### `unselect(id?: string | number): void`

取消选中船舶。

```typescript
ship.unselect('ship-001')
// 或不传参数取消所有选中
ship.unselect()
```

---

##### `get(id: string | number): BaseShip | undefined`

获取指定船舶实例。

```typescript
const ship = ship.get('ship-001')
if (ship) {
  console.log(ship.name)
}
```

---

##### `getAll(): BaseShip[]`

获取所有船舶实例。

```typescript
const allShips = ship.getAll()
console.log(`当前有 ${allShips.length} 艘船舶`)
```

---

##### `remove(id: string | number): void`

移除指定船舶。

```typescript
ship.remove('ship-001')
```

---

##### `clear(): void`

清空所有船舶。

```typescript
ship.clear()
```

---

#### 参数详解：IBaseShipOptions

所有船舶类型的基础配置接口。

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|:----:|--------|------|
| `id` | `string \| number` | ✅ | - | 船舶唯一标识（如 MMSI） |
| `name` | `string` | ✅ | - | 船舶名称 |
| `position` | `LngLat` | ✅ | - | 船舶位置 [经度, 纬度] |
| `direction` | `number` | ✅ | - | 船舶朝向（度，0-360，正北为0） |
| `speed` | `number` | ✅ | - | 船舶速度（节，knots） |
| `hdg` | `number` | ✅ | - | 船首向（度，0-360） |
| `cog` | `number` | ✅ | - | 航迹向（度，0-360） |
| `rot` | `number` | ✅ | - | 转向率（度/分钟） |
| `type` | `string` | ✅ | - | 船舶类型 |
| `time` | `Date` | ✅ | - | 数据时间戳 |
| `statusId` | `number` | ❌ | - | 状态 ID |
| `status` | `string` | ❌ | - | 状态描述 |
| `tooltip` | `boolean` | ❌ | `true` | 是否显示提示框 |
| `realZoom` | `number` | ❌ | - | 真实缩放级别 |
| `top` | `number` | ❌ | - | 顶部偏移（像素） |
| `left` | `number` | ❌ | - | 左侧偏移（像素） |
| `right` | `number` | ❌ | - | 右侧偏移（像素） |
| `bottom` | `number` | ❌ | - | 底部偏移（像素） |
| `icon` | `string` | ❌ | - | 自定义图标名称 |
| `minIconSize` | `number` | ❌ | - | 最小图标尺寸（像素） |
| `maxIconSize` | `number` | ❌ | - | 最大图标尺寸（像素） |
| `width` | `number` | ❌ | - | 船宽（米） |
| `height` | `number` | ❌ | - | 船长（米） |
| `props` | `Record<string, any>` | ❌ | - | 自定义属性对象 |

#### 船舶状态判断

船舶会根据时间自动判断状态：

- **在线** - 5分钟内有更新
- **延迟** - 5-15分钟有更新
- **离线** - 15分钟以上无更新

#### 完整示例

```typescript
import { Ship, AisShip } from 'cmap-core'

// 创建船舶管理器
const ship = new Ship(map)

// 批量加载
ship.load([
  {
    id: '413363020',
    name: 'PENG XIANG 128',
    position: [122.088970, 30.006870],
    direction: 92,
    speed: 12.5,
    hdg: 92,
    cog: 90,
    rot: 0,
    type: 'cargo',
    width: 15,
    height: 55,
    time: new Date(),
  },
])

// 选中船舶
ship.select('413363020')

// 监听事件
ship.on('ship-click', (ship) => {
  console.log('点击了船舶:', ship.name)
})

ship.on('ship-hover', (ship) => {
  console.log('悬停在:', ship.name)
})
```

---

### 3. Track 轨迹管理

`Track` 模块提供智能轨迹渲染和抽稀算法。

#### 构造函数

```typescript
new Track(map: Map, options?: ITrackOptions)
```

**参数**:
- `map` - Mapbox GL JS Map 实例
- `options` - 轨迹配置（可选）

#### 主要方法

##### `add(item: TrackItem): void`

添加单个轨迹点。

```typescript
track.add({
  id: 'point-001',
  pId: 'ship-001',
  index: 0,
  position: [120.15, 30.28],
  cog: 45,
  sog: 10,
  time: new Date(),
})
```

---

##### `load(items: TrackItem[]): void`

批量加载轨迹点。

```typescript
track.load([
  { id: 'p1', pId: 'ship-001', index: 0, position: [120.15, 30.28], time: new Date() },
  { id: 'p2', pId: 'ship-001', index: 1, position: [120.16, 30.29], time: new Date() },
])
```

---

##### `select(pId: string): void`

选中轨迹并镜头聚焦。

```typescript
track.select('ship-001')
```

---

##### `get(pId: string): TrackItem[]`

获取指定船舶的轨迹。

```typescript
const trackPoints = track.get('ship-001')
console.log(`轨迹包含 ${trackPoints.length} 个点`)
```

---

##### `remove(pId: string): void`

移除指定轨迹。

```typescript
track.remove('ship-001')
```

---

##### `clear(): void`

清空所有轨迹。

```typescript
track.clear()
```

---

#### 参数详解：TrackItem

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|:----:|--------|------|
| `id` | `string` | ✅ | - | 轨迹点唯一标识 |
| `pId` | `string` | ✅ | - | 父级 ID（通常为船舶 ID） |
| `index` | `number` | ✅ | - | 轨迹点索引（用于排序） |
| `position` | `LngLat` | ✅ | - | 位置坐标 [经度, 纬度] |
| `cog` | `number` | ❌ | - | 航迹向（度，0-360） |
| `sog` | `number` | ❌ | - | 对地速度（节） |
| `time` | `Date` | ✅ | - | 时间戳 |
| `props` | `Record<string, any>` | ❌ | - | 自定义属性 |

#### 参数详解：ITrackOptions

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|:----:|--------|------|
| `startLabel` | `string` | ❌ | `'起'` | 起点标签文本 |
| `endLabel` | `string` | ❌ | `'终'` | 终点标签文本 |

#### 轨迹特征点类型

轨迹会自动标记以下特征点：

| 类型 | 值 | 优先级 | 说明 |
|------|------|:----:|------|
| `TooltipType.START_END` | 0 | 最高 | 起终点 |
| `TooltipType.SHARP_TURN` | 1 | 高 | 急转弯（航向变化大） |
| `TooltipType.STOP_GO` | 2 | 中 | 启停变化（速度变化大） |
| `TooltipType.TIME_ANCHOR` | 3 | 低 | 时间锚点（固定间隔） |
| `TooltipType.NORMAL` | 9 | 最低 | 普通点 |

#### 轨迹抽稀算法

##### 基于航向变化抽稀

```typescript
/**
 * 根据航向变化抽稀轨迹
 * @param track - 轨迹点数组
 * @param angleThreshold - 航向变化阈值（度），默认 2 度
 */
simplifyTrackBySlope(track: TrackItem[], angleThreshold = 2): TrackItem[]
```

**示例**:
```typescript
const simplified = track.simplifyTrackBySlope(rawData, 5)
// 保留航向变化超过 5 度的点
```

---

##### 基于缩放层级抽稀

```typescript
/**
 * 根据缩放层级抽稀轨迹
 * @param track - 轨迹点数组
 * @param zoom - 当前地图缩放级别
 */
simplifyTrackByZoom(track: TrackItem[], zoom: number): TrackItem[]
```

**示例**:
```typescript
const simplified = track.simplifyTrackByZoom(rawData, map.getZoom())
// 根据当前缩放级别自动调整采样率
```

#### 完整示例

```typescript
import { Track } from 'cmap-core'

const track = new Track(map, {
  startLabel: '起点',
  endLabel: '终点',
})

// 添加轨迹数据
const trackData = [
  {
    id: 't1',
    pId: 'ship-001',
    index: 0,
    position: [120.15, 30.28],
    cog: 45,
    sog: 10,
    time: new Date('2024-01-01T00:00:00'),
  },
  {
    id: 't2',
    pId: 'ship-001',
    index: 1,
    position: [120.16, 30.29],
    cog: 50,
    sog: 12,
    time: new Date('2024-01-01T00:05:00'),
  },
]

track.load(trackData)

// 选中轨迹
track.select('ship-001')
```

---

### 4. Plot 标绘引擎

`Plot` 模块提供完整的标绘功能，支持点、线、面等图形的创建、编辑和管理。

#### 支持的图形类型

| 类型 | 类名 | 说明 |
|------|------|------|
| 点 | `Point` | 基础圆点标绘 |
| 序号点 | `IndexPoint` | 带序号标签的点 |
| 图标点 | `IconPoint` | 使用自定义图标的点 |
| 线 | `Line` | 折线标绘 |
| 箭头线 | `ArrowLine` | 带箭头的折线 |
| 序号线 | `IndexLine` | 带序号标签的线 |
| 面 | `Fill` | 多边形填充区域 |

#### 基础接口：IPoiOptions

所有标绘元素都继承此接口：

```typescript
interface IPoiOptions {
  id: string                        // 唯一标识（必填）
  name?: string                     // 显示名称
  visibility: PlotVisibility         // 可见性（必填）
  isName?: boolean                  // 是否显示名称标签
  style?: any                       // 样式配置
  properties?: Record<string, any>  // 自定义属性
}
```

#### PlotVisibility 类型

```typescript
type PlotVisibility = 'visible' | 'none'
```

---

#### Point - 基础点标绘

用于在地图上标记单个位置，支持自定义颜色、大小、边框等样式。

##### 构造函数

```typescript
new Point(map: Map, options: IPointOptions)
```

##### 参数详解：IPointOptions

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|:----:|--------|------|
| `id` | `string` | ✅ | - | 点的唯一标识 |
| `name` | `string` | ❌ | - | 点的名称 |
| `position` | `LngLat` | ✅ | - | 点位置 [经度, 纬度] |
| `visibility` | `PlotVisibility` | ✅ | - | 可见性（`'visible'` 或 `'none'`） |
| `isName` | `boolean` | ❌ | `false` | 是否显示名称 |
| `style` | `PointStyle` | ❌ | - | 点样式配置 |
| `properties` | `Record<string, any>` | ❌ | - | 自定义属性 |

##### 样式配置：PointStyle

```typescript
interface PointStyle {
  'circle-radius'?: number           // 圆半径（像素），默认 5
  'circle-color'?: string            // 填充颜色（CSS 颜色值），默认 '#000000'
  'circle-stroke-width'?: number     // 边框宽度（像素），默认 1
  'circle-stroke-color'?: string     // 边框颜色（CSS 颜色值），默认 '#000000'
  'circle-opacity'?: number          // 填充透明度（0-1），默认 1
  'circle-stroke-opacity'?: number   // 边框透明度（0-1），默认 1
}
```

##### 主要方法

```typescript
// 创建模式（进入绘制状态）
point.start(): void

// 停止创建
point.stop(): void

// 进入编辑模式（显示控制点）
point.edit(): void

// 退出编辑模式
point.unedit(): void

// 移动点到新位置
point.move(position: LngLat): void

// 更新配置
point.update(options: IPointOptions): void

// 显示点
point.show(): void

// 隐藏点
point.hide(): void

// 聚焦点
point.focus(): void

// 取消聚焦
point.unfocus(): void

// 移除点
point.remove(): void

// 渲染到地图
point.render(): void
```

##### 使用示例

```typescript
import { Point } from 'cmap-core'

const point = new Point(map, {
  id: 'point-001',
  name: '标注点',
  position: [120.15, 30.28],
  visibility: 'visible',
  isName: true,
  style: {
    'circle-radius': 10,
    'circle-color': '#ff0000',
    'circle-stroke-width': 2,
    'circle-stroke-color': '#ffffff',
    'circle-opacity': 0.8,
  },
})

// 显示点
point.show()

// 进入编辑模式
point.edit()

// 监听事件
point.on('click', () => {
  console.log('点击了点')
})

point.on('doneUpdate', () => {
  console.log('点已更新')
})
```

---

#### IndexPoint - 序号点

带序号标签的点标绘，自动显示序号。

##### 构造函数

```typescript
new IndexPoint(map: Map, options: IIndexPointOptions)
```

##### 参数详解：IIndexPointOptions

继承 `IPointOptions`，额外添加：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|:----:|--------|------|
| `index` | `number` | ❌ | 自动递增 | 序号 |

##### 使用示例

```typescript
import { IndexPoint } from 'cmap-core'

const point1 = new IndexPoint(map, {
  id: 'point-1',
  name: '第一个点',
  position: [120.15, 30.28],
  index: 1,  // 显示序号 1
  visibility: 'visible',
})

const point2 = new IndexPoint(map, {
  id: 'point-2',
  name: '第二个点',
  position: [120.16, 30.29],
  index: 2,  // 显示序号 2
  visibility: 'visible',
})
```

---

#### IconPoint - 图标点

使用自定义图标的点标绘。

##### 构造函数

```typescript
new IconPoint(map: Map, options: IIconPointOptions)
```

##### 参数详解：IIconPointOptions

继承 `IPointOptions`，额外添加：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|:----:|--------|------|
| `icon` | `string` | ❌ | - | 图标名称（需在 IconManager 中注册） |
| `iconSize` | `number` | ❌ | `32` | 图标大小（像素） |
| `iconRotate` | `number` | ❌ | `0` | 图标旋转角度（度） |

##### 使用示例

```typescript
import { IconPoint } from 'cmap-core'

const iconPoint = new IconPoint(map, {
  id: 'icon-point-001',
  name: '图标点',
  position: [120.15, 30.28],
  icon: 'ship-icon',  // 图标名称
  iconSize: 32,
  iconRotate: 45,
  visibility: 'visible',
  isName: true,
})
```

---

#### Line - 线标绘

折线标绘，支持多段线、节点编辑、中点分裂等功能。

##### 构造函数

```typescript
new Line(map: Map, options: ILineOptions)
```

##### 参数详解：ILineOptions

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|:----:|--------|------|
| `id` | `string` | ✅ | - | 线的唯一标识 |
| `name` | `string` | ❌ | - | 线的名称 |
| `position` | `LineStringPosition` | ✅ | - | 线的位置（点数组） |
| `visibility` | `PlotVisibility` | ✅ | - | 可见性 |
| `isName` | `boolean` | ❌ | `false` | 是否显示名称 |
| `style` | `LineStyle` | ❌ | - | 线样式配置 |
| `vertexStyle` | `PointStyle` | ❌ | - | 编辑时顶点样式 |
| `midStyle` | `PointStyle` | ❌ | - | 编辑时中点样式 |
| `properties` | `Record<string, any>` | ❌ | - | 自定义属性 |

```typescript
type LineStringPosition = LngLat[]  // 例如: [[120.15, 30.28], [120.16, 30.29]]
```

##### 样式配置：LineStyle

```typescript
interface LineStyle {
  'line-color'?: string | DataDrivenPropertyValueSpecification<ColorSpecification>  // 线颜色
  'line-width'?: number | DataDrivenPropertyValueSpecification<number>              // 线宽度（像素）
  'line-opacity'?: number                                                             // 线透明度（0-1）
  'line-dasharray'?: number[]                                                        // 虚线模式 [实线长, 间隔长]
  'line-join'?: 'bevel' | 'round' | 'miter'                                         // 连接点样式
  'line-cap'?: 'butt' | 'round' | 'square'                                          // 端点样式
  'text-size'?: number                                                                // 文字大小
}
```

##### 主要方法

```typescript
// 创建模式（进入绘制状态）
line.start(): void

// 停止创建
line.stop(): void

// 进入编辑模式（显示顶点和中点）
line.edit(): void

// 退出编辑模式
line.unedit(): void

// 移动整条线
line.move(position: LngLat): void

// 更新配置
line.update(options: ILineOptions): void

// 插入节点（在指定位置）
line.insertPoint(index: number, position: LngLat): PointInstance

// 更新节点位置
line.updatePoint(index: number, position: LngLat): void

// 移除节点
line.removePointAt(index: number): void

// 获取节点
line.getPoint(index: number): PointInstance | null

// 获取中点
line.getMidPoint(index: number): Point | null

// 显示/隐藏
line.show(): void
line.hide(): void

// 聚焦/取消聚焦
line.focus(): void
line.unfocus(): void

// 移除
line.remove(): void

// 渲染到地图
line.render(): void
```

##### 使用示例

```typescript
import { Line } from 'cmap-core'

const line = new Line(map, {
  id: 'line-001',
  name: '航线',
  position: [
    [120.15, 30.28],
    [120.16, 30.29],
    [120.17, 30.30],
  ],
  visibility: 'visible',
  isName: true,
  style: {
    'line-color': '#ff0000',
    'line-width': 3,
    'line-opacity': 0.8,
    'line-join': 'round',
    'line-cap': 'round',
  },
  vertexStyle: {
    'circle-radius': 5,
    'circle-color': '#00ff00',
  },
  midStyle: {
    'circle-radius': 3,
    'circle-color': '#0000ff',
  },
})

// 显示线
line.show()

// 进入编辑模式
line.edit()

// 移动节点
line.updatePoint(1, [120.165, 30.295])

// 插入新节点
line.insertPoint(2, [120.175, 30.305])

// 监听事件
line.on('doneUpdate', () => {
  console.log('线已更新，新坐标:', line.options.position)
})
```

---

#### ArrowLine - 箭头线

带箭头的折线标绘，用于表示方向或流向。

##### 构造函数

```typescript
new ArrowLine(map: Map, options: IArrowLineOptions)
```

##### 参数详解：IArrowLineOptions

继承 `ILineOptions`，额外添加：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|:----:|--------|------|
| `arrowSize` | `number` | ❌ | `10` | 箭头大小（像素） |
| `arrowFrequency` | `number` | ❌ | `5` | 箭头频率（每几个点显示一个箭头） |

##### 使用示例

```typescript
import { ArrowLine } from 'cmap-core'

const arrowLine = new ArrowLine(map, {
  id: 'arrow-line-001',
  name: '流向',
  position: [
    [120.15, 30.28],
    [120.16, 30.29],
    [120.17, 30.30],
  ],
  visibility: 'visible',
  style: {
    'line-color': '#00ff00',
    'line-width': 2,
  },
  arrowSize: 12,
  arrowFrequency: 3,
})
```

---

#### IndexLine - 序号线

带序号标签的线标绘。

##### 构造函数

```typescript
new IndexLine(map: Map, options: IIndexLineOptions)
```

##### 参数详解：IIndexLineOptions

继承 `ILineOptions`，额外添加：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|:----:|--------|------|
| `index` | `number` | ❌ | 自动递增 | 序号 |

##### 使用示例

```typescript
import { IndexLine } from 'cmap-core'

const indexLine = new IndexLine(map, {
  id: 'index-line-001',
  name: '1号航线',
  position: [
    [120.15, 30.28],
    [120.16, 30.29],
  ],
  index: 1,
  visibility: 'visible',
})
```

---

#### Fill - 面标绘

多边形填充标绘，用于标示区域。

##### 构造函数

```typescript
new Fill(map: Map, options: IFillOptions)
```

##### 参数详解：IFillOptions

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|:----:|--------|------|
| `id` | `string` | ✅ | - | 面的唯一标识 |
| `name` | `string` | ❌ | - | 面的名称 |
| `position` | `PolygonPosition` | ✅ | - | 面的位置（点数组，首尾自动闭合） |
| `visibility` | `PlotVisibility` | ✅ | - | 可见性 |
| `isName` | `boolean` | ❌ | `false` | 是否显示名称 |
| `style` | `FillStyle` | ❌ | - | 面样式配置 |
| `properties` | `Record<string, any>` | ❌ | - | 自定义属性 |

```typescript
type PolygonPosition = LngLat[]  // 例如: [[120.15, 30.28], [120.16, 30.29], [120.17, 30.28]]
```

##### 样式配置：FillStyle

```typescript
interface FillStyle {
  'fill-color'?: string              // 填充颜色（CSS 颜色值）
  'fill-opacity'?: number            // 填充透明度（0-1）
  'fill-outline-color'?: string      // 边框颜色（CSS 颜色值）
  'fill-outline-width'?: number      // 边框宽度（像素）
  'fill-pattern'?: string            // 填充图案
}
```

##### 主要方法

与 `Line` 类似，支持：
- `start()` / `stop()` - 创建模式
- `edit()` / `unedit()` - 编辑模式
- `move()` - 移动整个面
- `insertPoint()` / `updatePoint()` / `removePointAt()` - 节点操作
- `show()` / `hide()` - 显示/隐藏
- `focus()` / `unfocus()` - 聚焦
- `remove()` - 移除
- `render()` - 渲染

##### 使用示例

```typescript
import { Fill } from 'cmap-core'

const fill = new Fill(map, {
  id: 'fill-001',
  name: '禁航区',
  position: [
    [120.15, 30.28],
    [120.16, 30.28],
    [120.16, 30.29],
    [120.15, 30.29],
    // 首尾自动闭合，无需重复
  ],
  visibility: 'visible',
  isName: true,
  style: {
    'fill-color': '#ff0000',
    'fill-opacity': 0.3,
    'fill-outline-color': '#ff0000',
    'fill-outline-width': 2,
  },
})

// 显示面
fill.show()

// 进入编辑模式
fill.edit()

// 监听事件
fill.on('doneUpdate', () => {
  console.log('面已更新，新坐标:', fill.options.position)
})
```

---

#### 标绘通用事件

所有标绘元素都支持以下事件：

```typescript
// 点击事件
poi.on('click', () => {
  console.log('点击了图形')
})

// 悬停事件
poi.on('hover', () => {
  console.log('悬停在图形上')
})

// 更新完成事件（拖拽结束）
poi.on('doneUpdate', () => {
  console.log('图形已更新')
})

// 创建完成事件
poi.on('doneCreate', () => {
  console.log('图形已创建')
})
```

---

### 5. IconManager 图标管理

`IconManager` 是图标资源缓存管理器，支持 SVG/PNG 材质的加载与管理。

#### 构造函数

```typescript
new IconManager(map: Map)
```

#### 主要方法

##### `loadSvg(icons: SvgIcon[]): Promise<void>`

批量加载 SVG 图标。

```typescript
await iconManager.loadSvg([
  {
    name: 'custom-ship',
    svg: '<svg viewBox="0 0 1024 1024"><path d="..." fill="#f00"/></svg>',
  },
])
```

**参数**: `SvgIcon[]` - SVG 图标数组
```typescript
interface SvgIcon {
  name: string    // 图标名称（唯一标识）
  svg: string     // SVG 字符串
}
```

**返回值**: `Promise<void>`

---

##### `load(icons: Icon[]): Promise<void>`

批量加载外部图片。

```typescript
await iconManager.load([
  {
    name: 'ship-icon',
    url: 'https://example.com/ship.png',
  },
])
```

**参数**: `Icon[]` - 图标配置数组
```typescript
interface Icon {
  name: string    // 图标名称（唯一标识）
  url: string     // 图片 URL
}
```

**返回值**: `Promise<void>`

---

##### `getImage(name: string): Image | undefined`

获取已缓存的图片。

```typescript
const image = iconManager.getImage('custom-ship')
if (image) {
  console.log('图片尺寸:', image.width, 'x', image.height)
}
```

**返回值**: `Image | undefined`

---

##### `has(name: string): boolean`

检查图标是否已加载。

```typescript
if (iconManager.has('custom-ship')) {
  console.log('图标已存在')
}
```

**返回值**: `boolean`

---

##### `delete(name: string): void`

删除图标缓存。

```typescript
iconManager.delete('custom-ship')
```

---

#### 使用示例

```typescript
import { IconManager } from 'cmap-core'

const iconManager = new IconManager(map)

// 加载 SVG 图标
await iconManager.loadSvg([
  {
    name: 'ship-online',
    svg: '<svg viewBox="0 0 1024 1024"><path d="M512 0C229.2 0 0 229.2 0 512s229.2 512 512 512 512-229.2 512-512S794.8 0 512 0z" fill="#00ff00"/></svg>',
  },
  {
    name: 'ship-offline',
    svg: '<svg viewBox="0 0 1024 1024"><path d="M512 0C229.2 0 0 229.2 0 512s229.2 512 512 512 512-229.2 512-512S794.8 0 512 0z" fill="#ff0000"/></svg>',
  },
])

// 加载外部图片
await iconManager.load([
  {
    name: 'custom-icon',
    url: 'https://example.com/icon.png',
  },
])

// 使用图标
ship.add({
  id: 'ship-001',
  icon: 'ship-online',  // 使用已加载的图标
  ...otherOptions
})
```

---

### 6. EventManager 事件管理

`EventManager` 是统一的事件分发系统，解决 Mapbox 事件绑定的问题。

#### 主要特点

- **事件委托**: 底层唯一监听器代理分发，避免内存泄漏
- **ID 强制转换**: 解决数字/字符串 ID 查找不一致问题
- **智能分发**: 根据 Feature ID 精准定位事件目标

#### 使用示例

```typescript
import { EventManager } from 'cmap-core'

// EventManager 通常由各模块内部使用
// 开发者可以通过模块的事件系统进行交互

// 船舶点击事件
ship.on('ship-click', (ship) => {
  console.log('点击了船舶:', ship.name)
})

// 轨迹悬停事件
track.on('track-hover', (point) => {
  console.log('悬停在轨迹点:', point)
})
```

---

### 7. ResourceRegister 资源注册

`ResourceRegister` 是高性能的地图资源管理器，处理 Source 和 Layer 的增删改查。

#### 主要特点

- **防抖调度**: 使用 `requestAnimationFrame` 批量提交更新
- **哈希表优化**: 采用 O(1) 算法替代传统遍历
- **增量更新**: 只在数据真正变化时触发渲染
- **层级排序**: 支持 zIndex 控制图层渲染顺序

#### 主要方法

##### `addSource(id: string, source: SourceSpecification): void`

幂等地添加 Source。

```typescript
resourceRegister.addSource('my-source', {
  type: 'geojson',
  data: { type: 'FeatureCollection', features: [] },
})
```

---

##### `addLayer(sortLayer: SortLayer): void`

幂等地添加 Layer，支持 zIndex 排序。

```typescript
resourceRegister.addLayer({
  layer: {
    id: 'my-layer',
    type: 'circle',
    source: 'my-source',
    paint: {
      'circle-radius': 10,
      'circle-color': '#ff0000',
    },
  },
  zIndex: 5,
})
```

---

##### `setGeoJSONData(id: string, data: GeoJSON.Feature | GeoJSON.Feature[]): void`

更新 GeoJSON 数据，自动 diff 和防抖。

```typescript
resourceRegister.setGeoJSONData('my-source', {
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [120.15, 30.28] },
  properties: {},
})
```

---

##### `removeLayer(layerId: string): void`

移除 Layer。

```typescript
resourceRegister.removeLayer('my-layer')
```

---

##### `removeSource(sourceId: string): void`

移除 Source。

```typescript
resourceRegister.removeSource('my-source')
```

---

##### `findFeature(source: string, featureId: string | number): GeoJSON.Feature | undefined`

查找 Feature。

```typescript
const feature = resourceRegister.findFeature('my-source', 'feature-001')
```

---

##### `destroy(): void`

销毁清理（从地图上移除所有添加的资源）。

```typescript
resourceRegister.destroy()
```

---

#### 使用示例

```typescript
import { ResourceRegister } from 'cmap-core'

// ResourceRegister 通常由 Context 管理，开发者无需直接操作
// 但了解其工作原理有助于理解性能优化

// 模块内部使用示例
class MyModule extends Module {
  onAdd(): void {
    // 添加数据源
    this.context.register.addSource('my-source', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })

    // 添加图层
    this.context.register.addLayer({
      layer: {
        id: 'my-layer',
        type: 'circle',
        source: 'my-source',
        paint: { 'circle-radius': 10 },
      },
      zIndex: 5,
    })
  }

  updateData(data: GeoJSON.Feature[]) {
    // 更新数据（自动防抖和 diff）
    this.context.register.setGeoJSONData('my-source', data)
  }

  onRemove(): void {
    // 清理资源
    this.context.register.removeLayer('my-layer')
    this.context.register.removeSource('my-source')
  }
}
```

---

## 🏗 架构设计

### 核心架构图

```
┌─────────────────────────────────────────────┐
│                   CMap                      │
│  (Mapbox GL JS 封装，统一地图入口)            │
│  - 底图切换                                   │
│  - 生命周期管理                               │
│  - 事件拦截                                   │
└─────────────────┬───────────────────────────┘
                  │
      ┌───────────┼───────────┐
      │           │           │
      ▼           ▼           ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│  Ship    │ │  Track   │ │   Plot   │
│ 船舶管理  │ │ 轨迹管理  │ │ 标绘引擎  │
│          │ │          │ │          │
│ - AisShip│ │ - 抽稀算法 │ │ - Point  │
│ - 插件系统│ │ - 特征识别 │ │ - Line   │
│ - 碰撞检测│ │ - 时间锚点 │ │ - Fill   │
└──────────┘ └──────────┘ └──────────┘
      │           │           │
      └───────────┼───────────┘
                  ▼
         ┌────────────────┐
         │  Core Modules  │
         │  (核心基础设施)  │
         └────────┬───────┘
                  │
      ┌───────────┼───────────┐
      ▼           ▼           ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│ Resource │ │   Icon   │ │  Event   │
│ Register │ │ Manager  │ │ Manager  │
│          │ │          │ │          │
│ - O(1)   │ │ - SVG    │ │ - 委托   │
│ - 防抖   │ │ - 缓存   │ │ - 代理   │
│ - diff   │ │ - 并发锁 │ │ - 防泄漏 │
└──────────┘ └──────────┘ └──────────┘
```

### 模块化设计

所有业务模块都继承自 `Module` 基类，提供统一的生命周期管理：

```typescript
abstract class Module extends EventEmitter {
  protected context: Context

  // 模块添加到地图时调用
  abstract onAdd(): void

  // 模块从地图移除时调用
  abstract onRemove(): void
}
```

### 上下文管理

使用 `WeakMap` 实现单例注册表，确保多实例互不干扰：

```typescript
class Context {
  private static registries = new WeakMap<Map, Context>()

  static get(map: Map): Context {
    if (!Context.registries.has(map)) {
      Context.registries.set(map, new Context(map))
    }
    return Context.registries.get(map)!
  }

  // 每个地图实例拥有独立的上下文
  constructor(public readonly map: Map) {
    this.register = new ResourceRegister(map)
    this.icon = new IconManager(map)
    this.event = new EventManager(map)
    // ...
  }
}
```

### 数据流架构

```
用户操作 → 模块方法 → 内存数据更新 → 标记脏数据 → 防抖调度 → 批量提交 → Mapbox 渲染
                ↑                                                    ↓
                └────────────────────── 状态同步 ←──────────────────┘
```

---

## ⚡ 性能优化

### 1. O(1) 资源调度

使用 Map 哈希表进行精确 diff，避免 O(N²) 复杂度：

```typescript
// 传统方式：O(N) 遍历
const feature = features.find(f => f.id === targetId)

// 优化方式：O(1) 哈希查找
const sourceData = new Map<string, Feature>()
const feature = sourceData.get(targetId)
```

### 2. 防抖调度

使用 `requestAnimationFrame` 批量提交更新：

```typescript
private scheduleRender(): void {
  if (this.renderFrameId !== null) return  // 防抖

  this.renderFrameId = requestAnimationFrame(() => {
    this.flushUpdates()  // 批量提交
    this.renderFrameId = null
  })
}
```

### 3. 降维空间计算

高层级渲染时使用 2D 矩阵替代球面几何，性能提升 90%：

```typescript
// 传统方式：使用 Turf.js 球面计算
const distance = turf.distance(point1, point2)

// 优化方式：2D 屏幕坐标计算
const dx = p2.x - p1.x
const dy = p2.y - p1.y
const distance = Math.sqrt(dx * dx + dy * dy)
```

### 4. 智能数据更新

只在数据真正变化时触发渲染：

```typescript
// 使用 lodash-es 的 isEqual 进行深度比较
if (!isEqual(oldData, newData)) {
  this.dirtySourceIds.add(id)
  this.scheduleRender()
}
```

### 5. 空间索引优化

使用 `RBush` 空间索引树进行碰撞检测：

```typescript
// 构建 R-Tree：O(n log n)
const tree = new RBush()
tree.load(items)

// 查询附近元素：O(log n)
const nearby = tree.search({
  minX: x - radius,
  minY: y - radius,
  maxX: x + radius,
  maxY: y + radius,
})
```

### 6. 事件委托

摒弃为每个 Feature 绑定原生事件，使用唯一监听器代理分发：

```typescript
// 传统方式：每个元素绑定事件（内存泄漏风险）
features.forEach(f => {
  map.on('click', f.id, handler)
})

// 优化方式：单一监听器代理分发
map.on('click', (e) => {
  const featureId = e.features[0]?.id
  this.dispatch(featureId, 'click', e)
})
```

---

## 📚 完整 API 参考

### 核心导出

```typescript
// 地图核心
export { CMap } from './modules/CMap'

// 船舶管理
export { Ship } from './modules/Ship'
export { BaseShip } from './modules/Ship/BaseShip'
export { AisShip } from './modules/Ship/plugins/AisShip'

// 轨迹管理
export { Track } from './modules/Track'

// 标绘引擎
export { Point } from './modules/Plot/plugins/Point'
export { IndexPoint } from './modules/Plot/plugins/IndexPoint'
export { IconPoint } from './modules/Plot/plugins/IconPoint'
export { Line } from './modules/Plot/plugins/Line'
export { ArrowLine } from './modules/Plot/plugins/ArrowLine'
export { IndexLine } from './modules/Plot/plugins/IndexLine'
export { Fill } from './modules/Plot/plugins/Fill'

// 核心工具
export { IconManager } from './core/IconManager'
export { EventManager } from './core/EventManager'
export { ResourceRegister } from './core/ResourceRegister'
export { Tooltip } from './core/Tooltip'
export { Collision } from './core/Collision'

// 基础类
export { Module } from './core/Module'
export { Context } from './core/Module/Context'

// 类型定义
export * from './types/CMap'
export * from './types/Ship'
export * from './types/Track'
export * from './types/Plot'
```

### 类型定义

```typescript
// 地图相关
import type { ICMapOptions, MapType, BeforeRemoveEvent } from 'cmap-core'

// 船舶相关
import type { IBaseShipOptions, BaseShipConstructor } from 'cmap-core'

// 轨迹相关
import type { ITrackOptions, TrackItem, TrackItemWithLabel, TooltipType } from 'cmap-core'

// 标绘相关
import type {
  IPoiOptions,
  IPointOptions,
  IIndexPointOptions,
  IIconPointOptions,
  ILineOptions,
  IArrowLineOptions,
  IIndexLineOptions,
  IFillOptions,
  PlotVisibility,
  PlotType,
} from 'cmap-core'
```

---

## 🛠 开发指南

### 本地开发

```bash
# 克隆项目
git clone https://github.com/chenyikai/cmap-core.git
cd cmap-core

# 安装依赖
pnpm install

# 启动开发服务器（包含调试页面）
pnpm dev

# 访问调试页面
# http://localhost:5173/debug/plot   # 标绘调试
# http://localhost:5173/debug/ship   # 船舶调试
# http://localhost:5173/debug/track  # 轨迹调试

# 类型检查
pnpm type-check

# 代码检查
pnpm lint

# 代码修复
pnpm lint:fix

# 构建生产版本
pnpm build

# 发布到 NPM
pnpm release
```

### 项目结构

```
src/
├── core/              # 核心基础设施
│   ├── Cache/         # 缓存管理
│   ├── Collision/     # 碰撞检测
│   ├── EventManager/  # 事件管理
│   ├── EventState/    # 事件状态
│   ├── Focus/         # 聚焦管理
│   ├── IconManager/   # 图标管理
│   ├── Module/        # 模块基类
│   ├── ResourceRegister/  # 资源注册
│   └── Tooltip/       # 提示框
├── modules/           # 业务功能模块
│   ├── CMap/          # 地图核心
│   ├── Plot/          # 标绘引擎
│   │   └── plugins/   # 标绘插件
│   ├── Ship/          # 船舶管理
│   │   └── plugins/   # 船舶插件
│   └── Track/         # 轨迹管理
├── types/             # TypeScript 类型定义
├── utils/             # 工具函数
└── styles/            # 样式文件
```

### 插件开发

#### 自定义船舶插件

```typescript
import { BaseShip, IBaseShipOptions } from 'cmap-core'
import type { Map } from 'mapbox-gl'

// 定义插件配置接口
interface ICustomShipOptions extends IBaseShipOptions {
  customField?: string
}

// 创建插件类
class CustomShip extends BaseShip<ICustomShipOptions> {
  static NAME = 'CustomShip'  // 插件名称

  constructor(map: Map, options: ICustomShipOptions) {
    super(map, options)

    // 自定义初始化逻辑
    console.log('自定义船舶创建:', options.customField)
  }

  // 重写渲染方法
  public override render(): void {
    super.render()

    // 自定义渲染逻辑
    this.renderCustomShape()
  }

  private renderCustomShape(): void {
    // 自定义形状绘制
  }
}

export { CustomShip }
```

#### 注册自定义插件

```typescript
import { Ship } from 'cmap-core'
import { CustomShip } from './plugins/CustomShip'

const ship = new Ship(map)

// 注册插件
ship.register(CustomShip)

// 使用插件
ship.add({
  id: 'custom-001',
  type: 'CustomShip',  // 指定插件类型
  customField: 'custom-value',
  ...otherOptions
})
```

### 调试技巧

#### 1. 使用调试面板

项目内置了 Tweakpane 调试面板：

```typescript
// 访问调试页面即可看到可视化调试工具
http://localhost:5173/debug/plot
```

#### 2. 查看内部状态

```typescript
// 查看船舶内部状态
const ship = shipManager.get('ship-001')
console.log('船舶状态:', ship.getState())
console.log('船舶配置:', ship.options)

// 查看轨迹数据
const trackPoints = track.get('ship-001')
console.log('轨迹点数:', trackPoints.length)
```

#### 3. 监听事件

```typescript
// 监听所有事件
ship.on('*', (eventName, data) => {
  console.log('船舶事件:', eventName, data)
})

// 监听特定事件
ship.on('ship-click', (ship) => {
  console.log('点击船舶:', ship.name, ship.position)
})
```

---

## ❓ 常见问题

### 1. 如何获取天地图 Token？

访问 [天地图官网](http://lbs.tianditu.gov.cn/home.html) 注册账号并申请 Token。

**注意**:
- 个人开发者可申请免费 Token
- 商业使用需要申请商业授权
- Token 有请求频率限制

### 2. 为什么地图不显示？

**检查清单**:
- ✅ 容器元素是否有宽高
- ✅ 是否等待 `mapLoaded()` 完成
- ✅ Token 是否正确
- ✅ 控制台是否有错误信息
- ✅ 是否正确导入样式文件 `import 'cmap-core/dist/cmap-core.css'`

### 3. 如何自定义船舶图标？

```typescript
import { IconManager } from 'cmap-core'

const iconManager = new IconManager(map)

// 方法1: 加载 SVG 图标
await iconManager.loadSvg([{
  name: 'custom-ship',
  svg: '<svg viewBox="0 0 1024 1024"><path d="..." fill="#f00"/></svg>'
}])

// 方法2: 加载外部图片
await iconManager.load([{
  name: 'custom-ship',
  url: '/path/to/icon.png'
}])

// 使用图标
ship.add({
  id: 'ship-001',
  icon: 'custom-ship',
  ...otherOptions
})
```

### 4. 轨迹点太多导致性能问题？

**解决方案**:

```typescript
// 1. 使用轨迹抽稀
const simplified = track.simplifyTrackByZoom(rawData, map.getZoom())

// 2. 基于航向变化抽稀
const simplified = track.simplifyTrackBySlope(rawData, 5)

// 3. 分段加载
const chunks = chunk(rawData, 1000)
chunks.forEach((chunk, index) => {
  setTimeout(() => {
    track.load(chunk)
  }, index * 100)
})
```

### 5. 如何监听地图事件？

```typescript
// 监听点击事件
map.on('click', (e) => {
  console.log('点击位置:', e.lngLat)
})

// 监听缩放事件
map.on('zoom', () => {
  console.log('当前缩放:', map.getZoom())
})

// 监听移动事件
map.on('move', () => {
  console.log('地图中心:', map.getCenter())
})

// 监听鼠标移动
map.on('mousemove', (e) => {
  console.log('鼠标位置:', e.lngLat)
})
```

### 6. 如何实现船舶点击事件？

```typescript
import { Ship } from 'cmap-core'

const ship = new Ship(map)

// 方法1: 监听船舶点击事件
ship.on('ship-click', (ship) => {
  console.log('点击了船舶:', ship.name)
  ship.select(ship.id)
})

// 方法2: 通过地图事件监听
map.map.on('click', (e) => {
  if (e.features && e.features[0]) {
    const featureId = e.features[0].id
    const clickedShip = ship.get(featureId)
    if (clickedShip) {
      console.log('点击了船舶:', clickedShip.name)
    }
  }
})
```

### 7. 如何保存标绘数据？

```typescript
// 监听更新完成事件
line.on('doneUpdate', () => {
  // 保存到后端
  const data = {
    id: line.options.id,
    position: line.options.position,
    style: line.options.style,
  }

  fetch('/api/save-plot', {
    method: 'POST',
    body: JSON.stringify(data),
  })
})

// 监听创建完成事件
point.on('doneCreate', () => {
  const data = {
    id: point.options.id,
    position: point.options.position,
  }

  fetch('/api/save-plot', {
    method: 'POST',
    body: JSON.stringify(data),
  })
})
```

### 8. 如何实现撤销/重做功能？

```typescript
class PlotHistory {
  private history: any[] = []
  private currentIndex = -1

  save(plot: any) {
    // 删除当前位置之后的历史
    this.history = this.history.slice(0, this.currentIndex + 1)

    // 保存当前状态
    this.history.push(JSON.parse(JSON.stringify(plot.options)))
    this.currentIndex++
  }

  undo(): any {
    if (this.currentIndex > 0) {
      this.currentIndex--
      return this.history[this.currentIndex]
    }
  }

  redo(): any {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++
      return this.history[this.currentIndex]
    }
  }
}

// 使用
const history = new PlotHistory()

line.on('doneUpdate', () => {
  history.save(line)
})

// 撤销
document.getElementById('undo').onclick = () => {
  const options = history.undo()
  if (options) {
    line.update(options)
  }
}

// 重做
document.getElementById('redo').onclick = () => {
  const options = history.redo()
  if (options) {
    line.update(options)
  }
}
```

### 9. 如何优化大量船舶的渲染性能？

```typescript
// 1. 使用视口剔除（只渲染视野内的船舶）
const bounds = map.getBounds()
const visibleShips = ships.filter(ship =>
  bounds.contains(ship.position)
)

// 2. 使用 LOD（细节层次）
// 低缩放级别：显示简单图标
// 高缩放级别：显示真实船型
const zoom = map.getZoom()
if (zoom < 12) {
  ship.setDisplayStyle('icon')
} else {
  ship.setDisplayStyle('realistic')
}

// 3. 使用聚合
const clusters = clusterShips(ships, 5)
clusters.forEach(cluster => {
  if (cluster.ships.length > 10) {
    // 显示聚合点
    showCluster(cluster)
  } else {
    // 显示个体
    cluster.ships.forEach(ship => ship.show())
  }
})
```

### 10. 如何实现轨迹回放功能？

```typescript
class TrackPlayer {
  private track: TrackItem[]
  private currentIndex = 0
  private timer: number | null = null
  private speed = 1000 // 毫秒/点

  constructor(track: TrackItem[]) {
    this.track = track
  }

  play() {
    this.timer = window.setInterval(() => {
      if (this.currentIndex >= this.track.length) {
        this.stop()
        return
      }

      const point = this.track[this.currentIndex]
      ship.update({
        position: point.position,
        direction: point.cog,
      })

      this.currentIndex++
    }, this.speed)
  }

  pause() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  stop() {
    this.pause()
    this.currentIndex = 0
  }

  setSpeed(speed: number) {
    this.speed = speed
  }
}

// 使用
const player = new TrackPlayer(trackData)

document.getElementById('play').onclick = () => player.play()
document.getElementById('pause').onclick = () => player.pause()
document.getElementById('stop').onclick = () => player.stop()
```

---

## 📄 许可证

[MIT License](LICENSE)

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 开发规范

1. **代码风格**: 遵循 ESLint 和 Prettier 配置
2. **提交规范**: 使用 Conventional Commits
3. **类型安全**: 保持 TypeScript 严格模式
4. **测试**: 确保所有功能正常工作

### 提交 PR

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

---

## 📮 联系方式

- **GitHub**: [chenyikai/cmap-core](https://github.com/chenyikai/cmap-core)
- **Issues**: [Issues](https://github.com/chenyikai/cmap-core/issues)
- **NPM**: [cmap-core](https://www.npmjs.com/package/cmap-core)

---

**Made with ❤️ by CMap Team**

> 如果这个项目对你有帮助，请给个 ⭐️ Star 支持一下！
