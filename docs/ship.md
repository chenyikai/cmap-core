# Ship 与 AisShip 船舶接入

[独立 Demo](../examples/ship/index.html) 包含静止、左右转弯、不同船宽船长和不同时效的船舶。Ship 管理实例集合，AisShip 负责 AIS 的图标、真实船体、速度线和名称标签。

## 最小用法

```ts
import { Ship, AisShip, type IAisShipOptions } from 'cmap-core'
import { LngLat } from 'mapbox-gl'

const fleet = new Ship(map, { plugins: [AisShip] })
const data: IAisShipOptions = {
  id: '413000001',
  name: '示例货轮',
  type: AisShip.NAME,
  position: new LngLat(122.25, 29.95),
  time: new Date(),
  direction: 90,
  hdg: 90,
  cog: 90,
  speed: 8,
  rot: 25,
  width: 28,
  height: 160,
  realZoom: 16,
  tooltip: true,
}
fleet.add(data) // 自动提交渲染，不必再调用 render()
```

## 输入字段

| 字段                     | 类型与单位       | 要求与含义                                                        |
| ------------------------ | ---------------- | ----------------------------------------------------------------- |
| id                       | string 或 number | 必填；稳定且唯一的船舶 ID                                         |
| type                     | string           | 必填；必须等于已注册插件的 NAME                                   |
| name                     | string           | 必填；船名或业务名称                                              |
| position                 | LngLat           | 必填；经纬度对象                                                  |
| time                     | Date             | 必填；数据采集时间，用于在线状态                                  |
| speed                    | number，节       | 必填；速度线长度依据                                              |
| hdg、cog                 | number，度       | 必填；艏向、航迹向                                                |
| direction                | number，度       | 类型契约中的必填字段；AisShip 实际取向由 hdg/cog getter 计算      |
| rot                      | number           | 必填；当前只按正负决定转向；0 和 -128 表示无转弯指示              |
| width、height            | number，米       | 船宽、船长；真实船型需要两者都有有效正值                          |
| realZoom                 | number，默认 16  | 达到该级别后尝试真实船型，无尺寸则仍显示图标                      |
| tooltip                  | boolean          | 显式传 true 才创建默认船名 Tooltip；省略不会创建                  |
| icon                     | string           | 可选自定义图标名，先通过 IconManager 注册                         |
| minIconSize、maxIconSize | number           | 图标缩放倍数，不是像素；缺省表达式使用 0.2、0.5                   |
| top、bottom、left、right | number           | 旧式天线偏移输入；四项均为真值时才应用，不等同于完整 AIS 偏移模型 |
| statusId、status、props  | 可选业务字段     | 保存状态描述或业务扩展数据                                        |

`outLine`、`updateStatus` 虽在 IAisShipOptions 中公开，当前渲染会生成或重算这些属性，不应当作可直接控制轮廓显隐、在线颜色的开关。

## 图标与真实船体

低于 `realZoom` 使用三角图标，达到阈值且有宽长时生成真实船体 Polygon。船体只包含轮廓，速度和转向统一由 `headingLine()` 绘制。

- 速度小于 0.5：不绘制速度线和转向小弯。
- 速度线主体长度为 `speed × 92.52` 米，从船舶位置出发；缩放不会改变这段地理长度。
- 左转使用 `rot < 0`，右转使用 `rot > 0`；`rot = -128` 单独按直航处理。
- 转向小弯位于速度线末端，方向偏转 90 度；真实船型长度为船宽一半，图标模式按 10 CSS 像素换算。
- 当前取向优先使用 `0 < hdg < 360` 且不为 511 的值，之后尝试 `0 < cog < 360`，最后回退到正北。若 hdg 为 0 而 cog 非零，当前实现会选 cog，不要假设 0 一定优先。

数据距当前时间不超过 30 分钟为 ONLINE，30 分钟至 2 小时为 DELAY，超过 2 小时为 OFFLINE。没有独立的后台时效刷新计时器；只刷新时效时可按业务周期调用 `fleet.render()`。

## 更新和删除

```ts
// 增量更新：同 ID / 同类型复用对象和 Tooltip。
fleet.add({ ...data, position: new LngLat(122.251, 29.951), time: new Date() })

// 全量列表：不在这次列表中的船会被删除。
fleet.load([data, anotherShip])
fleet.remove(data.id)
fleet.removeAll()
```

不要将接口返回的“局部变化列表”传给 `load()`；增量列表逐项调用 `add()` 即可。输入中的数字 `123` 和字符串 `'123'` 视为同一 ID；load 中重复 ID 以最后一项为准。未注册的类型不会创建实例。

| 方法              | 作用                                                 |
| ----------------- | ---------------------------------------------------- |
| add、load         | 添加或全量同步，自动渲染                             |
| get(id)           | 返回 BaseShip 实例或 undefined                       |
| render()          | 强制刷新当前全部船舶                                 |
| focus、unfocus    | 切换高亮，不主动飞行镜头                             |
| select、unselect  | 飞到船位并聚焦，或取消选中；当前 select 使用 zoom 16 |
| remove、removeAll | 删除一艘或清空全部                                   |
| destroy()         | 清空并释放管理器事件，之后不要继续使用               |
| ships、tooltips   | 当前船舶和标签列表                                   |

## 船舶事件

```ts
map.on('ship-click', (event: { options: IAisShipOptions }) => {
  console.log(event.options.id, event.options.name)
  fleet.select(event.options.id)
})
```

同样可监听 `ship-hover`、`ship-unhover`。原生地图事件由 Mapbox 包装，不要假设事件对象就是 BaseShip 实例；从 `event.options` 获取业务数据，再用 `fleet.get(id)` 取实例。模块内部共享事件总线使用 `click/hover/unhover`，对普通业务优先使用地图的 `ship-*` 事件名。

## 自定义船名与插件

```ts
import { Tooltip } from 'cmap-core'

const instance = fleet.get(data.id)
if (instance) {
  instance.setTooltip(
    new Tooltip(map, {
      position: data.position,
      text: '自定义船名',
      theme: 'ship',
      collision: true,
      line: true,
      offsetY: 30,
    }),
  )
}
```

只调整业务取向或样式逻辑时可继承 AisShip，提供新的 `static NAME` 并注册；直接继承 BaseShip 必须实现全部抽象方法，不能只实现 getIconName。请参考 [扩展开发](extensions.md)。
