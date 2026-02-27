// 1. 【关键】重命名 Mapbox 的 Map，将 "Map" 关键字留给原生 JS
import type { Map as MapboxMap, MapEventType, MapMouseEvent } from 'mapbox-gl'

import type { EventHandler } from '@/types/EventManager'

// 内部存储结构：FeatureId -> EventType -> Callback[]
type ListenerRegistry = Map<string | number, Map<string, EventHandler[]>>

export class EventManager {
  private map: MapboxMap

  // 业务回调注册表
  private listeners: ListenerRegistry = new Map()

  // 记录底层已注册的监听器，防止重复绑定: "layerId:eventType" -> Handler
  private activeLayerListeners = new Map<string, (e: any) => void>()

  // 记录当前鼠标悬停的 Feature ID (用于正确触发 mouseleave)
  private currentHoverId: string | number | null = null

  constructor(map: MapboxMap) {
    this.map = map
  }

  /**
   * 注册事件监听
   * @param id 实例/Feature 的 ID
   * @param layerId Mapbox 图层 ID
   * @param eventType 事件类型 (click, mouseenter, contextmenu 等)
   * @param callback 回调函数
   */
  public on(
    id: string | number,
    layerId: string,
    eventType: MapEventType,
    callback: EventHandler,
  ): void {
    // 1. 初始化存储结构
    if (!this.listeners.has(id)) {
      this.listeners.set(id, new Map())
    }
    const instanceEvents = this.listeners.get(id)

    if (!instanceEvents) {
      console.error('未找到listener')
      return
    }

    if (!instanceEvents.has(eventType)) {
      instanceEvents.set(eventType, [])
    }

    // 2. 存入回调
    const callbacks = instanceEvents.get(eventType)

    if (!callbacks) {
      return
    }

    callbacks.push(callback)

    // 3. 确保底层 Mapbox 监听已激活
    this.ensureMapListener(layerId, eventType)
  }

  /**
   * 移除事件监听
   * @param id 实例 ID
   * @param eventType (可选) 事件类型，不传则移除该 ID 所有事件
   * @param callback (可选) 指定回调，不传则移除该类型所有回调
   */
  public off(id: string | number, eventType?: MapEventType, callback?: EventHandler): void {
    const instanceEvents = this.listeners.get(id)
    if (!instanceEvents) return

    // 情况 A: 移除该 ID 的所有监听
    if (!eventType) {
      this.listeners.delete(id)
      return
    }

    const callbacks = instanceEvents.get(eventType)
    if (!callbacks) return

    // 情况 B: 移除该 ID 下某类型的所有监听
    if (!callback) {
      instanceEvents.delete(eventType)
      return
    }

    // 情况 C: 移除特定回调
    const idx = callbacks.indexOf(callback)
    if (idx !== -1) {
      callbacks.splice(idx, 1)
    }

    // 清理空 Map (可选)
    if (callbacks.length === 0) instanceEvents.delete(eventType)
    if (instanceEvents.size === 0) this.listeners.delete(id)
  }

  /**
   * 确保 Mapbox 底层对该图层的该事件进行了监听
   * (懒加载模式：只有业务层需要监听时，才去调用 map.on)
   */
  private ensureMapListener(layerId: string, eventType: MapEventType): void {
    const key = `${layerId}:${eventType}`

    if (this.activeLayerListeners.has(key)) return

    // 定义底层通用的分发器
    const handler = (e: MapMouseEvent): void => {
      this.dispatch(e, eventType)
      // this.dispatch(e, eventType, layerId)
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    this.map.on(eventType, layerId, handler)
    this.activeLayerListeners.set(key, handler)

    console.warn(`[EventManager] 激活底层监听: ${key}`)
  }

  /**
   * 核心分发逻辑
   */
  // private dispatch(e: MapMouseEvent, eventType: MapEventType, layerId: string): void {
  private dispatch(e: MapMouseEvent, eventType: MapEventType): void {
    let targetId: string | number | undefined

    if (eventType === 'mouseleave') {
      if (this.currentHoverId !== null) {
        targetId = this.currentHoverId
        this.currentHoverId = null // 重置状态
        // this.map.getCanvas().style.cursor = '' // 恢复光标
      }
    } else {
      // 对于 click, mouseenter 等，从事件中获取 ID
      if (e.features && e.features.length > 0) {
        // 优先取最顶层的 feature
        const feature = e.features[0]
        // targetId = feature.id ?? feature.properties?.id
        targetId = feature.id
      }
    }

    if (targetId === undefined) return

    // 特殊处理 mouseenter：记录 ID 并改变光标
    if (eventType === 'mouseenter') {
      this.currentHoverId = targetId
      // this.map.getCanvas().style.cursor = 'pointer'
    }

    // 2. 查找并执行回调
    const instanceEvents = this.listeners.get(String(targetId))

    if (instanceEvents) {
      const callbacks = instanceEvents.get(eventType)
      if (callbacks) {
        callbacks.forEach((fn) => {
          fn(e)
        })
      }
    }
  }

  /**
   * 销毁管理器
   * 必须在地图销毁前调用，防止内存泄漏
   */
  public destroy(): void {
    // 解绑所有底层 Mapbox 事件
    this.activeLayerListeners.forEach((handler, key) => {
      const [layerId, eventType] = key.split(':')
      try {
        this.map.off(eventType, layerId, handler)
      } catch (err) {
        // 忽略地图已销毁导致的错误
      }
    })

    this.activeLayerListeners.clear()
    this.listeners.clear()
    this.currentHoverId = null
  }
}
