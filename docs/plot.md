# 标绘创建与交互编辑

标绘由 Point、IndexPoint、IconPoint、Line、ArrowLine、IndexLine、Fill 和 Circle 八种具体类提供；没有可直接实例化的 Plot 管理器。它们共用 Poi 抽象接口，实例 ID 在同一地图上应全局唯一。

## 通用流程

```ts
import { Point } from 'cmap-core'
import { LngLat } from 'mapbox-gl'

const point = new Point(map, {
  id: 'port-1',
  name: '港口',
  isName: true,
  visibility: 'visible',
  position: new LngLat(122.25, 29.95),
})
point.render()
point.edit()
point.on('update.done', ({ instance }) => console.log(instance.getFeature()))
```

| 通用配置     | 规则                                                      |
| ------------ | --------------------------------------------------------- |
| id           | 必填字符串；创建后不可更改                                |
| visibility   | 必填，`visible` 或 `none`                                 |
| name、isName | 名称及是否显示名称；不同图形对标题的支持不同              |
| style        | 当前图形对应的样式，不是任意 Mapbox paint 对象            |
| properties   | 业务属性；避免覆盖 id、meta、index、visibility 等内部字段 |

| 通用方法                       | 作用                                                  |
| ------------------------------ | ----------------------------------------------------- |
| render()                       | 创建配置后显式提交图形                                |
| start()、stop()                | 开始或停止交互创建，适用于空实例                      |
| edit()、unedit()               | 开启或结束编辑                                        |
| show()、hide()                 | 显隐；隐藏时终止正在进行的拖拽                        |
| move(LngLat)                   | 通过程序移动图形中心                                  |
| update(options)                | 完整配置更新；使用展开原 options 的方式做局部修改     |
| focus()、unfocus()             | 聚焦高亮；部分类型使用边框                            |
| select()、unselect()           | 选中与取消；具体相机行为随子类不同                    |
| getFeature()、geometry、center | 获取 GeoJSON、几何和中心；未完成绘制可能为 null       |
| setState()、getState()         | 读写 feature-state；不要随意修改内部 create/edit 状态 |
| remove()                       | 移除资源、节点和监听；可重复调用，移除后不要复用      |

```ts
point.update({
  ...point.options,
  name: '新名称',
  style: { ...point.options.style, 'circle-color': '#168a97' },
})
point.hide()
point.show()
const geojson = point.getFeature()
point.remove()
```

## Point 圆点

[运行 Point Demo](../examples/point/index.html)。这是屏幕圆点标记，不是地理半径范围；地理圆使用 Circle。

```ts
const point = new Point(map, {
  id: 'point-1',
  name: '监测点',
  isName: true,
  visibility: 'visible',
  position: [122.25, 29.95],
  style: {
    'circle-radius': 10,
    'circle-color': '#168a97',
    'circle-stroke-width': 2,
    'circle-stroke-color': '#fff',
    'text-color': '#234',
    'text-size': 13,
    'text-allow-overlap': false,
  },
})
point.render()
```

圆点和文字尺寸会随图层缩放表达式变化，不是所有 zoom 下的固定像素。`text-offset` 使用 Mapbox 的文字偏移单位；显式配置会覆盖自动计算的文字间距。文字需要 glyphs 服务或 `localFontFamily`。

## IndexPoint 序号点

[运行 IndexPoint Demo](../examples/index-point/index.html)。继承 Point，额外要求 `index`。

```ts
import { IndexPoint } from 'cmap-core'
const point = new IndexPoint(map, {
  id: 'index-point-1',
  index: 1,
  visibility: 'visible',
  position: [122.25, 29.95],
  style: { 'circle-radius': 16, 'text-size': 14 },
})
point.render()
point.update({ ...point.options, index: 2 })
```

## IconPoint 图标点

[运行 IconPoint Demo](../examples/icon-point/index.html)。先注册图标再创建点；图标名字不是 URL。

```ts
import { IconPoint, IconManager } from 'cmap-core'
const icons = new IconManager(map)
await icons.addSvg({
  name: 'port-icon',
  svg: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="14" fill="#168a97"/></svg>',
})
const point = new IconPoint(map, {
  id: 'icon-point-1',
  icon: 'port-icon',
  name: '灯塔',
  isName: true,
  position: [122.25, 29.95],
  visibility: 'visible',
  style: { 'icon-size': 1, 'icon-rotate': 0, 'icon-anchor': 'bottom' },
})
point.render()
```

通过 `map.addImage()` 直接注册时，可用 `iconDimensions: { width, height }` 提供原始尺寸以计算标签偏移。图标缩放使用 `icon-size` 倍数。

## Line 折线

[运行 Line Demo](../examples/line/index.html)。position 必须是 LngLat 数组。

```ts
import { Line } from 'cmap-core'
const line = new Line(map, {
  id: 'line-1',
  name: '巡检航线',
  isName: true,
  visibility: 'visible',
  position: [new LngLat(122.24, 29.94), new LngLat(122.26, 29.96)],
  style: { 'line-color': '#168a97', 'line-width': 3 },
  vertexStyle: { 'circle-color': '#fff', 'circle-stroke-color': '#168a97' },
  midStyle: { 'circle-radius': 5 },
})
line.render()
line.edit()
line.insertPoint(1, new LngLat(122.25, 29.955))
line.updatePoint(1, new LngLat(122.251, 29.955))
```

