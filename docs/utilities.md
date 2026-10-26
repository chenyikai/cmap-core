# 图标 聚焦 碰撞与缓存

这些工具可以单独使用，也被 Ship、Track 和标绘内部复用。普通业务优先使用具体模块的 API；需要自己的图层或布局规则时再直接使用底层工具。

## IconManager

[独立 Demo](../examples/icons/index.html)。同一地图上的 IconManager 共享图标缓存和并发加载任务。

```ts
import { IconManager } from 'cmap-core'
const icons = new IconManager(map)
const result = await icons.addSvg({
  name: 'port',
  svg: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="14" fill="#168a97"/></svg>',
})
if (result.code !== IconManager.SUCCESS && !icons.has('port')) {
  throw new Error(String(result.msg))
}
```

| 方法                        | 返回与行为                                       |
| --------------------------- | ------------------------------------------------ |
| add({ name, url, options }) | 加载图片 URL，返回 Promise；网络错误可能 reject  |
| addSvg({ name, svg })       | 加载 SVG 字符串，返回含 code 的结果              |
| load(icons)、loadSvg(icons) | 批量返回 `{ success, error }`                    |
| has(name)                   | 当前地图是否已注册图标                           |
| getImage(name)              | 缓存中的 `{ width, height, image }` 或 undefined |
| update({ name, url })       | 用图片 URL 更新已存在的图标                      |
| delete(name)                | 删除图标与缓存；先移除引用它的业务要素           |

`Icon` 包含 name、url 和可选 options；options 可设置 pixelRatio、sdf 等 Mapbox 图片元数据。`SvgIcon` 只有 name 和 svg。重复 add 已存在名字会返回 FAIL，而不一定抛异常。批量方法按 Promise 是否 fulfilled 分组，fulfilled 结果仍可能带 FAIL，调用方仍需检查每项 code 或 has。

远程图片需满足浏览器跨域要求，SVG 应有可确定的尺寸。读取 getImage 不代表图标已在新 style 中注册；切换样式后以 has 为准并补载。不要依赖页面重载后 IndexedDB 中的 image 能直接恢复为可绘制的图片对象。

## Focus

[独立 Demo](../examples/focus/index.html)。为 Point、LineString 或 Polygon 生成角框，不负责地图飞行。

```ts
import { Focus } from 'cmap-core'
const focus = new Focus(map)
const id = focus.set(
  {
    type: 'Feature',
    id: 'target-1',
    properties: {},
    geometry: { type: 'Point', coordinates: [122.25, 29.95] },
  },
  { size: 24, padding: 12, armLength: 16 },
)

focus.get(String(id))
focus.remove(String(id))
focus.removeAll()
```

`set(feature, options)` 添加或更新并自动绘制，无 id 时生成一个。`get(id)` 查询 FocusItem，`features` 返回边框 Feature，`getFocusBorder()` 只计算边框。`onRemove()` 清空，Focus 没有公开 destroy 方法。

size、padding、armLength 为屏幕尺寸计算参数。Point 的角长度当前由 size 比例决定，非点几何使用 armLength。目标几何改变后再次 set；当前 zoomend 只重新提交既有边框，不保证重新计算所有像素尺寸。独立使用时每张地图共用一个 Focus，避免多个实例互相覆盖共享源。

## Collision 和 CollisionItem

[独立 Demo](../examples/collision/index.html)。这是通用的屏幕包围盒分配器，与 Tooltip 内部布局管理器不是同一个对象。它只计算结果，不自动移动 DOM 或图形。

```ts
import { Collision } from 'cmap-core'
const collision = new Collision<'left' | 'right'>()
const items = collision.load([
  { id: 'A', positions: { left: { minX: 0, minY: 0, maxX: 80, maxY: 30 } } },
  {
    id: 'B',
    positions: {
      left: { minX: 20, minY: 0, maxX: 100, maxY: 30 },
      right: { minX: 120, minY: 0, maxX: 200, maxY: 30 },
    },
    priority: ['left', 'right'],
  },
])
for (const item of items) console.log(item.id, item.visible, item.dir, item.getBBox())
```

按输入顺序处理对象；每个对象按 priority 尝试候选 BBox。第一个不冲突的候选被选中，所有候选都冲突则 visible 为 false。BBox 使用屏幕像素，需要在地图移动或缩放后自行重新计算。

| API                                       | 作用                                   |
| ----------------------------------------- | -------------------------------------- |
| load(options)                             | 替换全部项并立即计算，返回所有项       |
| add(option)、remove(id)                   | 增删项；之后调用 collides 重新计算     |
| collides()                                | 重建空间索引，返回所有项，不只是冲突项 |
| getItem(id)、getAll()                     | 查询单项或全部项                       |
| clear()                                   | 清空数据与索引                         |
| CollisionItem.getBBox、setDir、setVisible | 查询或修改某项结果                     |
| isIntersect(box)、isContainedBy(box)      | 相交或被包含测试                       |

构造参数为可选 map 和可选配置：`new Collision(map, { collisions })`。候选方向应至少提供一个有效矩形；这里的 ID 使用严格相等，不自动合并数字与字符串 ID。

## Cache

[独立 Demo](../examples/cache/index.html)。Cache 提供内存同步读与 IndexedDB 异步持久化，不依赖 Map。

```ts
import { Cache } from 'cmap-core'
const cache = new Cache({ uniqueKey: 'my-app-settings', type: 'localstorage' })
await cache.set({ name: 'port', content: { id: 'p1', name: '舟山港区' } })
const value = cache.get('port')
await cache.remove('port')
```

| 方法                   | 行为                                           |
| ---------------------- | ---------------------------------------------- |
| get(name)              | 同步返回内存对象或 undefined                   |
| set({ name, content }) | 立即更新内存，异步写入 IndexedDB，返回 Promise |
| remove(name)           | 立即删除内存，异步删除 IndexedDB，返回 Promise |
| removeAll()            | 同步返回移除条目列表，后台异步清理此命名空间   |

`type` 接受 sessionstorage 或 localstorage，但当前实现两者都使用 IndexedDB，不能据此推断会话结束自动清空。数据库名由 uniqueKey 区分，键名为 uniqueKey 与 name 的拼接。

初始化会异步预热内存，没有公开 ready Promise；刚创建就 get 可能未命中。不要用它作为必须同步命中的持久化数据库。完整对象可留在内存，持久化经过 JSON 序列化；Date、函数、DOM 和图片等对象不会完整保留类型。业务缓存需要处理 IndexedDB 被禁用或写入失败的情况，也不应存放敏感凭据。
