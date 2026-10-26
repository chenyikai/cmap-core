# Track 轨迹接入

[独立 Demo](../examples/track/index.html) 展示两组轨迹、节点图标、时间标签和悬停事件。Track 用于绘制历史轨迹；当前没有内置播放时间轴或按时间回放控制器。

## 数据格式

最重要的约定：`id` 是轨迹 ID，`pId` 是该轨迹点的唯一 ID。不要反过来使用。

```ts
import { Track, type TrackItem } from 'cmap-core'
import { LngLat } from 'mapbox-gl'

const track = new Track(map, { startLabel: '起', endLabel: '终' })
const points: TrackItem[] = [
  {
    id: 'voyage-1',
    pId: 'voyage-1-0',
    index: 0,
    position: new LngLat(122.24, 29.94),
    time: new Date('2026-10-14T08:00:00+08:00'),
    sog: 8,
  },
  {
    id: 'voyage-1',
    pId: 'voyage-1-1',
    index: 1,
    position: new LngLat(122.25, 29.95),
    time: new Date('2026-10-14T08:10:00+08:00'),
    sog: 9,
  },
  {
    id: 'voyage-1',
    pId: 'voyage-1-2',
    index: 2,
    position: new LngLat(122.27, 29.96),
    time: new Date('2026-10-14T08:20:00+08:00'),
    sog: 7,
  },
]
track.load(points)
track.render()
```

| 字段     | 类型         | 规则                                               |
| -------- | ------------ | -------------------------------------------------- |
| id       | string       | 同一轨迹所有点相同                                 |
| pId      | string       | 点 ID，在同一地图的轨迹源内唯一，且不要等于轨迹 ID |
| index    | number       | 必填业务序号；实际绘制按 time 升序，而不是按 index |
| position | LngLat       | 经纬度对象                                         |
| time     | Date         | 有效 Date；接口字符串需先转换                      |
| cog、sog | number，可选 | 航向与速度                                         |
| props    | Record，可选 | 自定义业务数据                                     |

每组至少传入两个有效点，否则无法形成 LineString。不要让不同轨迹共用 pId，否则点和 Tooltip 会相互覆盖。

## 多条轨迹与更新

`load(items)` 只接受同一轨迹的一组点，以第一项的 id 为准，过滤掉其他 id。多条轨迹应分组逐次 load，最后统一 render。

```ts
const groups = new Map<string, TrackItem[]>()
for (const item of apiItems) {
  groups.set(item.id, [...(groups.get(item.id) ?? []), item])
}
track.remove()
for (const items of groups.values()) {
  if (items.length >= 2) track.load(items)
}
track.render()
```

同 ID 的 load 覆盖内存中的该组数据，但已绘制的旧节点需要正确清除。尤其是点数减少、pId 改变或缩放简化时，当前实现不保证自动删除所有旧 GeoJSON 节点。全量刷新推荐 `remove()` 后重新分组 load 和 render，避免残留。`load([])` 是无操作，不会清空轨迹。

## 公开方法

| 方法或属性   | 作用                                                   |
| ------------ | ------------------------------------------------------ |
| load(items)  | 更新一组轨迹数据，不立即渲染                           |
| render()     | 生成线、节点和复用的时间 Tooltip                       |
| getFeature() | 当前缩放级别下的 GeoJSON Feature 数组                  |
| remove()     | 清空轨迹数据、已绘制要素和标签                         |
| destroy()    | 释放模块与交互监听；单独移除业务时先 remove 再 destroy |
| trackData    | 轨迹 ID 到已标记节点的 Map                             |

`startLabel/endLabel` 是当前构造配置的必填字段，但图标渲染使用内置起终点图形，时间标签使用格式化时间；修改这两个字段不会替换图标或时间标签文案。

## 标签与事件

地图缩放较小时会按航向变化简化长轨迹，16 级起保留所有节点。绘制出的点会显示共享 Canvas 时间标签，并执行碰撞避让。

```ts
map.on('track-hover', (event: TrackItem) => {
  console.log(event.id, event.pId, event.time)
})
map.on('track-unhover', (event: TrackItem) => {
  console.log('离开节点', event.pId)
})
```

`TooltipType` 提供 START_END、SHARP_TURN、STOP_GO、TIME_ANCHOR、NORMAL 标记。当前 STOP_GO 判定读取的是航向值而非 sog，不应把它作为可靠的启停分析结果；当前标签也没有依据这些标记实现完整的业务优先级展示。业务级启停、急转弯告警应在数据层计算。
