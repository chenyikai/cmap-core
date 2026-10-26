# cmap-core

## Unreleased

### 发布流程

- Release 工作流检出完整 Git 历史和已有 Tag，避免提前推送版本 Tag 后，npm 发布成功但同名 Tag 推送被拒绝；补充回归检查、故障恢复说明及重命名后的 npm Trusted Publisher 仓库配置。

## 0.3.0

版本日期：2026-10-26。合并 dev 分支的 SDK 功能、稳定性修复及接入文档。

### Minor Changes

- Tooltip 新增共享 Canvas 文本渲染，构造后自动显示，支持局部更新、九种锚点、自动避让和有预算限制的文本缓存；保留原始 HTMLElement 的 DOM 标签方式及现有主题外观，船舶和轨迹刷新时复用标签。
- 新增 Circle 圆形标绘，支持交互创建、圆心与半径控制点编辑、整体拖动、聚焦和资源清理；隔离 Circle 与 Fill 的多边形图层，公开圆形相关类型、交互事件类和图层常量。
- 重写 SDK 接入与使用文档，提供 12 个章节和 22 个独立演示入口（含综合演示），覆盖地图、船舶、轨迹、八类标绘、Tooltip、基础工具和扩展能力。演示支持源码查看、无密钥示意底图及子目录部署，保留原调试台。
- 新增覆盖中国沿海的可复现船舶 Mock 数据，涵盖不同船型、尺寸、速度、航向、转向和数据时效。

### Patch Changes

- ResourceRegister 按稳定 ID 管理 GeoJSON，按帧合并增删改并对支持的动态数据源使用 updateData；不支持增量时回退到完整快照，完善删除、销毁和异常恢复。
- 底图切换保留已提交的业务数据及仍在队列中的增量，支持连续切换期间恢复；将资源恢复移出 Mapbox 样式更新调用栈，修复 continuePlacement 阶段读取未初始化布局的错误。
- 修复 Tooltip 连接线端点、圆角边界与目标连接处的间隙，减少标签和连接线交叉，自动避让时保护目标图标。
- 船舶使用统一 ID 索引，新船即时显示、重复 ID 复用实例；移除或取消选择后清理延迟回调与交互状态，跳过未变化的数据刷新和重复几何计算。
- 真实船体按地理坐标生成，不随相机旋转或倾斜改变形状；real() 仅生成纯船体轮廓，速度和转向统一交给 headingLine()，去除重复短线。真实船型的小弯默认长度为船宽一半，保留已有长线的长度、方向和转向逻辑。
- 修复标绘拖拽隔离、事件清理、节点增删同步、多边形闭合与标题更新；同步箭头方向和序号，复用未变化的中点，正确恢复双击缩放状态。
- 修复 Point 系列的坐标输入、显隐与聚焦同步、创建事件时序、文字偏移和低层级图标尺寸；修正文字偏移表达式以通过 Mapbox 样式校验，保留显式偏移优先级。
- 统一同一地图上的图标缓存，支持外部图标尺寸和名称碰撞配置；减少实例监听，并在事件订阅清空后释放 EventManager 的底层监听。
- 扩展 SDK、公共类型、文档链接和 Demo 回归检查，pnpm run check 覆盖 124 项自动化测试、类型检查及 SDK / Demo 构建。
- GitHub Pages 部署前缀改为根据实际仓库名称生成，同步发布文档中的演示站地址，避免仓库重命名后静态资源 404。

### 接入注意事项

- 继续使用现有船舶、标绘和 Tooltip 接入方式；文本标签可直接 new Tooltip(map, { position, text })，text 与 element 二选一。需要点击的 DOM 内容应设置 pointer-events: auto。
- 顶点 ID 在其他节点增删后保持稳定。请用 getPoint(index) 获取节点，不再依赖按序号拼接内部 ID。
- 底图切换的数据快照不等于完整恢复所有外部资源，自定义 image 和 feature-state 仍需核对；其他已知边界见 [排错指南](docs/faq.md)。
- 本版本不包含此前讨论的离线地图功能，也未修改在线地图缩放级别的默认策略。

## 0.2.1

### Patch Changes

- Export all public type declarations, enums, extension base classes, and event classes from the package root.

## 0.2.0

### Minor Changes

- a4dcd1e: 测试版本

## 0.1.0

### Minor Changes

- 706f418: 添加轨迹模块 重构船舶 Tooltip

## 0.1.0

### Minor Changes

- 6080f57: 测试

## 0.5.0

### Minor Changes

- 714fd68: 1
- 2f3ce92: 1
- ad5e01b: 添加类别导出

## 0.4.0

### Minor Changes

- a2aed1a: 去除private

## 0.3.0

### Minor Changes

- 1bc390d: 修改路径应用

## 0.2.0

### Minor Changes

- 757bd16: 更改包名

## 0.1.0

### Minor Changes

- cca3773: 重构船舶模块类型定义和事件处理
- 19855a9: 添加自动发布
