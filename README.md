# CMap SDK

基于 Mapbox GL JS 的 TypeScript 地图 SDK，提供地图管理、AIS 船舶、轨迹、可编辑标绘、文本标签和通用地图资源管理。

## 接入与使用

[完整文档](docs/README.md) 从安装开始，覆盖数据格式、公开方法、交互事件、生命周期和使用限制。适用范围是本仓库当前源码；使用 npm 包时，请核对安装版本是否包含对应能力。

```bash
pnpm add cmap-core mapbox-gl
```

```ts
import { CMap, Tooltip } from 'cmap-core'
import 'cmap-core/style.css'

// 页面需要一个有明确高度的 <div id="map"></div>。
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
const label = new Tooltip(map, { position: [122.25, 29.95], text: '你好，CMap', anchor: 'center' })
// 页面卸载时：label.remove(); map.remove();
```

生产底图、框架集成和清理方式见 [安装与快速接入](docs/getting-started.md)。

## 运行文档和 Demo

```bash
pnpm install
pnpm dev:demo --port 5174
```

- 文档与 Demo 首页：[http://localhost:5174/examples/index.html](http://localhost:5174/examples/index.html)
- 综合业务演示：[http://localhost:5174/examples/overview/index.html](http://localhost:5174/examples/overview/index.html)
- 原有调试台：[http://localhost:5174/](http://localhost:5174/)

示例目录提供 22 个独立入口。默认不需要底图 Token，不连接船舶业务接口；地图位置、船舶和轨迹均使用合成样例。每个示例可查看 TypeScript 源码，支持按子目录部署。完整清单与部署步骤见 [Demo 使用指南](docs/examples.md)。

## 文档目录

| 内容                         | 入口                                  |
| ---------------------------- | ------------------------------------- |
| 安装、坐标、初始化、框架接入 | [快速接入](docs/getting-started.md)   |
| 地图与底图切换               | [CMap](docs/map.md)                   |
| 船舶数据与更新               | [Ship 和 AisShip](docs/ship.md)       |
| 分组轨迹与标签               | [Track](docs/track.md)                |
| 点、线、面、圆与交互编辑     | [Plot](docs/plot.md)                  |
| Canvas 与 DOM 标签           | [Tooltip](docs/tooltip.md)            |
| 数据源、图层、差量更新       | [ResourceRegister](docs/resources.md) |
| 图标、聚焦框、碰撞、缓存     | [基础工具](docs/utilities.md)         |
| 自定义模块、事件、公开导出   | [扩展开发](docs/extensions.md)        |
| 排错和当前使用限制           | [常见问题](docs/faq.md)               |

## 开发验证

```bash
pnpm run check                 # 源码与 Demo 类型、测试、SDK 构建、演示站构建
pnpm run type-check:examples   # 单独检查全部示例
pnpm run test:examples         # 文档链接、示例入口与 Markdown 安全回归
pnpm run build:demo            # 输出 dist-demo，可部署静态站
```
