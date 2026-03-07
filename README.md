```md
# 🌍 cmap-core

**`cmap-core`** 是一个基于 **Mapbox GL JS** 封装的高性能 WebGIS 二次开发 SDK。
专为**海事、交管 (VTS)、航运**及**军标态势标绘**领域打造。采用纯粹的面向对象（OOP）架构设计，内置资源防抖调度器、空间碰撞引擎与极速渲染机制，轻松承载海量船舶与轨迹数据的丝滑交互。

---

## ✨ 核心特性

- 🚢 **专业船舶模块 (`Ship`)**：内置基于真实长宽比的船体计算，支持高层级真实船型与低层级图标的无缝切换，自动计算航向预测线与转向辅助线。
- 🛣️ **智能轨迹模块 (`Track`)**：自带基于视图缩放层级与航向角差值的**抽稀算法**，海量历史轨迹秒级渲染。自动识别起点、终点、急转弯、启停状态及时间锚点。
- 📐 **全功能标绘引擎 (`Plot`)**：支持点、折线、多边形、带文本图标、序号节点及带箭头的引线。内置完整的状态机，支持节点拖拽、中点分裂、整体平滑移动等极佳交互体验。
- 🚀 **极高渲染性能**：
  - 底层 `ResourceRegister` 采用 `requestAnimationFrame` 进行数据防抖与合并。
  - 采用 $O(1)$ 的 Hash Map 算法替代传统的遍历更新，突破海量要素的渲染瓶颈。
  - 核心图形变换降维使用 2D 矩阵与原生三角函数计算，使数千艘船的渲染开销骤降。
- 🛡️ **智能防遮挡 (`Collision`)**：集成 RBush 空间索引树，动态计算 Tooltip 锚点位置，告别海量标签重叠。

---

## 📦 安装

推荐使用 `pnpm` 或 `npm` 安装：

```bash
npm install cmap-core mapbox-gl
# 或
pnpm add cmap-core mapbox-gl
```

---




这是一份为你详细整理的 `CMap` 类的核心文档。
`CMap` 是整个 `cmap-core` SDK 的入口与底座，它继承自 `EventEmitter`，封装了 `mapbox-gl` 原生地图实例，并内置了天地图底图、图标管理器以及安全的异步加载机制。

你可以直接复制以下 Markdown 内容作为该类的专属文档：

***

# 🗺️ CMap 地图核心类

`CMap` 是 `cmap-core` 引擎的基石。它不仅对 `mapbox-gl` 的 `Map` 实例进行了深度封装，还内置了**天地图（矢量/影像）无缝切换**、**防报错机制（拦截了 Mapbox 的 token 校验）**、**安全的异步加载钩子**以及**生命周期阻断拦截 (`beforeRemove`)**。

---

## 📦 引入与基础使用

```typescript
import { CMap } from 'cmap-core';
import 'cmap-core/style.css';

// 实例化地图
const cMap = new CMap({
  container: 'map', 
  type: CMap.LAND, 
  center:[122.091606, 30.004767],
  zoom: 14,
});

