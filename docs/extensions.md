# 事件与自定义模块扩展

公开的基础类便于把业务图层封装成可挂载、可清理的模块。普通业务不需要手动创建 Context，也不需要直接使用所有内置交互控制器。

## EventManager

[独立 Demo](../examples/events/index.html)。一个底层图层监听可以分发给多个 Feature ID。

```ts
import { EventManager } from 'cmap-core'
const events = new EventManager(map)
const onClick = (event: unknown) => console.log(event)
events.on('feature-1', 'business-layer', 'click', onClick)
events.off('feature-1', 'click', onClick)
events.destroy()
```

`on(id, layerId, eventType, callback)` 按图层和 ID 注册。`off(id, eventType?, callback?)` 没有 layerId 参数，会遍历该管理器所有图层删除匹配项；独立业务应使用明确的命名空间。回调参数是原始 Mapbox 地图事件，不是 Poi 的 EventMessage。

分发优先使用 `feature.properties.id`，再使用顶层 `feature.id`。设置 promoteId 时须保证 ID 一致。使用完必须 destroy；不要在持续 render 的路径中重复 new 管理器。

## EventState

[独立 Demo](../examples/event-state/index.html)。EventState 是抽象类，提供 `status`、`switch()`、`changeStatus()` 和 EventMessage 构造能力。

```ts
import { EventState } from 'cmap-core'
import type { Map, MapMouseEvent } from 'mapbox-gl'

class ClickState extends EventState {
  private readonly handle = (event: MapMouseEvent) => this.emit('position', event.lngLat)
  constructor(map: Map) {
    super(map)
  }
  override onAdd(): void {}
  override onRemove(): void {
    this.disabled()
    this.removeAllListeners()
  }
  override enabled(): void {
    if (this.status === EventState.ON) return
    this.context.map.on('click', this.handle)
    this.status = EventState.ON
  }
  override disabled(): void {
    this.context.map.off('click', this.handle)
    this.status = EventState.OFF
  }
}
const interaction = new ClickState(map)
interaction.on('position', (position) => console.log(position))
interaction.switch()
// 业务卸载：interaction.destroy()
```

`switch()` 调用 enabled/disabled，真正启用或解绑。`changeStatus()` 只改状态枚举，不操作监听，通常不要单独用它启停交互。EventStatus 的运行时值为 On、Off。

## Module 与 Context

[Module Demo](../examples/module/index.html) · [Context Demo](../examples/context/index.html)。Module 继承事件发射器，通过受保护的 context 获取共享服务。

```ts
import { Module } from 'cmap-core'
import type { Map } from 'mapbox-gl'

class BusinessModule extends Module {
  constructor(map: Map) {
    super(map)
  }
  override onAdd(): void {
    this.context.register.addSource('business-module', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })
  }
  override onRemove(): void {
    this.context.register.removeSource('business-module')
  }
}
const module = new BusinessModule(map)
// module.destroy()
```

基类构造函数会立即调用 onAdd，此时子类字段和子类 constructor 后半段尚未执行。onAdd 只使用已经可用的 context 或静态常量；需要子类配置的初始化放在 super 返回后。mount 会再次调用 onAdd，必须考虑幂等性。

| Context 成员 | 含义                                    |
| ------------ | --------------------------------------- |
| map          | 原生地图                                |
| events       | 共享 EventEmitter 事件总线              |
| register     | ResourceRegister                        |
| iconManage   | IconManager，注意属性名不是 iconManager |
| focus        | Focus                                   |
| eventManager | EventManager                            |

Module 内部按地图复用 Context。公开的 `new Context({ map })` 会创建另一组服务，不会自动加入内部单例注册；不要在每个业务组件手动 new Context。Context.destroy 当前只移除共享事件总线监听，不是所有地图资源的一键销毁方法。

自定义模块用命名空间隔离资源和事件，例如 `business:selection`，卸载时只清理自己注册的监听，不调用共享总线的 removeAllListeners。

## 船舶与标绘插件

简单船舶扩展优先继承 AisShip：

```ts
import { AisShip, Ship } from 'cmap-core'
class BusinessShip extends AisShip {
  static override NAME = 'BusinessShip'
  override get direction(): number {
    return this.options.direction
  }
}
const fleet = new Ship(map, { plugins: [BusinessShip] })
// fleet.add({ ...aisData, type: BusinessShip.NAME })
```

BaseShip、Poi 是抽象类，不能 new；从零实现时必须覆盖所有抽象能力，包括生命周期、几何、编辑或选择、更新和清理。普通样式调整应通过现有 options，不必新增插件。

SDK 还导出 PointBaseEvent、PointCreateEvent、PointResidentEvent、PointUpdateEvent，以及对应的 Line、Fill、Circle 系列交互控制器。BaseEvent 抽象类用于继承；具体控制器通常已经由标绘实例创建，重复 new 会增加重复监听。优先调用实例的 start、stop、edit、unedit。船舶 ResidentEvent 同理由 Ship 管理。

## 公开导出索引

| 分组       | 运行时导出                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------ |
| 地图       | CMap、MapType                                                                                    |
| 船舶       | Ship、AisShip、BaseShip、ResidentEvent、ShipVars、ShipEventEnum                                  |
| 轨迹       | Track、TrackVars、TooltipType                                                                    |
| 标绘       | Poi、Point、IndexPoint、IconPoint、Line、ArrowLine、IndexLine、Fill、Circle、PlotType、PointType |
| 标绘常量   | PointVars、IndexPointVars、IconPointVars、LineVars、FillVars、CircleVars                         |
| 标绘控制器 | Point、Line、Fill、Circle 各自的 BaseEvent、CreateEvent、ResidentEvent、UpdateEvent              |
| 标签       | Tooltip                                                                                          |
| 资源和工具 | ResourceRegister、IconManager、RESULT_CODE、Focus、Collision、CollisionItem、Cache               |
| 扩展       | Module、Context、EventManager、EventState、EventStatus                                           |

ShipEventEnum 作为公开枚举保留，但它的 Create、Update、Resident 字符串不是本文所述 ship-click 等地图事件，不应据此猜测运行时事件。标绘常用的 create、update.done 等事件直接用字符串订阅。

主要类型也从包根导出：ICMapOptions、BeforeRemoveEvent、IShipOptions、IBaseShipOptions、IAisShipOptions、BaseShipConstructor、ITrackOptions、TrackItem、TrackItemWithLabel、IPoiOptions、各标绘 IOptions 与 Style、PointInstance、ITooltipOptions、TooltipTextStyle、TooltipUpdateOptions、Anchor、SortLayer、Icon、SvgIcon、IconLoadResult、IFocusOptions、FocusItem、CollisionOptions、CollisionItemOptions、CacheOptions、EventMessage、IContextOptions。

```ts
import { MapType, PlotType, EventStatus } from 'cmap-core'
import type { IAisShipOptions, ITooltipOptions, SortLayer } from 'cmap-core'
```

枚举需要运行时使用时不要 import type。SDK 没有公开 `Plot` 管理器、`getOrCreateContext`、`StyleResources` 或内部快照助手；不要依赖未导出的深层路径。
