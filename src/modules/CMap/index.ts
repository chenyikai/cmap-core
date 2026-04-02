import EventEmitter from 'eventemitter3'
import { isEmpty } from 'lodash-es'
import type { GeoJSONSource, SourceSpecification } from 'mapbox-gl'
import { Map } from 'mapbox-gl'

import IconManager from '@/core/IconManager'
import { SHIP_COLOR, SHIP_ICON, UPDATE_STATUS } from '@/modules/Ship/vars.ts'
import type { ICMapOptions } from '@/types/CMap'
import { MapType } from '@/types/CMap'
import type { SvgIcon } from '@/types/IconManager'

import { createStyle } from './vars.ts'

// createStyle 生成的底图内置 source/layer，切换时不需要保留
const BASE_SOURCE_IDS = new Set(['base', 'label'])
const BASE_LAYER_IDS = new Set(['background', 'base_layer', 'label_layer', 'base-end', 'point-end'])

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
      this.options.style = createStyle(options.type, options.http2, options.TDTToken)
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
    const map = this.getMap()
    const currentStyle = map.getStyle()

    // 备份自定义 sources（GeoJSON 取运行时 data）
    const customSources: { id: string; spec: SourceSpecification }[] = Object.entries(
      currentStyle.sources,
    )
      .filter(([id]) => !BASE_SOURCE_IDS.has(id))
      .map(([id, source]) => {
        if (source.type === 'geojson') {
          const runtime: GeoJSONSource = map.getSource(id)!
          return { id, spec: { ...source, data: runtime._data } as SourceSpecification }
        }
        return { id, spec: source as SourceSpecification }
      })

    // 备份自定义 layers（保持原始顺序）
    const customLayers = currentStyle.layers.filter((l) => !BASE_LAYER_IDS.has(l.id))

    const restore = (): void => {
      for (const { id, spec } of customSources) {
        map.addSource(id, spec)
      }
      for (const layer of customLayers) {
        map.addLayer(layer)
      }
    }

    const onStyleData = (): void => {
      if (map.isStyleLoaded()) {
        restore()
      } else {
        map.once('styledata', onStyleData)
      }
    }

    map.setStyle(createStyle(type, this.options.http2, this.options.TDTToken))
    map.once('styledata', onStyleData)
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