// 安全地等待地图及资源全部加载完成
cMap.mapLoaded().then((map) => {
  console.log('地图引擎已就绪', map);
});
```

---

## ⚙️ 构造函数选项 (Constructor Options)

实例化 `CMap` 时，参数接收一个 `ICMapOptions` 对象。

| 属性 | 类型 | 必填 | 默认值 | 描述 |
| :--- | :--- | :---: | :--- | :--- |
| **`container`** | `string \| HTMLElement` | **是** | - | 渲染地图的 HTML 元素或其 ID |
| **`type`** | `MapType` | 否 | `MapType.LAND` | 初始底图类型，可选 `land` (矢量) 或 `satellite` (影像) |
| **`TDTToken`** | `string` | 否 | 内置默认 token | 天地图的开发者 Token |
| **`center`** | `LngLatLike` | 否 | `[0, 0]` | 初始中心点坐标 `[lng, lat]` |
| **`zoom`** | `number` | 否 | `0` | 初始缩放层级 |
| `...others` | `MapOptions` | 否 | - | 继承自 Mapbox GL JS 的所有原生 `MapOptions` 选项 |

---

## 🏷️ 静态属性 (Static Properties)

可通过类名直接访问的枚举属性，用于指定地图类型。

| 属性 | 类型 | 值 | 描述 |
| :--- | :--- | :--- | :--- |
| **`CMap.LAND`** | `MapType` | `'land'` | 天地图矢量底图（含路网注记） |
| **`CMap.SATELLITE`**| `MapType` | `'satellite'` | 天地图卫星影像底图（含路网注记） |

---

## 🧩 实例属性 (Instance Properties)

| 属性 | 类型 | 描述 |
| :--- | :--- | :--- |
| **`map`** | `mapboxgl.Map` | 底层的 Mapbox GL JS 地图实例。 |
| **`icon`** | `IconManager` | 与当前地图实例绑定的图标管理器。用于处理 SVG/PNG 材质的缓存与加载。 |

---

## 🛠️ 实例方法 (Instance Methods)

### `mapLoaded(): Promise<Map>`
**推荐使用！** 安全地等待地图底层渲染上下文和数据源完全加载完毕。内部采用轮询机制（16ms），彻底解决了 Mapbox 原生 `load` 事件偶尔不触发或触发时内部状态未就绪的痛点。
- **返回值**: `Promise<Map>` 包含 Mapbox 实例的 Promise。

### `change(type: MapType): void`
无缝切换底图风格。
- **参数**:
  - `type`: `CMap.LAND` 或 `CMap.SATELLITE`

### `getMap(): Map`
获取底层的 Mapbox 地图实例。等同于访问 `cMap.map` 属性。

### `zoomIn(): void`
放大地图层级（Zoom + 1），自带过渡动画。若地图正在执行缩放动画，则该指令会被忽略以防止冲突。

### `zoomOut(): void`
缩小地图层级（Zoom - 1），自带过渡动画。

---

## 📡 事件系统 (Events)

`CMap` 继承自 `EventEmitter3`，同时对底层的 `mapboxgl.Map` 做了事件增强。

### CMap 实例事件
```typescript
cMap.on('loaded', (map: mapboxgl.Map) => {
  // 当地图加载完成，并且内部的默认船舶图标（在线、延迟、离线）全部注入完毕后触发。
});
```

### 增强的原生地图事件 (`beforeRemove`)
`CMap` 覆写了底层 Mapbox 的 `map.remove()` 方法。在地图被销毁前，会触发 `beforeRemove` 事件，允许开发者**拦截或阻断销毁流程**（用于清理外部绑定的内存）。

```typescript
cMap.map.on('beforeRemove', (e: BeforeRemoveEvent) => {
  // e.cancel() // 调用此方法可中止销毁地图
  // e.next()   // 放行，继续销毁
  
  console.log('地图即将被销毁，执行清理工作...');
});
```

---

## 📚 依赖类型定义 (Type Definitions)

以下是 `CMap` 强关联的 TypeScript 类型定义（均可从 `cmap-core` 导入）：

### 1. `ICMapOptions`
继承自 Mapbox 的参数接口，注入了业务特有属性。
```typescript
import type { MapOptions } from 'mapbox-gl';

export interface ICMapOptions extends MapOptions {
  type?: MapType;      // 地图类型 (land / satellite)
  TDTToken?: string;   // 天地图 Token
}
```

### 2. `MapType`
地图类型枚举定义。
```typescript
export enum MapType {
  LAND = 'land',
  SATELLITE = 'satellite',
}
```

### 3. `BeforeRemoveEvent`
拦截地图销毁生命周期的事件对象。
```typescript
export interface BeforeRemoveEvent {
  /**
   * 阻止销毁的方法
   */
  cancel: () => void;
  /**
   * 放行，继续执行销毁
   */
  next: () => void;
}
```

### 4. 气泡与信息框配置类型 (`customPopupOptions`)
*（扩展功能类型，用于配合地图原生 Popup 进行业务定制）*
```typescript
import type { LngLatLike, PopupOptions } from 'mapbox-gl';

export interface formatOptions {
  value: string | number;
  data: object;
}

export interface InfoFormConfig {
  label: string | number;
  prop: string | number;
  format(formatOptions: formatOptions): string;
}

