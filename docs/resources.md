# ResourceRegister 数据源与图层

[独立 Demo](../examples/resources/index.html) 演示点的增量移动、feature-state、删除和快照读取。ResourceRegister 是 SDK 对 Mapbox 资源的统一注册和按 ID 数据更新层。

## 注册资源

```ts
import { ResourceRegister } from 'cmap-core'
const register = new ResourceRegister(map)
register.addSource('business-points', {
  type: 'geojson',
  dynamic: true,
  data: { type: 'FeatureCollection', features: [] },
})
register.addLayer({
  zIndex: 20,
  layer: {
    id: 'business-points-layer',
    type: 'circle',
    source: 'business-points',
    paint: { 'circle-radius': 8, 'circle-color': '#168a97' },
  },
})
```

同 ID 的 addSource/addLayer 幂等，不会覆盖已有资源配置。相同地图、相同 slot 内由 zIndex 升序决定已注册图层的相对顺序，同值保持稳定顺序。不把它当作跨 Mapbox slot 的强制层序工具。

## 按 ID 增改和删除

```ts
register.setGeoJSONData('business-points', {
  type: 'Feature',
  id: 'point-1',
  properties: { id: 'point-1', name: '港区' },
  geometry: { type: 'Point', coordinates: [122.25, 29.95] },
})

register.setGeoJSONData('business-points', {
  type: 'Feature',
  id: 'point-1',
  properties: { id: 'point-1' },
  geometry: null,
})
```

`setGeoJSONData(sourceId, featureOrArray)` 接收一个 Feature 或 Feature 数组，不接收 FeatureCollection。输入数组是增量补丁：本次没有传入的要素会保留；空数组不会清空数据。

- 顶层 `feature.id` 是增删改的键，必须是有效 string 或 number。
- GeoJSON source 没有指定 promoteId 时自动使用 `promoteId: 'id'`，因此通常同时填写 `properties.id`，并与顶层 ID 一致。
- 自定义 promoteId 不会被改写，调用方应保证对应属性与交互 ID 约定一致。
- 数字与字符串形式的同一 ID 统一匹配，例如 123 和 '123'。
- 更新是整条 Feature 替换，不是 properties 的深合并。
- 初始已有的无 ID 要素可保留，但不能通过 ID 更新；新增补丁没有有效 ID 会被忽略。

## 提交与底图切换

一帧内的多次更新批量合并。符合条件的 dynamic GeoJSON 源调用 Mapbox updateData；普通源或不适合差量的源使用完整 setData。聚合、过滤、自动 ID、lineMetrics 等配置可能导致回退。调用方使用方式不变，不必直接调用 updateData。

完整快照单独保留，不能把“最后一次 updateData 参数”当作全部业务数据。配合 `cmap.change()` 切换底图时，可恢复完整快照及待提交补丁；不要为了恢复再用旧接口数据覆盖最新快照。

URL 型 GeoJSON data 不能同步读取完整数据，因此不会把局部补丁盲目覆盖到该 URL 上；更新暂存，直到提供完整的内联 GeoJSON。需要实时更新时推荐从空的内联 FeatureCollection 开始。

## 其他公开方法

| 方法                         | 作用                                               |
| ---------------------------- | -------------------------------------------------- |
| findFeature(source, id)      | 读取缓存及待提交更新中的 Feature；ID 参数为 string |
| getSource(id)                | 获取 Mapbox Source                                 |
| setState(source, id, states) | 写入 feature-state                                 |
| getState(source, id)         | 读取 feature-state                                 |
| removeLayer(id)              | 移除图层                                           |
| removeSource(id)             | 移除数据源，并先清理本注册器创建的关联图层         |
| destroy()                    | 释放注册器和队列，默认保留地图资源                 |
| destroy(true)                | 额外移除本注册器拥有的图层和数据源                 |

`destroy()` 会释放待处理队列，不用于“刷新后立即销毁但保留最后一批数据”。数据源仍被其他外部图层引用时，不应强行移除；先协调资源依赖和归属。不要通过销毁共享 Context 的 register 来清理单个业务实例。
