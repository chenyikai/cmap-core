# 常见问题与当前约束

本页帮助区分配置问题与当前实现边界。排查时先用对应独立 Demo 复现，再替换为业务数据，避免同时引入底图、接口和交互变量。

## 地图空白或尺寸错误

确认地图容器存在且宽高非零、样式已引入、浏览器能创建 WebGL 上下文。弹窗或标签页显示后调用 map.resize。示意底图本身是纯色背景，并不是瓦片加载失败。

如果使用天地图，检查 Token、网络和域名配置。截图与真实底图均不应依赖源码内置 Token 的长期有效性。自定义 style 可以配 localFontFamily，避免学习示例依赖远程 glyphs。

## 船舶不显示或刷新后数量减少

检查 plugins 包含 AisShip，data.type 使用 AisShip.NAME，position 是 LngLat。`load()` 是全量同步：缺失于新列表的船会删除；局部推送请逐条 add。没有有效尺寸时放大仍显示图标。船名默认不创建，需要 tooltip:true。

船舶速度线与 Tooltip 连接线是两套独立概念。真实船体现在只绘制轮廓，转向小弯由 headingLine 负责，默认长度为船宽一半。详细阈值见 [船舶](ship.md)。

## 轨迹只有一条或节点相互覆盖

TrackItem.id 是轨迹 ID，pId 才是点 ID。同次 load 混入其他轨迹会被过滤。确保每组至少两个点、pId 全局唯一、time 已转 Date、position 已转 LngLat，然后调用 render。

缩短轨迹或替换节点 ID 时，当前旧 Feature 可能残留，推荐 remove 后全量分组重建。load 空数组不会清空。Track 没有内置播放 API；STOP_GO 的内部判定目前不适合业务启停告警。

## 标绘创建了却看不到

现有坐标实例需调用 render；空实例需 start 后按绘图操作完成。visibility 必须为 visible。Line 和 Fill 的坐标数组元素应为 LngLat；IconPoint.icon 是已注册的图标名，不是 URL。Point 是屏幕符号，Circle 才是指定地理半径的区域。

`update()` 通常接收完整配置，不要仅传 `{ name: '新名称' }`。使用 `{ ...instance.options, name: '新名称' }` 并保留 id。移除实例后重新 new，不复用已 removed 对象。

## 标签没有显示或连接线消失

Tooltip 只接受 text 与 element 之一。检查 options.visible、位置是否在视野内、是否启用了 collision。collision 开启时无法放置的标签暂时隐藏，并不代表实例丢失。默认 offset 为 0，需要离开目标点显示时显式设置 offsetX/offsetY。

Canvas 文本不是 DOM，无法直接绑定按钮或选择文字；需要交互时传原始 HTMLElement。变更 CSS 主题后调用 Tooltip.refreshStyles(map)。

## 切换底图后资源缺失

使用 cmap.change 而不是直接 map.setStyle。不要复用内置 base、label 等资源 ID。source/layer 和 GeoJSON 快照会恢复，但自定义 image 和 feature-state 需要业务单独核对或重建。change 返回 void，不等于地图资源已同步恢复完毕。

## 性能与资源释放

复用 Ship 管理器和稳定 ID，增量数据用 add；不要每次推送都销毁再创建全部对象。文本标签使用 Canvas 模式，只有少量需要交互的标签使用 DOM。ResourceRegister 会按帧合并提交，但调用方仍应避免无意义的大批量重复数据转换。

页面卸载时先移除图形、标签、轨迹和自建事件，再移除地图。Track 单独清理用 remove 加 destroy。ResourceRegister.destroy 默认不删除图层，删除其自有资源用 destroy(true)。不要销毁共享 Context 来清理一个模块。

## 其他当前边界

| 能力              | 当前边界                                              |
| ----------------- | ----------------------------------------------------- |
| AIS 正北艏向      | hdg=0 不进入优先分支，可能回退到非零 cog              |
| 自定义 Style 恢复 | cmap.change 面向内置天地图，不接收任意 style          |
| beforeRemove 取消 | 并非所有 Module 子类都具有取消后的恢复能力            |
| Focus 缩放        | zoomend 重提交已有边框，不完整重算像素几何            |
| Cache 预热        | 异步执行，无公开 ready Promise，刚初始化 get 可能为空 |
| Cache type        | 两个 type 当前都使用 IndexedDB，不保证会话缓存语义    |
| 图标加载结果      | fulfilled 也可能 code=FAIL，仍需检查结果              |
| 服务端渲染        | 地图实例仅在浏览器客户端创建                          |

本次接入文档与 Demo 不改变这些 SDK 行为；业务需要相应能力时应在独立修复或功能改造中处理。
