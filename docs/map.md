# CMap 地图与生命周期

[独立 Demo](../examples/map/index.html) 演示地图初始化、相机控制以及配置 Token 后的天地图切换。业务模块操作的是 `cmap.getMap()` 返回的原生 Mapbox Map。

## 创建地图

```ts
import { CMap } from 'cmap-core'
import 'cmap-core/style.css'

const cmap = new CMap({
  container: 'map',
  center: [122.25, 29.95],
  zoom: 12,
  type: CMap.LAND,
  TDTToken: '你的天地图 Token',
  http2: true,
  localFontFamily: 'sans-serif',
})
const map = await cmap.mapLoaded()
```

`ICMapOptions` 继承 Mapbox 的 `MapOptions`。`center`、`zoom`、`minZoom`、`maxZoom`、`bearing`、`pitch`、`projection` 和 `style` 等选项直接交给 Mapbox。

| 扩展选项 | 默认值         | 说明                                            |
| -------- | -------------- | ----------------------------------------------- |
| type     | `CMap.LAND`    | `land` 或 `satellite`                           |
| TDTToken | 源码内置回退值 | 业务项目显式配置自己的 Token，不依赖回退值      |
| http2    | `true`         | 控制 HTTP 或 HTTPS 协议，并非启用 HTTP/2        |
| style    | 无             | 非空自定义 style 优先，初始底图不再由 type 生成 |

`localFontFamily` 可让符号文字使用本机字体，但 Mapbox 仍要求 style 带有 glyphs 模板才能通过文字图层校验。无网络示例使用带 fontstack 和 range 占位符的 data URI，字符由本地字体生成。如果要使用服务端字体，应将 glyphs 改为可访问的字体服务，并确保字体集包含所需字符。内置底图的字体地址不应作为业务项目长期可用的服务承诺。

## 方法与属性

| 成员                     | 说明                                                |
| ------------------------ | --------------------------------------------------- |
| `getMap()`、`map`        | 获取原生地图实例                                    |
| `mapLoaded()`            | 地图就绪时返回 `Promise<Map>`                       |
| `zoomIn()`、`zoomOut()`  | 放大或缩小；正在缩放时跳过                          |
| `change(type)`           | 在内置天地图矢量、影像之间切换，返回 void           |
| `icon`                   | 此地图的 IconManager 实例                           |
| `on('loaded', callback)` | CMap 的加载事件；仅在加载完成时触发，不补发历史事件 |

```ts
cmap.change(CMap.SATELLITE)
map.jumpTo({ center: [122.25, 29.95], zoom: 16, bearing: 0, pitch: 0 })
map.easeTo({ bearing: 45, pitch: 40 })
map.resize()
```

## 底图切换的数据保留

`cmap.change()` 保存自定义 source 和 layer，并在新样式可注册资源后恢复。GeoJSON 的完整快照包含已提交差量和仍在 ResourceRegister 队列中的修改。连续切换会保留尚未完成恢复的快照。

- 不要给业务 source 使用 `base`、`label`；不要给业务 layer 使用 `background`、`base_layer`、`label_layer`、`base-end`、`point-end`。
- `change()` 返回不表示恢复完成；不要紧接着断言 source 已存在。业务更新可继续交给 ResourceRegister 排队。
- 直接调用 `map.setStyle()` 不走 `cmap.change()` 的备份恢复流程。
- 当前恢复范围主要是 source 和 layer，不包含对自定义 image、feature-state 以及其他外部资源的完整恢复承诺。自定义图标须在新样式中检查 `map.hasImage()` 并补载。
- `change()` 只接收内置 MapType，不是任意第三方样式切换接口。

## 事件与卸载

```ts
map.on('moveend', () => console.log(map.getCenter()))
map.on('error', (event) => console.error(event.error))
map.remove()
```

`map.remove()` 前会同步派发 `beforeRemove`，回调可调用 `event.cancel()` 取消移除，`event.next()` 放行。这不是异步确认接口。需要“是否离开”确认时，应先在业务层完成确认，再调用 remove。

Ship 和 Tooltip 能区分实际移除与取消移除；部分其他 Module 子类仍以 `beforeRemove` 作为清理时机。不要依赖“取消 remove 后所有模块都自动恢复”。卸载推荐显式清理业务对象，然后移除地图，不把 beforeRemove 当作通用事务。

```ts
fleet.destroy()
track.remove()
track.destroy()
plot.remove()
label.remove()
events.destroy()
register.destroy(true)
map.remove()
```

这里的变量代表已创建的业务实例；清理自己拥有的对象，不销毁其他模块共享的 Context。
