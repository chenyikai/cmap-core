import EventEmitter from 'eventemitter3'
import type { Map } from 'mapbox-gl'

import IconManager from '@/core/IconManager'
import ResourceRegister from '@/core/ResourceRegister'
import type { IContextOptions } from '@/types/Module/Context.ts'

export class Context {
  public readonly map: Map
  public readonly events: EventEmitter
  public readonly register: ResourceRegister
  public readonly iconManage: IconManager

  // 4. 一个通用的状态存储 (替代原来的 Store._listeners 等)
  // public readonly state: Map<string, any> = new Map();

  public constructor(options: IContextOptions) {
    this.map = options.map
    this.events = new EventEmitter()
    this.register = new ResourceRegister(this.map)
    this.iconManage = new IconManager(this.map)
  }

  // 提供一个销毁方法，统一清理资源
  public destroy(): void {
    this.events.removeAllListeners()
    // this.icons.clear();
    // this.map.remove(); // map 的销毁通常由外部控制，这里视情况而定
    return
  }
}

const registry = new WeakMap<Map, Context>()

/**
 * 获取或创建上下文
 * 这是整个单例逻辑的入口，但它是“每个 Map 一个单例”
 */
export function getOrCreateContext(map: Map): Context {
  const existing = registry.get(map)

  // 2. 如果存在，直接返回
  if (existing) {
    return existing
  }

  const context = new Context({ map })
  registry.set(map, context)

  // 监听移除，防止内存泄漏
  map.once('remove', () => {
    context.destroy()
    registry.delete(map)
  })

  return context
}
