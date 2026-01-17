import type { Map } from 'mapbox-gl'

import type { BeforeRemoveEvent } from '@/types/CMap'

import type { Context } from './Context.ts'
import { getOrCreateContext } from './Context.ts'

export abstract class Module {
  protected context: Context

  /**
   * 构造函数，初始化地图上下文和选项配置
   * @param map - 地图实例对象
   */
  protected constructor(map: Map) {
    this.context = getOrCreateContext(map)

    this.onAdd()

    this.context.map.once('beforeRemove', (e: BeforeRemoveEvent) => {
      console.log(e.cancel, 'beforeRemove')
    })
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  public emit() {
    this.context.events.emit('')
  }

  public destroy(): void {
    this.onRemove()
  }

  abstract onAdd(): void

  abstract onRemove(): void
}
