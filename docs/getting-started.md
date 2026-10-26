# 安装与快速接入

先建立一个尺寸明确、能正常加载的地图，再初始化业务模块。SDK 在浏览器中使用 DOM、Canvas、WebGL 和 IndexedDB；服务端渲染应用应在客户端挂载阶段创建实例。

## 安装

```bash
pnpm add cmap-core mapbox-gl
# 或 npm install cmap-core mapbox-gl
```

SDK 已声明 Mapbox GL JS 依赖。业务代码直接使用 `LngLat` 等 Mapbox 类型时，将 `mapbox-gl` 作为应用的直接依赖更清晰，并保持与 SDK 使用的主版本一致。当前仓库使用 Mapbox GL JS 3.x、TypeScript 5.9 和 pnpm 10；仓库 CI 使用 Node.js 24。

```ts
import { CMap, Tooltip } from 'cmap-core'
import { LngLat } from 'mapbox-gl'
import 'cmap-core/style.css'
```

不要使用旧的 `cmap-core/dist/cmap-core.css` 路径；包的公开样式入口是 `cmap-core/style.css`。

## 最小 HTML

```html
<div id="map"></div>
<style>
  html,
  body {
    margin: 0;
    height: 100%;
  }
  #map {
    width: 100%;
    height: 100vh;
  }
</style>
```

如果地图放在标签页、弹窗或折叠容器中，容器从隐藏变成可见后调用 `map.resize()`。父元素没有高度时，`height: 100%` 不能保证地图可见。

## 无密钥的最小示例

```ts
import { CMap, Tooltip } from 'cmap-core'
import 'cmap-core/style.css'

const cmap = new CMap({
  container: 'map',
  center: [122.25, 29.95],
  zoom: 13,
  localFontFamily: 'sans-serif',
  style: {
    version: 8,
    glyphs: 'data:application/x-protobuf;base64,#{fontstack}/{range}',
    sources: {},
    layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#dceaf0' } }],
  },
})

const map = await cmap.mapLoaded()
const label = new Tooltip(map, {
  position: [122.25, 29.95],
  text: '港口监测点',
  anchor: 'center',
})

function dispose() {
  label.remove()
  map.remove()
}
```

这是可运行的空白底图，并非真实地图瓦片。glyphs 提供满足符号图层校验的无网络占位模板，`localFontFamily` 让所有字符在本地生成；若移除 localFontFamily，则必须改用真正的字体服务。切换为天地图时参考 [地图配置](map.md)。

## 坐标和单位

| 接口                                         | 坐标类型     | 说明                              |
| -------------------------------------------- | ------------ | --------------------------------- |
| CMap 的 center                               | `LngLatLike` | 可传 `[经度, 纬度]`               |
| Tooltip 的 position                          | `LngLatLike` | 可传数组、LngLat 或经纬度对象     |
| Point、IndexPoint、IconPoint 的 position     | `LngLatLike` | 内部归一化为 LngLat               |
| Ship、Track 的 position                      | `LngLat`     | 使用 `new LngLat(lng, lat)`       |
| Line、ArrowLine、IndexLine、Fill 的 position | `LngLat[]`   | 不要直接传二维数字数组            |
| Circle 的 center                             | `LngLat`     | 半径默认以米计                    |
| GeoJSON geometry.coordinates                 | 数字数组     | 遵循 GeoJSON 的经度在前、纬度在后 |

```ts
const position = new LngLat(122.25, 29.95)
const positions = [
  [122.25, 29.95],
  [122.26, 29.96],
].map(([lng, lat]) => new LngLat(lng, lat))
```

SDK 不自动完成不同坐标系之间的转换。业务数据与底图必须使用相匹配的经纬度坐标；不要把投影米坐标、纬经顺序或未经转换的其他坐标系直接作为经纬度输入。

## 页面和框架生命周期

Vue、React 或其他框架均采用相同流程：挂载 DOM 后创建 CMap，加载完成后创建业务实例，卸载时先清理业务对象，再移除地图。地图正在加载期间组件也可能卸载，因此异步返回后需要检查取消状态。

```ts
// 在组件的 mounted / effect 中调用，不要在服务端模块顶层执行。
function mountMap(container: HTMLElement) {
  const cmap = new CMap({
    container,
    center: [122.25, 29.95],
    zoom: 10,
    TDTToken: '替换为你自己的天地图 Token',
  })
  let disposed = false
  let label: Tooltip | undefined
  const map = cmap.getMap()
  const onLoad = () => {
    if (disposed) return
    label = new Tooltip(map, { position: map.getCenter(), text: '地图就绪' })
  }
  map.once('load', onLoad)
  return () => {
    disposed = true
    map.off('load', onLoad)
    label?.remove()
    map.remove()
  }
}
```

把返回的清理函数交给框架的卸载回调。React 开发环境可能重复挂载 effect，不要跨挂载保留已移除的地图；Vue 可使用普通局部变量、`shallowRef` 或 `markRaw` 保存对象。

## 项目内运行

```bash
pnpm install
pnpm dev:demo --port 5174
```

打开 [示例首页](../examples/index.html)，或直接打开 [CMap 独立示例](../examples/map/index.html)。仓库内示例用 Vite 别名将 `cmap-core` 指向当前源码；复制到业务项目时则由安装的包提供实现。
