# Demo 运行与部署

Demo 分成可独立打开的模块示例和一个综合业务场景。每个入口使用自己的地图和资源，不要求先打开综合页；共享代码只负责地图外壳、样例数据、操作按钮和日志。

## 开发运行

```bash
pnpm install
pnpm dev:demo --port 5174
```

打开 [文档与 Demo 首页](../examples/index.html)。如果端口被占用，以 Vite 终端输出为准；需要固定端口可额外使用 `--strictPort`。示例使用 ESM 和 TypeScript，不能通过 file 协议双击 HTML 运行。

默认是无瓦片的示意底图，不联网加载真实地图。若要体验天地图，将下面配置放在本地 `.env.local` 中，重启开发服务后地图、资源和综合 Demo 会出现切换按钮：

```dotenv
VITE_TDT_TOKEN=你自己的天地图Token
```

VITE 前缀环境变量会进入浏览器构建产物，只能放可用于客户端的配置，不要放服务端密钥。底图加载失败时先检查域名授权、网络和 Token。切换自定义图标的注意事项见 [地图](map.md)。

## 全部独立入口

| 模块             | 地址                                              | 主要操作                                 |
| ---------------- | ------------------------------------------------- | ---------------------------------------- |
| 综合演示         | [overview](../examples/overview/index.html)       | 全景、船体特写、单船更新、锚地编辑       |
| CMap             | [map](../examples/map/index.html)                 | 缩放、旋转、相机读取、配置后的底图切换   |
| Ship             | [ship](../examples/ship/index.html)               | 真实船体、图标模式、单船更新、聚焦、清空 |
| Track            | [track](../examples/track/index.html)             | 多组轨迹、悬停、GeoJSON 输出、清空       |
| Tooltip          | [tooltip](../examples/tooltip/index.html)         | 文本更新、DOM 按钮、500 标签避让         |
| Point            | [point](../examples/point/index.html)             | 创建、编辑、移动、显隐、导出             |
| IndexPoint       | [index-point](../examples/index-point/index.html) | 序号点、拖拽编辑、重新创建               |
| IconPoint        | [icon-point](../examples/icon-point/index.html)   | SVG 图标、锚点、交互编辑                 |
| Line             | [line](../examples/line/index.html)               | 顶点和中点编辑、交互绘线                 |
| ArrowLine        | [arrow-line](../examples/arrow-line/index.html)   | 起终点和方向箭头                         |
| IndexLine        | [index-line](../examples/index-line/index.html)   | 节点序号与编辑                           |
| Fill             | [fill](../examples/fill/index.html)               | 区域边界编辑、重新绘制                   |
| Circle           | [circle](../examples/circle/index.html)           | 圆心和半径控制点、两点绘圆               |
| ResourceRegister | [resources](../examples/resources/index.html)     | 差量更新、删除、高亮、缓存查询           |
| IconManager      | [icons](../examples/icons/index.html)             | 加载结果、图标尺寸、旋转                 |
| Focus            | [focus](../examples/focus/index.html)             | 点和面的聚焦框、单个移除、清空           |
| Collision        | [collision](../examples/collision/index.html)     | 候选方向、冲突隐藏、结果可视化           |
| Cache            | [cache](../examples/cache/index.html)             | 异步写入、同步读取、定向删除             |
| EventManager     | [events](../examples/events/index.html)           | 按 Feature 监听、开启、关闭              |
| Module           | [module](../examples/module/index.html)           | 自定义业务资源封装                       |
| Context          | [context](../examples/context/index.html)         | 共享服务身份和模块间事件                 |
| EventState       | [event-state](../examples/event-state/index.html) | 点击交互启停与坐标输出                   |

原有 [调试台](../index.html) 保留，用于中国沿海大批量 Mock、旧调试操作等。新综合 Demo 使用更少的数据，突出接入流程，不代替压力测试。

## 自定义瓦片调试

开发者中心左侧的“自定义瓦片调试”入口对应 `tests/manual/custom-style-tiles.html`。输入含 `{z}`、`{x}`、`{y}` 的 HTTP/HTTPS 地址，设置 XYZ/TMS、瓦片尺寸、级别和中心位置后，点击“加载图层”。行列顺序直接写在地址中，支持查询参数形式的模板。

也可以直接输入一张具体瓦片地址：支持末尾 `/z/x/y.png`（或 JPG、WebP 等），以及 `z/x/y`、`TileMatrix/TileCol/TileRow` 查询参数的数字编号。点击“加载图层”会生成模板、定位瓦片中心、填入地图缩放并自动检测响应，无需填写经纬度。其他查询参数保持原样。`/z/y/x` 路径需先选择对应顺序，TMS 需先选择编号规则；自动定位采用标准 Web Mercator 网格，不会推断其他投影或自定义 WMTS 矩阵。带前缀、前导零的编号需手动配置。

单张瓦片不能确定整个服务的可用级别，自动解析先把最小/最大瓦片级别都设为该瓦片级别。确认服务支持更多级别后可以调整。已有模板仍沿用手动填写的位置和级别，旧分享链接继续可用。

“检测中心瓦片”使用已加载的配置和当前视野，显示响应状态、图片尺寸和透明像素抽样结果；修改输入后需先重新加载。“复制接入配置”导出当前 `new CMap(...)` 参数，“复制调试链接”保存图层与视野到链接片段，接收者打开即可复现。分享链接包含瓦片地址及其查询参数。

此工具默认显示本地生成的对照图，不预填或访问任何真实瓦片服务。“重置配置”会清空输入地址和当前链接中的配置片段。仅输入模板时需自行设置正确的覆盖位置与级别，服务端需允许浏览器跨域访问。XYZ/TMS 选项只改变编号方式，不负责转换原始瓦片投影。

该入口已包含在 `build:demo` 的产物中，部署整个 `dist-demo` 即可对外提供访问；本地 `127.0.0.1` 调试链接只能在本机使用。

## 文件组织

```text
docs/                     中文接入文档
examples/index.html       文档与示例首页
examples/ship/index.html  单模块 HTML 入口
examples/scenes/ship.ts   该模块的业务示例代码
examples/shared/          外壳、地图、样例数据、文档渲染
examples/tsconfig.json    全部示例的独立类型检查
debug/                    原调试台
```

每个场景使用公共 `cmap-core` 导入。复制时同时参考 shared 中使用到的初始化、LngLat 样例及清理逻辑；不要把 DemoContext 当作 SDK 自带 API。

## 构建与预览

```bash
pnpm run type-check:examples
pnpm run test:examples
pnpm run build:demo
pnpm exec vite preview --config vite.demo.config.ts --port 4174
```

构建输出到 dist-demo，包含原调试台、文档首页和所有模块入口，不只构建根 index.html。预览时可以直接访问 `/examples/ship/index.html`，不依赖 SPA history 回退。

子目录部署使用一致的构建前缀：

```bash
DEMO_BASE_PATH=/cmap-core/ pnpm run build:demo
```

部署整个 dist-demo 目录，访问 `/cmap-core/examples/index.html`。示例导航、源码加载和文档资源都跟随 BASE_URL。GitHub Pages 工作流根据实际仓库名称生成前缀，避免仓库重命名后资源路径失效；这里的构建命令只生成本地产物，不执行发布。

## 验证建议

先运行 `pnpm run check`，再在浏览器检查各入口的“运行正常”状态及事件输出。重点操作图形编辑与重绘、船舶缩放阈值、Tooltip 批量显隐、资源删除，以及页面刷新后 Cache 读取。真实底图与远程接口需要额外使用业务凭据验证，默认演示不会自动访问这些服务。
