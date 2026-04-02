# cmap-core

基于 [Mapbox GL JS v3](https://docs.mapbox.com/mapbox-gl-js/) 封装的 WebGIS SDK，提供天地图底图、船舶渲染、轨迹绘制、标绘工具等核心能力。

---

## 安装

```bash
pnpm add cmap-core
```

引入样式（必须）：

```ts
import 'cmap-core/dist/cmap-core.css'
```

---

## CMap — 地图主模块

### 初始化

```ts
import { CMap } from 'cmap-core'

const cmap = new CMap({
  container: 'map',          // DOM 元素 id 或 HTMLElement
  center: [120.38, 36.07],   // [经度, 纬度]
  zoom: 10,
  type: CMap.LAND,           // 底图类型，默认 LAND
  TDTToken: 'your-token',    // 天地图 Token，不传使用内置默认值
  http2: true,               // 是否使用 HTTPS，默认 true
})

await cmap.mapLoaded()
```

> `ICMapOptions` 继承自 Mapbox GL 的 `MapOptions`，所有原生选项均可透传。如果传入自定义 `style`，则 `type`/`TDTToken`/`http2` 不会生效。

### 静态常量

```ts
CMap.LAND       // MapType.LAND      = 'land'
CMap.SATELLITE  // MapType.SATELLITE = 'satellite'
```

### 方法

| 方法 | 说明 |
|------|------|
| `mapLoaded(): Promise<Map>` | 等待地图加载完成，resolve 后可安全操作地图 |
| `getMap(): Map` | 获取原生 Mapbox `Map` 实例 |
| `change(type: MapType): void` | 切换底图（陆地 / 卫星），**自动保留**已有自定义 source 和 layer |
| `zoomIn(): void` | 放大一级（正在缩放时跳过） |
| `zoomOut(): void` | 缩小一级（正在缩放时跳过） |

### 事件

```ts
// 地图加载完成
cmap.on('loaded', (map: Map) => { })

// 地图销毁前（可拦截）
cmap.getMap().on('beforeRemove', ({ cancel, next }) => {
  cancel() // 阻止销毁
  next()   // 放行销毁
})
```

### 切换底图

`change` 方法会在切换底图前备份所有自定义 source / layer（包括 GeoJSON 运行时数据），在新底图加载完成后自动还原。

```ts
cmap.change(CMap.SATELLITE)
cmap.change(CMap.LAND)
```

---

## Ship — 船舶模块

### 初始化

```ts
import { Ship, AisShip } from 'cmap-core'

const ship = new Ship(cmap.getMap(), {
  plugins: [AisShip],  // 注册船舶类型插件
})
```

### 方法

| 方法 | 说明 |
|------|------|
| `add(data)` | 添加单条船舶，返回 `BaseShip` 实例 |
| `load(list)` | 批量加载，**会清空已有数据**，返回 `BaseShip[]` |
| `get(id)` | 获取指定船舶实例 |
| `remove(id)` | 移除指定船舶 |
| `removeAll()` | 移除全部船舶 |
| `focus(id)` | 聚焦高亮指定船舶 |
| `unfocus(id)` | 取消聚焦 |
| `select(id)` | 选中指定船舶 |
| `unselect(id)` | 取消选中 |
| `render()` | 手动触发渲染 |

### 数据结构

```ts
interface IBaseShipOptions {
  id: string | number       // 唯一标识（如 MMSI）
  name: string              // 船名
  position: LngLat          // [经度, 纬度]
  direction: number         // 方向角（度）
  speed: number             // 速度（节）
  hdg: number               // 船首向
  cog: number               // 对地航向
  rot: number               // 转向速率
  type: string              // 插件名称（对应 static NAME）
  time: Date                // 数据时间戳
  tooltip?: boolean         // 是否显示提示框，默认 true
  width?: number            // 船宽（米）
  height?: number           // 船长（米）
  icon?: string             // 自定义图标名称
  props?: Record<string, any>
}
```

### AisShip 插件

内置插件，根据最后更新时间自动判断状态：

| 状态 | 说明 |
|------|------|
| `ONLINE` | 在线 |
| `DELAY` | 延迟 |
| `OFFLINE` | 离线 |

### 自定义船舶插件

```ts
import { BaseShip } from 'cmap-core'

class MyShip extends BaseShip<IMyShipOptions> {
  static NAME = 'MyShip'

  getIconName() {
    return 'my-icon-name'
  }
}

const ship = new Ship(map, { plugins: [MyShip] })
ship.add({ type: 'MyShip', ... })
```

---

## Track — 轨迹模块

### 初始化

```ts
import { Track } from 'cmap-core'

const track = new Track(cmap.getMap(), {
  startLabel: '起',  // 起点标签文本，可选
  endLabel: '终',    // 终点标签文本，可选
})
```

### 方法

| 方法 | 说明 |
|------|------|
| `load(items)` | 加载轨迹数据 |
| `remove()` | 清空轨迹 |
| `render()` | 渲染 |
| `getFeature()` | 获取所有 GeoJSON Feature |

### 数据结构

```ts
interface TrackItem {
  id: string              // 轨迹�� ID
  pId: string             // 所属轨迹 ID（通常为船舶 ID）
  index: number           // 点索引（决定顺序）
  position: LngLat        // [经度, 纬度]
  cog?: number            // 航向角
  sog?: number            // 地速（节）
  time: Date              // 时间戳
  props?: Record<string, any>
}
```

### 自动特征标记

| 类型 | 触发条件 |
|------|---------|
| 起终点 | 第一个和最后一个点 |
| 急转弯 | 航向变化 > 25° |
| 启停变化 | 速度在 0 与非 0 之间切换 |
| 时间锚点 | 相邻两点间隔 > 30 分钟 |

---

## Plot — 标绘模块

所有标绘类型继承自 `Poi`，具备统一的生命周期接口。

### 通用方法

| 方法 | 说明 |
|------|------|
| `render()` | 渲染到地图 |
| `start()` | 开始绘制 |
| `stop()` | 停止绘制 |
| `edit()` | 进入编辑模式 |
| `unedit()` | 退出编辑模式 |
| `show()` | 显示 |
| `hide()` | 隐藏 |
| `focus()` | 聚焦高亮 |
| `unfocus()` | 取消高亮 |
| `move(position)` | 移动 |
| `update(options)` | 更新配置 |
| `remove()` | 移除 |
| `getFeature()` | 获取 GeoJSON Feature |
| `setState(states)` | 设置内部状态 |
| `getState()` | 获取内部状态 |

### 通用事件

```ts
poi.on('create', (feature) => { })        // 创建完成
poi.on('update.done', (feature) => { })   // 更新完成
poi.on('click', (e) => { })               // 点击
poi.on('hover', (e) => { })               // 悬停
poi.on('unhover', (e) => { })             // 离开
```

---

### Point — 圆点

```ts
import { Point } from 'cmap-core'

const point = new Point(cmap.getMap(), {
  id: 'point-1',
  name: '标记点',
  visibility: 'visible',
  position: [120.38, 36.07],
  isName: true,
  style: {
    'circle-radius': 8,
    'circle-color': '#3B82F6',
    'circle-stroke-color': '#ffffff',
    'circle-stroke-width': 2,
  },
})

point.render()
```

**样式属性**

| 属性 | 类型 | 说明 |
|------|------|------|
| `circle-radius` | `number` | 半径（像素） |
| `circle-color` | `string` | 填充颜色 |
| `circle-stroke-color` | `string` | 描边颜色 |
| `circle-stroke-width` | `number` | 描边宽度 |

---

### Line — 折线

```ts
import { Line } from 'cmap-core'

const line = new Line(cmap.getMap(), {
  id: 'line-1',
  name: '航线',
  visibility: 'visible',
  position: [[120.38, 36.07], [120.45, 36.12], [120.52, 36.08]],
  style: {
    'line-color': '#EF4444',
    'line-width': 2,
  },
  vertexStyle: {             // 编辑时顶点样式
    'circle-radius': 5,
    'circle-color': '#fff',
  },
  midStyle: {                // 编辑时中点样式
    'circle-radius': 3,
    'circle-color': '#3B82F6',
  },
})

line.render()
```

**特有方法**

| 方法 | 说明 |
|------|------|
| `insertPoint(index, position)` | 在指定索引处插入顶点 |
| `updatePoint(index, position)` | 更新指定顶点坐标 |
| `getPoint(index)` | 获取指定顶点 |
| `getMidPoint(index)` | 获取指定中点 |

---

### Fill — 多边形

```ts
import { Fill } from 'cmap-core'

const fill = new Fill(cmap.getMap(), {
  id: 'fill-1',
  name: '区域',
  visibility: 'visible',
  position: [[[120.38, 36.07], [120.45, 36.07], [120.45, 36.12], [120.38, 36.07]]],
  style: {
    'fill-color': '#3B82F6',
    'fill-opacity': 0.3,
  },
  outLineStyle: {
    'line-color': '#3B82F6',
    'line-width': 2,
  },
})

fill.render()
```

---

### Circle — 圆形

```ts
import { Circle } from 'cmap-core'

const circle = new Circle(cmap.getMap(), {
  id: 'circle-1',
  name: '范围圈',
  visibility: 'visible',
  position: [120.38, 36.07],
  radius: 1000,
  units: 'meters',   // 'meters' | 'kilometers' | 'miles'
  style: {
    'fill-color': '#F59E0B',
    'fill-opacity': 0.2,
  },
})

circle.render()
```

---

### ArrowLine — 箭头线

继承自 `Line`，顶点以箭头图标表示，箭头方向自动计算。

```ts
import { ArrowLine } from 'cmap-core'

const arrowLine = new ArrowLine(cmap.getMap(), {
  id: 'arrow-1',
  name: '流向',
  visibility: 'visible',
  position: [[120.38, 36.07], [120.45, 36.12]],
  style: { 'line-color': '#10B981', 'line-width': 2 },
})

arrowLine.render()
```

---

### IconPoint — 图标点

```ts
import { IconPoint } from 'cmap-core'

const iconPoint = new IconPoint(cmap.getMap(), {
  id: 'icon-1',
  name: '港口',
  visibility: 'visible',
  position: [120.38, 36.07],
  style: {
    'icon-size': 1,
    'icon-rotate': 0,
    'text-color': '#1F2937',
    'text-size': 12,
    'text-offset': [0, 1.5],
  },
})

iconPoint.render()
```

---

### IndexPoint / IndexLine — 序号标注

用于带序号的点和线，适合标注泊位、航线节点等有序信息。

```ts
import { IndexPoint, IndexLine } from 'cmap-core'

const p = new IndexPoint(cmap.getMap(), {
  id: 'idx-1',
  visibility: 'visible',
  position: [120.38, 36.07],
  index: 1,
})
p.render()
```

---

## IconManager — 图标管理

`CMap` 实例内置 `icon` 属性，也可独立使用。

```ts
import { IconManager } from 'cmap-core'

const iconManager = new IconManager(cmap.getMap())

// 加载 URL 图片
await iconManager.load([
  { name: 'port', url: 'https://example.com/port.png' }
])

// 加载 SVG
await iconManager.loadSvg([
  { name: 'ship-online', svg: '<svg>...</svg>' }
])

iconManager.has('port')           // true
iconManager.getImage('port')      // HTMLImageElement | undefined
iconManager.delete('port')        // 从缓存中移除
```

---

## Tooltip — 提示框

```ts
import { Tooltip } from 'cmap-core'

const tooltip = new Tooltip(cmap.getMap(), {
  id: 'tip-1',
  position: [120.38, 36.07],
  element: document.getElementById('popup')!,
  anchor: 'bottom',    // 9 种锚点方向
  offsetX: 0,
  offsetY: -10,
  line: true,          // 是否绘制连接线
  visible: true,
})

tooltip.render()
tooltip.show()
tooltip.hide()
tooltip.update({ position: [120.39, 36.08] })
tooltip.remove()
```

**锚点方向**：`center` `top` `bottom` `left` `right` `top-left` `top-right` `bottom-left` `bottom-right`

---

## Collision — 碰撞检测

基于 [RBush](https://github.com/mourner/rbush) 空间索引，用于检测 Tooltip 等元素是否重叠。

```ts
import { Collision, CollisionItem } from 'cmap-core'

const collision = new Collision()

collision.load([
  { id: 'a', bbox: [x1, y1, x2, y2] },
  { id: 'b', bbox: [x1, y1, x2, y2] },
])

const collided = collision.collides()  // 返回发生碰撞的元素
collision.clear()
```

---

## 完整示例

```ts
import { CMap, Ship, AisShip, Track, Fill } from 'cmap-core'
import 'cmap-core/dist/cmap-core.css'

// 1. 初始化地图
const cmap = new CMap({
  container: 'map',
  center: [120.38, 36.07],
  zoom: 10,
  type: CMap.LAND,
  TDTToken: 'your-token',
})

await cmap.mapLoaded()

// 2. 加载船舶
const ship = new Ship(cmap.getMap(), { plugins: [AisShip] })
ship.load([
  {
    id: 1, name: '船舶001', type: 'AisShip',
    position: [120.38, 36.07],
    direction: 45, speed: 10, hdg: 45, cog: 45, rot: 0,
    time: new Date(), tooltip: true,
  },
])

// 3. 绘制轨迹
const track = new Track(cmap.getMap(), {})
track.load([
  { id: 't1', pId: 'track-a', index: 0, position: [120.38, 36.07], time: new Date('2024-01-01 08:00') },
  { id: 't2', pId: 'track-a', index: 1, position: [120.45, 36.12], time: new Date('2024-01-01 09:00') },
])
track.render()

// 4. 绘制区域
const fill = new Fill(cmap.getMap(), {
  id: 'zone-1',
  name: '监控区域',
  visibility: 'visible',
  position: [[[120.36, 36.05], [120.46, 36.05], [120.46, 36.15], [120.36, 36.05]]],
  style: { 'fill-color': '#3B82F6', 'fill-opacity': 0.2 },
})
fill.render()

// 5. 切换底图（自动保留 zone-1 等自定义图层）
cmap.change(CMap.SATELLITE)
```

---

## 类型参考

```ts
import type {
  ICMapOptions,
  MapType,
  IBaseShipOptions,
  TrackItem,
  IPoiOptions,
  IPointOptions,
  ILineOptions,
  IFillOptions,
  ICircleOptions,
  IArrowLineOptions,
  IIconPointOptions,
  PlotVisibility,
} from 'cmap-core'
```
