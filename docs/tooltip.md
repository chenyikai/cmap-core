# Tooltip 文本与交互标签

[独立 Demo](../examples/tooltip/index.html) 包含一个自动显示的文本标签、一个 DOM 按钮和 500 个可避让标签。文本模式共享每张地图的一张 Canvas，不为每个标签创建 Mapbox Marker。

## 一个对象创建一个标签

```ts
import { Tooltip } from 'cmap-core'
const label = new Tooltip(map, {
  position: [122.25, 29.95],
  text: '港口监测点',
  theme: 'ship',
  line: true,
  offsetX: 5,
  offsetY: 30,
  anchor: 'bottom-right',
})
```

构造后自动显示，不需要 addTo 或 render。`text` 与 `element` 必须且只能提供一种。Canvas 适用于批量文本；需要按钮、表单、文本选择等 DOM 能力时使用 element。

## 常用配置

| 参数             | 默认或规则                                                        |
| ---------------- | ----------------------------------------------------------------- |
| position         | 必填，LngLatLike                                                  |
| text / element   | 二选一；文本字符串或原始 HTMLElement                              |
| id               | 可选，自动生成；创建后不可修改                                    |
| visible          | 默认 true                                                         |
| anchor           | 默认 bottom-right；支持上下左右、四角和 center 共九种             |
| offsetX、offsetY | 默认 0，CSS 像素，允许负值                                        |
| line             | 是否显示标签到目标点的连接线                                      |
| theme            | default、ship 或 track                                            |
| className        | DOM 样式类；Canvas 只提取受支持的文本样式，不是完整 HTML/CSS 渲染 |
| style            | TooltipTextStyle，显式覆盖样式                                    |
| collision        | 显式 true 启用自动避让；默认不启用                                |
| targetRadius     | 目标保护半径，仅用于碰撞，不截短连接线                            |
| priority         | 碰撞优先级；高优先级优先尝试放置                                  |
| anchors          | 自动避让时使用的候选方向                                          |
| renderer         | 通常不必设置；canvas 要求 text，dom 要求 element                  |

```ts
label.update({ text: '更新后名称', style: { color: '#087f8c', fontSize: 14 } })
label.setLngLat([122.251, 29.951])
label.hide()
label.show()
label.setAnchor('top-left')
label.remove()
```

`update()` 支持部分配置，style 字段会合并。`setAnchor()` 同时请求显示标签。`options.visible` 表示业务请求的显隐，`visible` 是最近一次布局后实际显隐，两者可能因碰撞不同。

## 样式

TooltipTextStyle 支持 fontFamily、fontSize、fontWeight、lineHeight、color、backgroundColor、paddingX、paddingY、borderRadius、shadowColor、shadowBlur、shadowOffsetX、shadowOffsetY。

```ts
new Tooltip(map, {
  position: [122.25, 29.95],
  text: '自定义文本',
  style: {
    fontSize: 14,
    color: '#fff',
    backgroundColor: '#087f8c',
    paddingX: 10,
    paddingY: 6,
    borderRadius: 6,
  },
})
```

数值尺寸使用 CSS 像素，设备像素比内部处理。主题 CSS 改变后调用 `Tooltip.refreshStyles(map)`；字体加载完成时内部会刷新。文本缓存按地图有预算限制，批量初始化分帧完成，不应在构造之后立即要求所有 bbox 已稳定。

## DOM 模式

```ts
const button = document.createElement('button')
button.textContent = '查看详情'
button.style.pointerEvents = 'auto' // 默认标签容器让地图事件穿透；交互元素需要显式开启
button.onclick = () => console.log('打开业务弹窗')
const label = new Tooltip(map, { position: [122.25, 29.95], element: button })
```

传入的是原始元素，事件监听会保留。SDK 默认标签容器设置了 `pointer-events: none`，需要点击的 DOM 元素应显式设置 `pointer-events: auto`。切换内容模式可以 `label.update({ text: '纯文本' })` 或 `label.update({ element: button })`；不要同时传两种内容。

## 避让与几何读取

```ts
const label = new Tooltip(map, {
  position: [122.25, 29.95],
  text: '避让标签',
  collision: true,
  line: true,
  targetRadius: 10,
  priority: 100,
  offsetY: 30,
  anchors: ['bottom-right', 'bottom-left', 'top-right', 'top-left'],
})
```

自动布局会检查标签、标签连接线和目标保护区域。候选位置都冲突时，标签暂时隐藏；冲突消失后自动恢复。`collision: false` 的固定标签不被自动隐藏，但会作为自动标签的障碍物。这里的连接线不是船舶速度长线。

`bbox/getBbox(anchor)` 获取当前或指定方向的屏幕包围盒；`getAllBbox()` 获取九个方向的候选盒；`connectPoint()` 返回连接端点地理坐标或 null。`render()` 可主动请求下一帧更新；`remove()` 释放实例，最后一个标签移除后释放共享画布与监听。