export type customPopupOptions = PopupOptions & {
  center: LngLatLike;
  config: InfoFormConfig
```

---

## 🧩 核心模块指南 & API 手册

### 🚢 1. 船舶模块 (`Ship`)

用于海量船舶的加载、实时更新、聚焦与渲染。通过注册 `AisShip` 插件，SDK 可以根据 AIS 数据的最后更新时间自动判断船舶状态（在线、延迟、离线）。

#### API 方法

| 方法名 | 参数 | 返回值 | 描述 |
| --- | --- | --- | --- |
| `load(list)` | `IBaseShipOptions[]` | `BaseShip[]` | 批量加载/覆盖船舶数据 |
| `add(data)` | `IBaseShipOptions` | `BaseShip` | 添加单艘船舶 |
| `remove(id)` | `string \| number` | `void` | 根据 ID 移除指定船舶 |
| `removeAll()` | `-` | `void` | 清空所有船舶及信息牌 |
| `get(id)` | `string \| number` | `BaseShip` | 获取指定船舶实例 |
| `select(id)` | `string \| number` | `void` | 选中并镜头飞至该船，高亮显示预测线 |
| `unselect(id)`| `string \| number` | `void` | 取消选中 |

#### 船舶配置项 (`IAisShipOptions`)

| 属性 | 类型 | 描述 |
| --- | --- | --- |
| `id` | `string \| number` | 唯一标识 (如 MMSI) |
| `position` | `LngLat` | 船舶当前坐标 |
| `direction`/`hdg`/`cog`| `number` | 船艏向/航迹向 (引擎将自动根据此角度旋转) |
| `speed` | `number` | 航速 (节)，用于计算航向预测线长度 |
| `width` / `height`| `number` | 船宽 / 船长 (米)，高层级放大时用于生成真实比例船体 |
| `time` | `Date` | 最后更新时间，引擎据此自动判断 在线/延迟/离线 状态 |
| `tooltip` | `boolean` | 是否开启自适应防碰撞名字牌 |

#### 代码示例

```typescript
import { Ship, AisShip } from 'cmap-core';
import { LngLat } from 'mapbox-gl';

cMap.mapLoaded().then((map) => {
  // 初始化并挂载 AisShip 插件
  const shipManager = new Ship(map, { plugins: [AisShip] });

  // 批量加载船舶数据
  shipManager.load([
    {
      id: '413363020',
      type: 'Ais', 
      name: 'PENG XIANG 128',
      position: new LngLat(122.088970, 30.006870),
      direction: 92,
      speed: 12.5, 
      hdg: 92, cog: 90, rot: 0,
      width: 15, height: 55,
      time: new Date(), 
      tooltip: true
    }
  ]);

  // 监听地图上的船舶点击事件
  map.on('ship-click', (ship) => {
    shipManager.select(ship.id);
  });
});
```

---

### 🛣️ 2. 历史轨迹模块 (`Track`)

自带智能抽稀与特征点识别的轨迹渲染引擎。

#### API 方法

| 方法名 | 参数 | 返回值 | 描述 |
| --- | --- | --- | --- |
| `load(items)` | `TrackItem[]` | `void` | 解析轨迹数据，进行角度平滑、层级抽稀与特征点识别 |
| `render()` | `-` | `void` | 将抽稀后的轨迹绘制到地图上 |
| `remove()` | `-` | `void` | 彻底移除该轨迹及其时间锚点标签 |

#### 轨迹点配置项 (`TrackItem`)

| 属性 | 类型 | 描述 |
| --- | --- | --- |
| `id` | `string` | 轨迹线 ID |
| `pId` | `string` | 当前点位独立 ID |
| `position` | `LngLat` | 坐标 |
| `time` | `Date` | 产生时间 (用于排序及标记时间锚点) |
| `sog` / `cog` | `number` | 航速/航向 (可选) |

#### 代码示例

```typescript
import { Track } from 'cmap-core';
import { LngLat } from 'mapbox-gl';

const track = new Track(map, { startLabel: '起点', endLabel: '终点' });

track.load([
  {
    id: 'track-001',
    pId: 'point-1',
    index: 0,
    position: new LngLat(122.0844, 30.0012),
    time: new Date('2026-03-01 10:00:00'),
    cog: 45, sog: 10
  }
  // ... 输入成千上万个点，引擎会自动抽稀并渲染
]);
track.render();

// 监听鼠标悬停节点事件
map.on('track-hover', (e) => console.log('悬停轨迹节点:', e));
```

---

### 📐 3. 标绘模块 (`Plot`)

所有标绘类（`Point`, `IconPoint`, `IndexPoint`, `Line`, `ArrowLine`, `Fill`）均继承自统一的基类 `Poi`，拥有相同的交互接口。图形尺寸随地图缩放线性变化，色彩支持数据驱动同步。

#### 标绘通用 API (`Poi`)

| 方法名 | 参数 | 返回值 | 描述 |
| --- | --- | --- | --- |
| `render()` | `-` | `void` | 将图形渲染到地图上 |
| `remove()` | `-` | `void` | 销毁并从内存/地图中彻底移除图形 |
| `show()` / `hide()`| `-` | `void` | 控制图形可见性 |
| `edit()` | `-` | `void` | 开启编辑模式 (支持节点拖拽、中点分裂) |
| `unedit()` | `-` | `void` | 退出编辑模式 |
| `move(LngLat)`| `LngLat` | `void` | 以鼠标位置为基准，平滑移动整个图形(面/线)至新位置 |
| `on(event, cb)` | `string`, `Function` | `this` | 监听事件 (`click`, `hover`, `doneUpdate` 等) |

#### 3.1 点标绘 (`Point` & `IconPoint`)

支持配置基础半径或尺寸，图形与文本均会随地图缩放级别自动线性缩放。

**配置项:**
| 属性 | 类型 | 描述 |
| --- | --- | --- |
| `position` | `LngLat` | 坐标 |
| `style` | `Object` | 样式配置 (如 `circle-radius`, `circle-color` 等) |
| `icon` | `string` | (`IconPoint` 专属) 图标注册名 |
| `name` | `string` | (`IconPoint` 专属) 文本标签内容 |

**代码示例:**
```typescript
import { Point, IconPoint } from 'cmap-core';
import { LngLat } from 'mapbox-gl';

// 1. 基础圆点
const point = new Point(map, {
  id: 'point-1',
  visibility: 'visible',
  position: new LngLat(122.0844, 30.0012),
  style: { 'circle-radius': 8, 'circle-color': '#03CC02' }
});
point.render();

// 2. 带文字的业务图标点
const iconPoint = new IconPoint(map, {
  id: 'icon-1',
  name: '目标发现位置',
  isName: true,
  visibility: 'visible',
  position: new LngLat(122.0850, 30.0020),
  icon: 'custom-fire', // 需提前通过 IconManager 注册
  style: { 'icon-size': 1.2, 'text-color': '#FF343E' }
});
iconPoint.render();
iconPoint.edit(); // 开启拖拽
```

#### 3.2 线标绘 (`Line` & `ArrowLine`)

支持普通连续折线及带方向箭头的引线，支持拖拽节点及动态分裂中点。

**配置项:**
| 属性 | 类型 | 描述 |
| --- | --- | --- |
| `position` | `LngLat[]` | 线的节点坐标集合 |
| `style` | `Object` | 线条样式 (`line-color`, `line-width`, `line-dasharray`) |
| `vertexStyle`| `Object` | 编辑时顶点的样式 |
| `midStyle` | `Object` | 编辑时中点的样式 |

**代码示例:**
```typescript
import { ArrowLine } from 'cmap-core';
import { LngLat } from 'mapbox-gl';

// 绘制一条带箭头的路线
const arrowLine = new ArrowLine(map, {
  id: 'line-1',
  visibility: 'visible',
  position:[new LngLat(122.0844, 30.0012), new LngLat(122.0961, 29.9906)],
  style: {
    'line-color': '#FF343E',
    'line-width': 3
  }
});
arrowLine.render();
arrowLine.edit(); // 开启节点拖拽与中点分裂
```

#### 3.3 面标绘 (`Fill`)

面标绘底层基于 Line 实现，完美继承编辑能力。更改 `fill-color` 即可智能同步所有边框线、拖拽节点及中点的颜色。

**配置项:**
| 属性 | 类型 | 描述 |
| --- | --- | --- |
| `position` | `LngLat[]` | 多边形顶点 (内部自动闭合首尾) |
| `style` | `Object` | 面样式 (`fill-color`, `fill-opacity`) |
| `outLineStyle`| `Object` | 可选，自定义外边框的线样式 |

**代码示例:**
```typescript
import { Fill } from 'cmap-core';
import { LngLat } from 'mapbox-gl';

const fillPlot = new Fill(map, {
  id: 'fill-1',
  name: '一号防区',
  isName: true, // 自动计算多边形重心并显示名称
  visibility: 'visible',
  position:[
    new LngLat(122.0844, 30.0012),
    new LngLat(122.0824, 29.9949),
    new LngLat(122.0961, 29.9906) // 终点将自动闭合至起点
  ],
  style: {
    'fill-color': '#00BFFF', // 自动同步线和节点的颜色
    'fill-opacity': 0.4
  }
});

fillPlot.render();
fillPlot.edit();

// 整体拖拽平移 (丝滑无重排)
fillPlot.move(new LngLat(122.1000, 30.1000));

// 监听图形更新完成（如拖拽松手后），保存数据到后端
fillPlot.on('doneUpdate', () => {
  console.log('最新的多边形坐标:', fillPlot.options.position);
});
```

---

### 🖼️ 4. 图标管理器 (`IconManager`)

内置的资源缓存管理器，支持直接加载 SVG 字符串，转换为无毛边的高清材质。

#### API 方法

| 方法名 | 参数 | 返回值 | 描述 |
| --- | --- | --- | --- |
| `loadSvg(icons)` | `SvgIcon[]` | `Promise` | 批量加载 SVG 字符串并转为高清材质 |
| `load(icons)` | `Icon[]` | `Promise` | 批量加载外部 URL 图片 |
| `getImage(name)` | `string` | `Image` | 获取已缓存的图片及其长宽信息 |
| `delete(name)` | `string` | `void` | 删除图片缓存与 Mapbox 内部 image |

#### 代码示例

```typescript
import { IconManager } from 'cmap-core';

const iconManager = new IconManager(map);

// 动态加载 SVG 字符串
await iconManager.loadSvg([{
  name: 'custom-fire',
  svg: '<svg viewBox="0 0 1024 1024"><path d="..." fill="#f00"/></svg>'
}]);

// 动态加载外部图片
await iconManager.load([{
  name: 'ship-default',
  url: 'https://example.com/ship.png'
}]);
```

---

## 🛠️ 进阶架构与性能优化亮点

1. **Context 上下文隔离**：采用 `WeakMap` 实现单例注册表。即使单个页面渲染多个地图实例，数据事件也不会互相污染。
2. **O(1) 资源调度更新**：内置的 `ResourceRegister` 类摒弃了传统数组遍历，采用 `Map` 哈希表来精确 diff 与覆盖 GeoJSON 要素，配合 `requestAnimationFrame` 批量提交，避免了 CPU $O(N^2)$ 的灾难性卡顿。
3. **降维空间计算**：船舶模块在进行高层级真实船体渲染时，放弃了高耗时的球面几何模型（Turf.js），降维使用屏幕 2D 矩阵与原生三角函数计算，使数千艘船的渲染开销骤降 90%。
4. **事件委托总线**：摒弃为每个 Feature 绑定原生事件，`EventManager` 在底层采用唯一监听器代理分发，根除了事件内存泄漏与重复触发问题。

---

## 📝 开发与构建

本项目使用 `Vite` 构建，并开启了 TypeScript 最严格的检查模式 (`strictTypeChecked`)。

```bash
# 安装依赖
pnpm install

# 启动本地开发测试 (依赖 debug 目录)
pnpm run dev

# 严格类型检查
pnpm run type-check

# 构建 UMD / ESM 产物及 d.ts 类型定义
pnpm run build

# Changesets 自动化发布版本到 NPM
pnpm run change
pnpm run version
pnpm run release
```

---

## 📄 协议 (License)[MIT License](./LICENSE) © 2026 - Present
```
