# cmap-core

基于 [Mapbox GL JS v3](https://docs.mapbox.com/mapbox-gl-js/) 封装的 WebGIS SDK，提供天地图底图、船舶渲染、轨迹绘制、标绘工具等核心能力。

---

## 安装

```bash
pnpm add cmap-core
```

引入样式（必须）：

```ts
import 'cmap-core/style.css'
```

---

## CMap — 地图主模块

### 初始化

```ts
import { CMap } from 'cmap-core'

const cmap = new CMap({
  container: 'map',
  center: [120.38, 36.07],
  zoom: 10,
  type: CMap.LAND,
  TDTToken: 'your-token',
  http2: true,
})

await cmap.mapLoaded()
```

### ICMapOptions

继承自 Mapbox GL 的 `MapOptions`，所有原生选项均可透传。

| 字段 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `container` | `string \| HTMLElement` | ✅ | DOM 元素 id 或 HTMLElement |
| `type` | `MapType` | - | 底图类型，默认 `MapType.LAND` |
| `TDTToken` | `string` | - | 天地图 Token，不传使用内置默认值 |
| `http2` | `boolean` | - | 是否使用 HTTPS，默认 `true` |
| `center` | `LngLatLike` | - | 初始中心点 |
| `zoom` | `number` | - | 初始缩放级别 |

> 传入自定义 `style` 时，`type` / `TDTToken` / `http2` 不生效。

### MapType

```ts
enum MapType {
  LAND      = 'land',       // 天地图矢量底图
  SATELLITE = 'satellite',  // 天地图卫星影像底图
}
```

### 静态属性

```ts
CMap.LAND       // MapType.LAND
CMap.SATELLITE  // MapType.SATELLITE
```

### 方法

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `mapLoaded()` | `Promise<Map>` | 等待地图加载完成后 resolve |
| `getMap()` | `Map` | 获取原生 Mapbox Map 实例 |
| `change(type)` | `void` | 切换底图，自动保留自定义 source / layer |
| `zoomIn()` | `void` | 放大一级（正在缩放时跳过） |
| `zoomOut()` | `void` | 缩小一级（正在缩放时跳过） |

### 事件

```ts
// 地图加载完成
cmap.on('loaded', (map: Map) => { })

// 地图销毁前（可拦截）
cmap.getMap().on('beforeRemove', (e: BeforeRemoveEvent) => {
  e.cancel() // 阻止销毁
  e.next()   // 放行销毁
})
```

### BeforeRemoveEvent

```ts
interface BeforeRemoveEvent {
  cancel: () => void  // 阻止销毁
  next:   () => void  // 继续销毁
}
```

---

## Ship — 船舶模块

### 初始化

```ts
import { Ship, AisShip } from 'cmap-core'

const ship = new Ship(cmap.getMap(), {
  plugins: [AisShip],
})
```

### IShipOptions

| 字段 | 类型 | 说明 |
|------|------|------|
| `plugins` | `BaseShipConstructor[]` | 船舶类型插件数组 |

### 方法

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `add(data)` | `BaseShip \| undefined` | 添加并立即显示单条船舶；相同 ID / 类型更新已有实例 |
| `load(list)` | `BaseShip[]` | 批量替换数据；相同 ID / 类型复用实例和标签，移除本次列表中不存在的船舶 |
| `get(id)` | `BaseShip \| undefined` | 获取指定船舶实例 |
| `remove(id)` | `void` | 移除指定船舶 |
| `removeAll()` | `void` | 移除全部船舶 |
| `focus(id)` | `void` | 聚焦高亮 |
| `unfocus(id)` | `void` | 取消聚焦 |
| `select(id)` | `void` | 选中 |
| `unselect(id)` | `void` | 取消选中 |
| `render()` | `void` | 手动触发渲染 |

船舶 ID 按字符串统一匹配，例如 `123` 与 `'123'` 指向同一条船。`load()` 中重复 ID 以最后一条数据为准；未变化的数据不会重复生成船体或更新 Tooltip。`render()` 仍可用于强制刷新。

`focus()` / `select()` 切换当前聚焦船舶；删除、清空或取消选中会取消尚未完成的聚焦回调。取消地图的 `beforeRemove` 不会清空船舶，实际移除地图时才释放船舶资源。

实形船体按地理坐标生成，地图旋转或倾斜不会改变船体的地理朝向。Tooltip 样式与航向长线计算保持原样。

### IBaseShipOptions

| 字段 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `id` | `string \| number` | ✅ | 唯一标识（如 MMSI） |
| `name` | `string` | ✅ | 船名 |
| `position` | `LngLat` | ✅ | 位置坐标 |
| `direction` | `number` | ✅ | 方向角（度） |
| `speed` | `number` | ✅ | 速度（节） |
| `hdg` | `number` | ✅ | 船首向 |
| `cog` | `number` | ✅ | 对地航向 |
| `rot` | `number` | ✅ | 转向速率（度/分钟） |
| `type` | `string` | ✅ | 插件名称（对应插件的 `static NAME`） |
| `time` | `Date` | ✅ | 数据时间戳 |
| `statusId` | `number` | - | 状态 ID |
| `status` | `string` | - | 状态描述 |
| `tooltip` | `boolean` | - | 是否显示提示框，默认 `true` |
| `width` | `number` | - | 船宽（米） |
| `height` | `number` | - | 船长（米） |
| `icon` | `string` | - | 自定义图标名称 |
| `minIconSize` | `number` | - | 最小图标尺寸（像素） |
| `maxIconSize` | `number` | - | 最大图标尺寸（像素） |
| `realZoom` | `number` | - | 实际缩放级别 |
| `top` | `number` | - | 上边界偏移 |
| `left` | `number` | - | 左边界偏移 |
| `right` | `number` | - | 右边界偏移 |
| `bottom` | `number` | - | 下边界偏移 |
| `props` | `Record<string, any>` | - | 自定义扩展属性 |

### IAisShipOptions

继承 `IBaseShipOptions`，额外字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `outLine` | `boolean` | 是否显示轮廓线 |
| `updateStatus` | `UPDATE_STATUS` | 更新状态（ONLINE / DELAY / OFFLINE） |

### 自定义船舶插件

```ts
import { BaseShip, IBaseShipOptions } from 'cmap-core'

interface IMyShipOptions extends IBaseShipOptions {
  customField?: string
}

class MyShip extends BaseShip<IMyShipOptions> {
  static NAME = 'MyShip'

  getIconName() {
    return 'my-icon-name'
  }
}

const ship = new Ship(map, { plugins: [MyShip] })
ship.add({ type: 'MyShip', ...options })
```

---

## Track — 轨迹模块

### 初始化

```ts
import { Track } from 'cmap-core'

const track = new Track(cmap.getMap(), {
  startLabel: '起',
  endLabel: '终',
})
```

### ITrackOptions

| 字段 | 类型 | 说明 |
|------|------|------|
| `startLabel` | `string` | 起点标签文本 |
| `endLabel` | `string` | 终点标签文本 |

### 方法

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `load(items)` | `void` | 加载轨迹数据 |
| `remove()` | `void` | 清空轨迹 |
| `render()` | `void` | 渲染 |
| `getFeature()` | `GeoJSON.Feature[]` | 获取所有 GeoJSON Feature |

### TrackItem

| 字段 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `id` | `string` | ✅ | 轨迹点唯一 ID |
| `pId` | `string` | ✅ | 所属轨迹 ID（通常为船舶 ID） |
| `index` | `number` | ✅ | 点索引，决定排列顺序 |
| `position` | `LngLat` | ✅ | 坐标 |
| `cog` | `number` | - | 对地航向（度） |
| `sog` | `number` | - | 对地速度（节） |
| `time` | `Date` | ✅ | 时间戳 |
| `props` | `Record<string, any>` | - | 自定义属性 |

### TooltipType — 特征点类型

轨迹会自动识别并标注关键节点：

```ts
enum TooltipType {
  START_END    = 0,  // 起终点（优先级最高）
  SHARP_TURN   = 1,  // 急转弯（航向变化大）
  STOP_GO      = 2,  // 启停变化（速度在 0 与非 0 间切换）
  TIME_ANCHOR  = 3,  // 时间锚点（相邻两点间隔 > 30 分钟）
  NORMAL       = 9,  // 普通点
}
```

---

## Plot — 标绘模块

所有标绘类型均继承自抽象类 `Poi`。

#### 编辑与生命周期约定

- `edit()`、`unedit()` 可重复调用；`hide()` 会停止当前拖拽，`show()` 恢复原来的编辑状态。
- `remove()` 清理图形、子节点及实例事件，支持重复调用；移除后的实例不应继续复用。
- `move(position)` 在程序调用时以标绘中心定位，鼠标拖拽时保留鼠标与标绘的相对位置。
- Line 节点 ID 在其他节点增删时保持稳定，顺序保存在 `properties.index`。使用 `getPoint(index)` / `getMidPoint(index)` 获取节点，不要通过索引拼接 ID。
- `insertPoint()`、`updatePoint()`、`removePointAt()` 会同步坐标和图形；`clearAll()` 清空整条线。`update()` 不能修改实例 ID。
- Fill 接受未闭合或已闭合的坐标数组；重复末端闭合点会被规范化。完成绘制至少需要三个不同顶点。
- `update.execute` 的第二个参数只在顶点更新时提供；整体移动没有该参数。`mid.update.done` 的 `originEvent` 为原始鼠标事件。
- Point、IconPoint、IndexPoint 均支持 `geometry`、`focus/unfocus` 和 `select/unselect`。

执行 `pnpm run test:plot` 可运行不依赖 WebGL 的标绘回归测试；该测试已包含在 `pnpm run check` 中。

### Poi 通用方法

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
| `setState(states)` | 写入内部状态 |
| `getState()` | 读取内部状态 |

### Poi 通用属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 唯一标识 |
| `isEdit` | `boolean` | 是否处于编辑模式 |
| `isFocus` | `boolean` | 是否处于聚焦状态 |
| `isCreate` | `boolean` | 是否处于创建模式 |
| `visibility` | `PlotVisibility` | 当前可见性 |
| `center` | `LngLat \| null` | 图形中心点 |
| `geometry` | `GeoJSON.Geometry \| null` | GeoJSON 几何体 |
| `options` | `T` | 当前配置 |

### Poi 通用事件

```ts
poi.on('create', (feature) => { })        // 创建完成
poi.on('update.before', (feature) => { }) // 更新前
poi.on('update.execute', (feature) => { })// 更新中
poi.on('update.done', (feature) => { })   // 更新完成
poi.on('click', (e) => { })               // 点击
poi.on('dblclick', (e) => { })            // 双击
poi.on('hover', (e) => { })               // 悬停
poi.on('unhover', (e) => { })             // 离开
```

浏览器双击会先产生两次 `click`，再产生一次 `dblclick`。组件保留这一标准顺序，避免为区分双击而延迟单击事件。

### IPoiOptions — 基础配置

所有标绘类型均继承此接口：

| 字段 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `id` | `string` | ✅ | 唯一标识 |
| `name` | `string` | - | 显示名称 |
| `visibility` | `PlotVisibility` | ✅ | 可见性：`'visible'` \| `'none'` |
| `isName` | `boolean` | - | 是否显示名称标签 |
| `style` | `any` | - | 样式配置 |
| `properties` | `Record<string, any>` | - | 自定义属性 |

### PlotType

```ts
enum PlotType {
  POINT       = 'Point',
  INDEX_POINT = 'IndexPoint',
  ICON_POINT  = 'IconPoint',
  LINE        = 'LineString',
  Fill        = 'Polygon',
  CIRCLE      = 'Circle',
}
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

名称使用 Mapbox symbol 字体渲染。传入自定义地图样式时，需要在 style 中配置可用的 `glyphs` 地址。

### IPointOptions

继承 `IPoiOptions`，额外字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `position` | `LngLatLike` | 坐标，支持 `LngLat`、`[经度, 纬度]` 或 `{ lng, lat }` |
| `style` | `CirclePointStyle` | 样式 |
| `properties` | `Record<string, any>` | 自定义属性 |

### CirclePointStyle

| 属性 | 类型 | 说明 |
|------|------|------|
| `circle-radius` | `number` | 半径（像素） |
| `circle-color` | `ColorSpecification` | 填充颜色 |
| `circle-stroke-color` | `ColorSpecification` | 描边颜色 |
| `circle-stroke-width` | `number` | 描边宽度（像素） |
| `text-color` | `ColorSpecification` | 名称文字颜色 |
| `text-size` | `number` | 名称文字大小（像素） |
| `text-offset` | `[number, number]` | 名称文字偏移；显式配置优先于自动偏移 |
| `text-rotate` | `number` | 名称文字旋转角度（度），默认不跟随图标旋转 |
| `text-allow-overlap` | `boolean` | 是否允许名称重叠，默认 `true`；设为 `false` 时参与碰撞检测 |

---

### IndexPoint — 序号点

继承 `Point`，在圆点基础上显示序号。

```ts
import { IndexPoint } from 'cmap-core'

const p = new IndexPoint(cmap.getMap(), {
  id: 'idx-1',
  visibility: 'visible',
  position: [120.38, 36.07],
  index: 1,
})

p.render()
```

### IIndexPointOptions

继承 `IPointOptions`，额外字段：

| 字段 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `index` | `number` | ✅ | 显示的序号 |
| `style` | `IndexPointStyle` | - | 样式 |

### IndexPointStyle

| 属性 | 类型 | 说明 |
|------|------|------|
| `circle-radius` | `number` | 圆半径（像素） |
| `circle-color` | `ColorSpecification` | 圆填充颜色 |
| `circle-stroke-color` | `ColorSpecification` | 圆描边颜色 |
| `circle-stroke-width` | `number` | 圆描边宽度 |
| `text-color` | `string` | 序号文字颜色 |
| `text-size` | `number` | 序号文字大小 |

---

### IconPoint — 图标点

继承 `Point`，以自定义图标替代圆点。

```ts
import { IconPoint } from 'cmap-core'

const iconPoint = new IconPoint(cmap.getMap(), {
  id: 'icon-1',
  name: '港口',
  visibility: 'visible',
  position: [120.38, 36.07],
  icon: 'port-icon',       // 需在 IconManager 中已加载
  // 如果图标是通过 map.addImage() 直接注册的，请提供：
  // iconDimensions: { width: 32, height: 32 },
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

### IIconPointOptions

继承 `IPointOptions`，额外字段：

| 字段 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `icon` | `string` | ✅ | 图标名称，需在 IconManager 中已加载 |
| `iconDimensions` | `{ width: number; height: number }` | - | 直接使用 `map.addImage()` 时提供图标布局尺寸 |
| `style` | `IconPointStyle` | - | 样式 |

### IconPointStyle

| 属性 | 类型 | 说明 |
|------|------|------|
| `icon-size` | `number` | 图标缩放比例 |
| `icon-rotate` | `number` | 图标旋转角度（度） |
| `icon-anchor` | `IconAnchor` | 图标锚点位置 |
| `text-color` | `string` | 文字颜色 |
| `text-size` | `number` | 文字大小（像素） |
| `text-offset` | `[number, number]` | 文字偏移 `[x, y]` |
| `text-rotate` | `number` | 文字旋转角度（度） |
| `text-allow-overlap` | `boolean` | 是否允许文字重叠，默认 `true` |

```ts
type IconAnchor =
  | 'center' | 'left' | 'right' | 'top' | 'bottom'
  | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
```

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
  vertexStyle: {
    'circle-radius': 5,
    'circle-color': '#ffffff',
    'circle-stroke-color': '#EF4444',
    'circle-stroke-width': 2,
  },
  midStyle: {
    'circle-radius': 3,
    'circle-color': '#3B82F6',
  },
})

line.render()
```

### ILineOptions

继承 `IPoiOptions`，额外字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `position` | `LngLat[]` | 顶点坐标数组 |
| `style` | `LineStyle` | 线样式 |
| `vertexStyle` | `CirclePointStyle \| IndexPointStyle \| IconPointStyle` | 编辑时顶点样式 |
| `midStyle` | `CirclePointStyle \| IndexPointStyle \| IconPointStyle` | 编辑时中点样式 |
| `properties` | `Record<string, any>` | 自定义属性 |

### LineStyle

| 属性 | 类型 | 说明 |
|------|------|------|
| `line-color` | `ColorSpecification` | 线颜色 |
| `line-width` | `number` | 线宽度（像素） |
| `text-size` | `number` | 标注文字大小 |

### Line 特有方法

| 方法 | 说明 |
|------|------|
| `insertPoint(index, position)` | 在指定索引处插入顶点，返回新顶点实例 |
| `updatePoint(index, position, isRender?)` | 更新指定顶点坐标 |
| `updateMidPoint(index, position)` | 更新指定中点坐标 |
| `removePointAt(index)` | 删除指定顶点 |
| `getPoint(index)` | 获取指定顶点实例 |
| `getMidPoint(index)` | 获取指定中点 |

### PointType（顶点类型枚举）

```ts
enum PointType {
  VERTEX   = 'Vertex',    // 顶点
  MIDPOINT = 'MidPoint',  // 中点
}
```

---

### ArrowLine — 箭头线

继承 `Line`，顶点以箭头图标表示，箭头方向根据前后顶点自动计算。

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

### IArrowLineOptions

继承 `ILineOptions`，额外字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `vertexStyle` | `IconPointStyle` | 顶点（箭头）样式 |

---

### IndexLine — 序号线

继承 `Line`，顶点显示为序号点。

```ts
import { IndexLine } from 'cmap-core'

const indexLine = new IndexLine(cmap.getMap(), {
  id: 'idx-line-1',
  name: '1 号航线',
  visibility: 'visible',
  position: [[120.38, 36.07], [120.45, 36.12]],
})

indexLine.render()
```

### IIndexLineOptions

与 `ILineOptions` 相同，无额外字段。

---

### Fill — 多边形

```ts
import { Fill } from 'cmap-core'

const fill = new Fill(cmap.getMap(), {
  id: 'fill-1',
  name: '监控区域',
  visibility: 'visible',
  position: [[120.38, 36.07], [120.45, 36.07], [120.45, 36.12], [120.38, 36.07]],
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

### IFillOptions

继承 `IPoiOptions`，额外字段：

| ���段 | 类型 | 说明 |
|------|------|------|
| `position` | `LngLat[]` | 多边形顶点坐标，首尾自动闭合 |
| `style` | `FillStyle` | 填充样式 |
| `outLineStyle` | `LineStyle` | 轮廓线样式 |
| `icon` | `string` | 标题图标名称 |
| `vertexStyle` | `PointStyle` | 编辑时顶点样式 |
| `midStyle` | `PointStyle` | 编辑时中点样式 |
| `titleStyle` | `PointStyle` | 标题图标样式 |
| `properties` | `Record<string, any>` | 自定义属性 |

### FillStyle

| 属性 | 类型 | 说明 |
|------|------|------|
| `fill-color` | `ColorSpecification` | 填充颜色 |
| `fill-opacity` | `number` | 填充透明度（0 ~ 1） |

---

### Circle — 圆形

```ts
import { Circle } from 'cmap-core'
import { LngLat } from 'mapbox-gl'

const circle = new Circle(cmap.getMap(), {
  id: 'circle-1',
  name: '警戒区',
  visibility: 'visible',
  isName: true,
  center: new LngLat(120.38, 36.07),
  radius: 1000,
  unit: 'meters',
  style: {
    'fill-color': '#3B82F6',
    'fill-opacity': 0.3,
    'line-color': '#2563EB',
    'line-width': 2,
  },
})

circle.render()
circle.edit()
```

交互绘制时不传 `center` 和 `radius`，调用 `start()` 后第一次点击确定圆心，移动鼠标预览半径，第二次点击完成并进入编辑状态。

```ts
const circle = new Circle(cmap.getMap(), {
  id: 'circle-draw-1',
  visibility: 'visible',
})

circle.start()
```

编辑状态下可拖动圆心控制点移动圆心、拖动半径控制点调整半径，也可拖动圆形本体整体移动。

### ICircleOptions

继承 `IPoiOptions`，额外字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `center` | `LngLat` | 圆心坐标 |
| `radius` | `number` | 半径数值 |
| `unit` | `Units` | 半径单位，默认 `meters`，见下表 |
| `steps` | `number` | 圆周采样点数，默认 `64`，最小 `4` |
| `style` | `CircleStyle` | 样式 |
| `centerStyle` | `PointStyle` | 圆心控制点样式 |
| `radiusStyle` | `PointStyle` | 半径控制点样式 |

**unit 可选值：**
`meters` `metres` `kilometers` `kilometres` `miles` `nauticalmiles` `feet` `yards` `inches` `centimeters` `centimetres` `millimeters` `millimetres` `radians` `degrees`

### CircleStyle

| 属性 | 类型 | 说明 |
|------|------|------|
| `fill-color` | `ColorSpecification` | 填充颜色 |
| `fill-opacity` | `number` | 填充透明度（0 ~ 1） |
| `line-color` | `ColorSpecification` | 轮廓颜色 |
| `line-width` | `number` | 轮廓宽度（像素） |

### Circle 常用方法

| 方法 | 说明 |
|------|------|
| `setCenter(position)` | 更新圆心并保持半径不变 |
| `setRadius(radius)` | 直接按当前单位更新半径 |
| `setRadiusFrom(position)` | 根据圆心和目标坐标计算半径 |
| `start()` / `stop()` | 开始 / 停止交互绘制 |
| `edit()` / `unedit()` | 开启 / 关闭控制点编辑 |
| `show()` / `hide()` | 显示 / 隐藏圆和控制点 |
| `select()` | 缩放至圆形范围并显示聚焦框 |
| `remove()` | 移除圆形及其控制点和事件 |

---

## IconManager — 图标管理

`CMap` 实例内置 `icon` 属性，也可独立使用。

```ts
import { IconManager } from 'cmap-core'

const iconManager = new IconManager(cmap.getMap())
```

### 方法

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `load(icons)` | `Promise<{success, error}>` | 批量加载 URL 图片 |
| `loadSvg(icons)` | `Promise<{success, error}>` | 批量加载 SVG |
| `add(icon)` | `Promise<IconLoadResult>` | 添加单个 URL 图标 |
| `addSvg(icon)` | `Promise<IconLoadResult>` | 添加单个 SVG 图标 |
| `has(name)` | `boolean` | 检查是否已加载 |
| `getImage(name)` | `Image \| undefined` | 获取已缓存图片 |
| `update(icon)` | `Promise<IconLoadResult>` | 更新图标 |
| `delete(name)` | `void` | 删除图标缓存 |

### Icon

```ts
interface Icon {
  name: string                          // 图标名称（唯一标识）
  url: string                           // 图片 URL
  options?: Partial<StyleImageMetadata> // 可选元数据
}
```

### SvgIcon

```ts
interface SvgIcon {
  name: string  // 图标名称（唯一标识）
  svg: string   // SVG 字符串
}
```

### IconLoadResult

```ts
interface IconLoadResult {
  code: RESULT_CODE           // 0 成功 / -1 失败
  data: Icon | SvgIcon        // 原始入参
  msg:  string | Error        // 结果信息或错误
}

enum RESULT_CODE {
  SUCCESS =  0,
  FAIL    = -1,
}
```

### 示例

```ts
// 加载 URL 图片
await cmap.icon.load([
  { name: 'port', url: 'https://example.com/port.png' }
])

// 加载 SVG
await cmap.icon.loadSvg([
  { name: 'ship-online', svg: '<svg viewBox="0 0 32 32">...</svg>' }
])

cmap.icon.has('port')       // true
cmap.icon.getImage('port')  // Image | undefined
cmap.icon.delete('port')
```

---

## Tooltip — 提示框

普通文字标签只需 `new Tooltip(map, { position, text })`，无需创建 DOM、管理器或调用 `render()`。
同一地图共享一个 Canvas，自动在下一次地图渲染帧显示；地图尚未加载时会等待加载完成。
默认保留船名 / 轨迹时间标签的半透明白底、圆角、加粗文字及阴影。

```ts
import { Tooltip } from 'cmap-core'

const tooltip = new Tooltip(cmap.getMap(), {
  position: [120.38, 36.07],
  text: '浙渔 001',
})

// 按需指定偏移、连接线、防重叠和主题
const trackLabel = new Tooltip(cmap.getMap(), {
  position: [120.39, 36.08],
  text: '2026-10-13 12:34:56',
  theme: 'track',
  anchor: 'bottom-right',
  offsetX: 5,
  offsetY: 25,
  line: true,
  collision: true,
})

// 以下操作自动合并到下一帧
tooltip.update({ text: '浙渔 002' })
tooltip.setLngLat([120.39, 36.08])
tooltip.hide()
tooltip.show()
tooltip.remove()
```

原有 `element: HTMLElement` 用法继续支持，使用 DOM 兼容渲染并保留原元素和事件处理器。
`text` 与 `element` 必须二选一；`update({ text })` / `update({ element })` 可以切换渲染模式。
文本模式支持下表中的样式参数，并不执行任意 HTML/CSS。复杂布局和交互内容请继续使用 `element`。

```ts
const popup = new Tooltip(cmap.getMap(), {
  position: [120.38, 36.07],
  element: document.getElementById('popup')!,
  className: 'my-interactive-tooltip',
})
```

`render()` 保留兼容，现在只请求一次批量重绘；`visible` 表示最近一帧布局后的实际可见性，
`options.visible` 表示用户请求的显示状态。视野外和碰撞隐藏不会修改用户状态。
`remove()` / `destroy()` 完整释放该标签且不可再次显示，暂时隐藏请使用 `hide()`。
最后一个标签移除或地图销毁后，会释放共享 Canvas、监听器、尺寸观察器和位图缓存。

### ITooltipOptions

| 字段 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `id` | `string \| number` | - | 省略自动生成；创建后不可更改 |
| `position` | `LngLatLike` | ✅ | 支持坐标数组、经纬度对象及 `LngLat` |
| `text` | `string` | 二选一 | Canvas 文本，可包含换行符 |
| `element` | `HTMLElement` | 二选一 | DOM 兼容模式，保留原元素 |
| `renderer` | `'canvas' \| 'dom'` | - | 自动根据内容选择；显式指定时必须与内容匹配 |
| `theme` | `'default' \| 'ship' \| 'track'` | - | 文本主题，默认使用船名样式 |
| `style` | `TooltipTextStyle` | - | 文本模式的样式覆盖 |
| `visible` | `boolean` | - | 是否可见，默认 `true` |
| `anchor` | `Anchor` | - | 锚点方向，默认 `'bottom-right'` |
| `offsetX` / `offsetY` | `number` | - | 默认 `0`；按照锚点方向计算带符号的 CSS 像素偏移 |
| `line` | `boolean` | - | 默认关闭；连接至朝向目标的标签边界，支持文本圆角；目标被标签覆盖时不画线 |
| `className` | `string` | - | DOM 容器类名 / 文本主题测量时的类名 |
| `collision` | `boolean` | - | 默认关闭；船名、轨迹时间标签内部默认开启 |
| `targetRadius` | `number` | - | 目标图标避让半径（CSS 像素），默认 `0`；仅参与避让、不截短连线，内置船名标签自动计算 |
| `priority` | `number` | - | 碰撞布局优先级，数值越大越优先 |
| `anchors` | `Anchor[]` | - | 碰撞时尝试的候选方向，默认四个角 |

`TooltipTextStyle` 支持 `fontFamily`、`fontSize`、`fontWeight`、`lineHeight`、`color`、
`backgroundColor`、`paddingX`、`paddingY`、`borderRadius`、`shadowColor`、`shadowBlur`、
`shadowOffsetX` 和 `shadowOffsetY`。尺寸均为 CSS 像素，设备像素比由内部处理。
部分 `style` 更新会与现有覆盖参数合并；网页主题 CSS 改变后调用 `Tooltip.refreshStyles(map)`
重新读取样式，字体加载完成则自动刷新。

文本位图缓存上限为每地图 32 MiB（不含主画布及浏览器开销）；可见内容超出预算时，
复用背景并直接绘制文字，保持所有未被碰撞规则隐藏的标签可见。初始化位图分帧生成。
Canvas 文本不能像 HTML 那样选择文字或接收 DOM 事件，需要这些能力时使用 DOM 模式。

开启 `collision` 后，会检查标签重叠、连接线穿过其他标签、连接线交叉，以及已注册标签的目标保护区。
固定位置（`collision: false`）的标签不会被自动隐藏，但会作为自动布局的障碍物。
候选方向均不可用时，低优先级标签暂时隐藏；障碍消失后自动恢复，不修改 `options.visible`。
此处只处理 Tooltip 的短连接线，不参与船舶航向长线的计算和绘制。

```ts
type Anchor =
  | 'center'
  | 'top' | 'bottom' | 'left' | 'right'
  | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
```

---

## Collision — 碰撞检测

基于 [RBush](https://github.com/mourner/rbush) 空间索引，检测元素（通常是 Tooltip）之间是否重叠。

```ts
import { Collision, CollisionItem } from 'cmap-core'

const collision = new Collision()

collision.load([
  {
    id: 'a',
    center:        [x1, y1, x2, y2],
    top:           [x1, y1, x2, y2],
    bottom:        [x1, y1, x2, y2],
    left:          [x1, y1, x2, y2],
    right:         [x1, y1, x2, y2],
    'top-left':    [x1, y1, x2, y2],
    'top-right':   [x1, y1, x2, y2],
    'bottom-left': [x1, y1, x2, y2],
    'bottom-right':[x1, y1, x2, y2],
  },
])

const collided = collision.collides() // 返回所有发生碰撞的 CollisionItem
collision.getItem('a')                // 获取指定 CollisionItem
collision.getCollisions()             // 获取全部碰撞结果
collision.clear()                     // 清空
```

---

## 位置类型参考

```ts
type LngLat             = [number, number]        // [经度, 纬度]
type PointPosition      = LngLat
type LineStringPosition = LngLat[]
type PolygonPosition    = LngLat[]                // 首尾自动闭合
type PlotPosition       = PointPosition | LineStringPosition | PolygonPosition
type PlotVisibility     = 'visible' | 'none'
```

---

## 完整示例

```ts
import { CMap, Ship, AisShip, Track, Fill, Line, Point } from 'cmap-core'
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
    id: 1,
    name: '船舶001',
    type: 'AisShip',
    position: [120.38, 36.07],
    direction: 45,
    speed: 10,
    hdg: 45,
    cog: 45,
    rot: 0,
    time: new Date(),
    tooltip: true,
  },
])

// 3. 绘制轨迹
const track = new Track(cmap.getMap(), { startLabel: '起', endLabel: '终' })
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
  position: [[120.36, 36.05], [120.46, 36.05], [120.46, 36.15], [120.36, 36.05]],
  style: { 'fill-color': '#3B82F6', 'fill-opacity': 0.2 },
  outLineStyle: { 'line-color': '#3B82F6', 'line-width': 2 },
})
fill.render()

// 5. 切换底图（自动保留 zone-1 等自定义图层）
cmap.change(CMap.SATELLITE)
```

---

## 类型导入参考

```ts
import type {
  // 地图
  ICMapOptions,
  MapType,
  BeforeRemoveEvent,
  // 船舶
  IShipOptions,
  IBaseShipOptions,
  IAisShipOptions,
  BaseShipConstructor,
  // 轨迹
  ITrackOptions,
  TrackItem,
  TrackItemWithLabel,
  TooltipType,
  // 标绘基础
  IPoiOptions,
  PlotType,
  PlotVisibility,
  PointPosition,
  LineStringPosition,
  PolygonPosition,
  // 圆点
  IPointOptions,
  CirclePointStyle,
  // 序号点
  IIndexPointOptions,
  IndexPointStyle,
  // 图标点
  IIconPointOptions,
  IconPointStyle,
  IconAnchor,
  // 折线
  ILineOptions,
  LineStyle,
  PointType,
  // 箭头线
  IArrowLineOptions,
  // 多边形
  IFillOptions,
  FillStyle,
  // 圆形
  ICircleOptions,
  CircleStyle,
  // 图标
  Icon,
  SvgIcon,
  IconLoadResult,
  // Tooltip
  ITooltipOptions,
  Anchor,
} from 'cmap-core'
```
