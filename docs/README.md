# CMap SDK 接入与使用文档

CMap 面向需要在 Web 地图上展示船舶、历史轨迹、业务区域和交互标注的开发者。按“创建地图、加载业务数据、订阅事件、释放资源”的顺序接入；如果只需要一个文本标签，创建一个 Tooltip 即可。

本文档对应当前仓库源码。`package.json` 的版本号不代表这些源码修改已发布到 npm；项目接入时需核对实际安装版本。

## 阅读顺序

1. 阅读 [安装与快速接入](getting-started.md)，确认样式、容器尺寸、坐标类型和地图加载时机。
2. 按业务选择 [船舶](ship.md)、[轨迹](track.md)、[标绘](plot.md) 或 [文本标签](tooltip.md)。
3. 需要自定义图层时使用 [ResourceRegister](resources.md)，需要封装业务模块时阅读 [扩展开发](extensions.md)。
4. 在 [独立 Demo 与综合演示](examples.md) 中运行对应示例，再接入真实接口。

## 模块导航

| 模块                           | 用途                         | 文档                  | 独立演示                                 |
| ------------------------------ | ---------------------------- | --------------------- | ---------------------------------------- |
| CMap                           | 地图创建、相机、内置底图切换 | [地图](map.md)        | [运行](../examples/map/index.html)       |
| Ship 和 AisShip                | 船舶实例、AIS 图标及真实船体 | [船舶](ship.md)       | [运行](../examples/ship/index.html)      |
| Track                          | 轨迹分组、节点与时间标签     | [轨迹](track.md)      | [运行](../examples/track/index.html)     |
| Tooltip                        | 共享 Canvas 文本及交互 DOM   | [标签](tooltip.md)    | [运行](../examples/tooltip/index.html)   |
| Point、IndexPoint、IconPoint   | 普通点、编号点、图标点       | [标绘](plot.md)       | [Point](../examples/point/index.html)    |
| Line、ArrowLine、IndexLine     | 普通线、箭头线、编号线       | [标绘](plot.md)       | [Line](../examples/line/index.html)      |
| Fill、Circle                   | 多边形与地理圆形             | [标绘](plot.md)       | [Fill](../examples/fill/index.html)      |
| ResourceRegister               | 数据源、图层及按 ID 更新     | [资源](resources.md)  | [运行](../examples/resources/index.html) |
| IconManager、Focus             | 图标资源及聚焦边框           | [工具](utilities.md)  | [图标](../examples/icons/index.html)     |
| Collision、CollisionItem       | 屏幕矩形避让                 | [工具](utilities.md)  | [运行](../examples/collision/index.html) |
| Cache                          | 内存与 IndexedDB 缓存        | [工具](utilities.md)  | [运行](../examples/cache/index.html)     |
| EventManager、EventState       | 要素事件与交互开关           | [扩展](extensions.md) | [事件](../examples/events/index.html)    |
| Module、Context、Poi、BaseShip | 业务模块和插件扩展基础       | [扩展](extensions.md) | [Module](../examples/module/index.html)  |

## 统一接入约定

- 从 `cmap-core` 导入公共类和类型，不依赖 `src` 内部路径。
- 样式只需引入一次：`import 'cmap-core/style.css'`，已包含 Mapbox 基础样式。
- 常规业务模块在 `await cmap.mapLoaded()` 后创建。Tooltip 可提前创建，但仍需一个有效 Map 实例。
- 同一地图优先共用一个 Ship 和一个 Track 管理器；不同标绘实例必须有不同 ID。
- 大部分标绘需要显式 `render()`；`Ship.add/load()` 与 `new Tooltip()` 自动提交显示，`Track.load()` 后需 `render()`。
- 非 Tooltip 的 `update(options)` 通常接收完整配置；局部修改时用 `{ ...instance.options, changedField }`。
- 地图与 SDK 对象保留为普通实例，不要把 Mapbox 实例转换为深层响应式代理。

## 学习环境和业务环境

仓库示例使用浅色示意底图和本地字体，因此无需网络瓦片和字体服务即可学习 API。示例没有真实海图、实时 AIS、轨迹回放服务或业务后端。生产接入需自行提供数据接口、有效底图访问凭据及所需的网络资源。

框架集成见 [快速接入](getting-started.md)，数据保留与恢复边界见 [地图](map.md)，常见现象见 [排错指南](faq.md)。
