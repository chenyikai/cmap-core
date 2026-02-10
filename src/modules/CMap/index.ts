import EventEmitter from 'eventemitter3'
import { isEmpty } from 'lodash-es'
import { Map } from 'mapbox-gl'

import IconManager from '@/core/IconManager'
import { SHIP_COLOR, SHIP_ICON, UPDATE_STATUS } from '@/modules/Ship/vars.ts'
import type { ICMapOptions } from '@/types/CMap'
import { MapType } from '@/types/CMap'
import type { SvgIcon } from '@/types/IconManager'

import { landStyle, satelliteStyle } from './vars.ts'

export class CMap extends EventEmitter {
  public readonly map: Map
  private readonly options: ICMapOptions
  private cache = new Set<(map: Map) => void>()
  private timer: number | null = null
  private readonly originalRemove: () => void

  readonly icon: IconManager

  static LAND: MapType = MapType.LAND
  static SATELLITE: MapType = MapType.SATELLITE

  constructor(options: ICMapOptions) {
    super()

    this.options = options

    if (isEmpty(this.options.style)) {
      if (options.type === CMap.LAND) {
        this.options.style = landStyle
      } else if (options.type === CMap.SATELLITE) {
        this.options.style = satelliteStyle
      }
    }

    Map.prototype._authenticate = (): void => {
      /* empty */
    }

    this.map = new Map(this.options)
    this.icon = new IconManager(this.map)

    this.originalRemove = this.map.remove.bind(this.map)

    this.map.remove = (): void => {
      let isCancelled = false

      this.map.fire('beforeRemove', {
        cancel: () => {
          isCancelled = true
        },
        next: () => {
          isCancelled = false
        },
      })

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!isCancelled) {
        this.originalRemove()
      }
    }

    this.map.once('load', () => {
      SHIP_ICON.forEach((icon: SvgIcon) => {
        this.icon.loadSvg([
          {
            name: icon.name.replace('$color', UPDATE_STATUS.ONLINE),
            svg: icon.svg.replace('$color', SHIP_COLOR.ONLINE),
          },
          {
            name: icon.name.replace('$color', UPDATE_STATUS.DELAY),
            svg: icon.svg.replace('$color', SHIP_COLOR.DELAY),
          },
          {
            name: icon.name.replace('$color', UPDATE_STATUS.OFFLINE),
            svg: icon.svg.replace('$color', SHIP_COLOR.OFFLINE),
          },
        ])
      })

      this.emit('loaded', this.map)
    })
  }

  change(type: MapType): void {
    if (type === CMap.LAND) {
      this.getMap().setStyle(landStyle)
    } else if (type === CMap.SATELLITE) {
      this.getMap().setStyle(satelliteStyle)
    }
  }

  getMap(): Map {
    return this.map
  }

  zoomIn(): void {
    if (!this.getMap().isZooming()) {
      this.getMap().zoomIn()
    }
  }

  zoomOut(): void {
    if (!this.getMap().isZooming()) {
      this.getMap().zoomOut()
    }
  }

  mapLoaded(): Promise<Map> {
    const load = (resolve: (mao: Map) => void): void => {
      if (!this.getMap()._loaded) {
        if (!this.timer) {
          this.timer = setInterval(() => {
            load(resolve)
          }, 16) as unknown as number
        } else {
          this.cache.add(resolve)
        }
      } else {
        if (this.timer) {
          clearInterval(this.timer)
          this.timer = null
        }
        if (this.cache.size > 0) {
          this.cache.forEach((cb): void => {
            cb(this.getMap())
          })
          this.cache.clear()
        }

        resolve(this.getMap())
      }
    }

    return new Promise((resolve, reject) => {
      try {
        load(resolve)
      } catch (e) {
        if (this.timer) {
          clearInterval(this.timer)
          this.timer = null
        }

        reject(new Error(`mapLoaded错误:${e as string}`))
      }
    })
  }
}