`getPoint(index)`、`getMidPoint(index)` 按当前序号取节点，`removePointAt(index)` 删除节点，`clearAll()` 清空坐标。顶点和中点 ID 有自己的生命周期，不要按索引拼接内部 ID。

`vertexStyle` 设置实顶点，`midStyle` 设置编辑中点。拖拽中点可插入新顶点。修改完后可用 getFeature 导出 GeoJSON，但重新加载仍需把坐标转换为 LngLat 数组。

## ArrowLine 和 IndexLine

[运行 ArrowLine Demo](../examples/arrow-line/index.html) · [运行 IndexLine Demo](../examples/index-line/index.html)。两者继承 Line 的编辑和节点方法。

```ts
import { ArrowLine, IndexLine } from 'cmap-core'
const positions = [new LngLat(122.24, 29.94), new LngLat(122.25, 29.955), new LngLat(122.27, 29.96)]
const arrow = new ArrowLine(map, {
  id: 'arrow-1',
  visibility: 'visible',
  position: positions,
  style: { 'line-color': '#168a97' },
  vertexStyle: { 'icon-size': 0.7 },
})
const indexed = new IndexLine(map, {
  id: 'indexed-1',
  visibility: 'visible',
  position: positions,
  vertexStyle: { 'circle-radius': 14 },
})
arrow.render()
indexed.render()
```

ArrowLine 使用内置起终点 SVG 和中间节点方向箭头，不是在每个线段上均匀铺设箭头。IndexLine 按节点顺序从 1 编号，插入、删除后同步编号。

## Fill 多边形

[运行 Fill Demo](../examples/fill/index.html)。支持一个外环，输入至少三个不同顶点。可传未闭合环或首尾相同的环；不使用带孔、多多边形数据结构。

```ts
import { Fill } from 'cmap-core'
const zone = new Fill(map, {
  id: 'zone-1',
  name: '锚地',
  visibility: 'visible',
  position: [new LngLat(122.24, 29.94), new LngLat(122.27, 29.94), new LngLat(122.26, 29.97)],
  style: { 'fill-color': '#168a97', 'fill-opacity': 0.2 },
  outLineStyle: { 'line-color': '#168a97', 'line-width': 2 },
})
zone.render()
zone.edit()
```

填充与边线样式分别配置；`vertexStyle`、`midStyle` 配置编辑节点。`icon` 配合标题图标使用，需先注册图标；当前 `titleStyle` 虽在类型中声明，但尚未传递给内部标题实例，不应依赖它调整标题样式。仅需要区域文字时，可以单独创建 Tooltip，避免依赖图标标题。

## Circle 圆形

[运行 Circle Demo](../examples/circle/index.html)。Circle 以经纬度中心和地理距离生成 Polygon。

```ts
import { Circle } from 'cmap-core'
const circle = new Circle(map, {
  id: 'range-1',
  visibility: 'visible',
  center: new LngLat(122.25, 29.95),
  radius: 500,
  unit: 'meters',
  steps: 64,
  style: { 'fill-color': '#168a97', 'fill-opacity': 0.2, 'line-color': '#168a97', 'line-width': 2 },
})
circle.render()
circle.edit()
circle.setRadius(800)
circle.render()
```

`unit` 默认 meters，`steps` 默认 64。`setCenter(LngLat)`、`setRadius(number)`、`setRadiusFrom(LngLat)` 和 `update({ ...options, radius })` 都会自动 render。半径必须为有限非负数，0 不产生可见面；steps 至少 4 且为整数。编辑模式具有圆心和半径控制点。

## 交互创建

新建没有坐标的实例后调用 start。例：

```ts
const drawing = new Line(map, { id: 'draw-line', visibility: 'visible', position: [] })
drawing.on('create', ({ instance }) => console.log('完成', instance.getFeature()))
drawing.start()
```

| 类型       | 操作                                                   |
| ---------- | ------------------------------------------------------ |
| Point 系列 | 单击地图确定位置                                       |
| Line 系列  | 连续单击添加顶点，双击完成；至少两个点                 |
| Fill       | 连续单击添加顶点，回到首点或右键结束；至少三个不同顶点 |
| Circle     | 第一次点击确定圆心，第二次点击或右键确定半径           |

绘制工具会暂时控制双击缩放，退出后恢复原状态。建议业务 UI 同时只启用一个绘图工具，切换时先 stop 或 remove 前一个。

## 交互事件

| 事件                                                   | 含义                                   |
| ------------------------------------------------------ | -------------------------------------- |
| create                                                 | 交互创建完成                           |
| click、hover、unhover                                  | 点击与悬停；具体类型可用事件以实现为准 |
| dblclick                                               | Point、Circle 等类型的双击             |
| update.before、update.execute、update.done             | 拖拽或顶点修改开始、进行和结束         |
| mid.update.before、mid.update.execute、mid.update.done | 中点插入阶段                           |

事件第一个参数通常为 `{ originEvent, instance }`，部分顶点更新事件有第二个节点参数，整体移动没有该参数。业务保存建议监听完成事件，避免每次鼠标移动都向后端提交。
