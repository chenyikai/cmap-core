import EventEmitter from 'eventemitter3'
import type { Map } from 'mapbox-gl'

import type { Context } from './Context.ts'
import { getOrCreateContext } from './Context.ts'

export abstract class Module extends EventEmitter {
  private static readonly removedMaps = new WeakSet<Map>()
  private moduleContext?: Context
  private readonly moduleMap: Map

  // Lightweight overlays do not need GeoJSON resources (or a loaded map style).
  protected get context(): Context {
    return (this.moduleContext ??= getOrCreateContext(this.moduleMap))
  }

  protected set context(context: Context) {
    this.moduleContext = context
  }

  private readonly onMapRemove = (): void => {
    if (this.mapLifecycleEvent === 'remove') Module.removedMaps.add(this.moduleMap)
    this.destroy()
  }

  // Ships opt into the committed removal event; other modules retain their lifecycle.
  // A getter is intentional: subclass fields are not initialized during super().
  // eslint-disable-next-line @typescript-eslint/class-literal-property-style
  protected get mapLifecycleEvent(): 'beforeRemove' | 'remove' {
    return 'beforeRemove'
  }

  protected get mapRemoved(): boolean {
    return Module.removedMaps.has(this.moduleMap)
  }

  protected detachLifecycle(): void {
    this.moduleMap.off(this.mapLifecycleEvent, this.onMapRemove)
  }

  /**
   * 构造函数，初始化地图上下文和选项配置
   * @param map - 地图实例对象
   * @param attachMapLifecycle
   */
  protected constructor(map: Map, attachMapLifecycle = true) {
    super()

    this.moduleMap = map

    this.onAdd()

    if (attachMapLifecycle) {
      map.once(this.mapLifecycleEvent, this.onMapRemove)
    }
  }

  public mount(): void {
    this.onAdd()
  }

  public destroy(): void {
    this.detachLifecycle()
    this.onRemove()
  }

  abstract onAdd(): void

  abstract onRemove(): void
}
