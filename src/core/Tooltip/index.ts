import { bboxPolygon, lineString } from '@turf/turf'
import type * as GeoJSON from 'geojson'
import type { LngLat, Map } from 'mapbox-gl'
import { Marker, Point } from 'mapbox-gl'
import type { BBox } from 'rbush'

import { Module } from '@/core/Module'
import type { AllAnchor, ITooltipOptions, SimpleAnchor } from '@/types/Toolip'

import { LAYERS, TOOLTIP_SOURCE_NAME } from './vars.ts'

export class Tooltip extends Module {
  static DEBUG = false

  options: ITooltipOptions

  private mark: Marker | null = null

  private zoom = (): void => {
    this.render()
  }

  constructor(map: Map, options: ITooltipOptions) {
    super(map)
    this.options = options

    if (this.visible) {
      this.context.map.on('zoom', this.zoom)
      this.context.map.on('zoomend', this.zoom)
    }
  }

  get id(): string | number {
    return this.options.id
  }

  get visible(): boolean {
    return !!this.options.visible
  }

  get bbox(): BBox {
    const allBbox = this.getAllBbox()
    const anchor = this.options.anchor ?? 'bottom-right'
    return allBbox[anchor]
  }

  override onAdd(): void {
    this.context.register.addSource(TOOLTIP_SOURCE_NAME, {
      type: 'geojson',
      dynamic: true,
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    })

    LAYERS.forEach((layer) => {
      this.context.register.addLayer(layer)
    })
  }

  override onRemove(): void {
    this.remove()
  }

  public debug(): void {
    const { minX, minY, maxX, maxY } = this.bbox
    const { lng: minLon, lat: minLat } = this.context.map.unproject(new Point(minX, minY))
    const { lng: maxLon, lat: maxLat } = this.context.map.unproject(new Point(maxX, maxY))
    const fill = bboxPolygon([minLon, minLat, maxLon, maxLat], {
      properties: { meta: 'debug' },
      id: String(this.id) + 'debug',
    })

    this.context.register.setGeoJSONData(TOOLTIP_SOURCE_NAME, fill)
  }

  hide(): void {
    this.options.visible = false
    this.render()
    this.context.map.off('zoom', this.zoom)
    this.context.map.off('zoomend', this.zoom)
  }

  show(): void {
    this.options.visible = true
    this.render()
    this.context.map.on('zoom', this.zoom)
    this.context.map.on('zoomend', this.zoom)
  }

  setAnchor(anchor: ITooltipOptions['anchor']): void {
    if (this.mark) {
      this.mark.remove()
      this.mark = null
    }

    this.options.visible = true
    this.options.anchor = anchor

    this.render()
  }

  getSimpleBbox(): SimpleAnchor {
    return {
      'top-left': this.getBbox('top-left'),
      'top-right': this.getBbox('top-right'),
      'bottom-left': this.getBbox('bottom-left'),
      'bottom-right': this.getBbox('bottom-right'),
    }
  }

  getAllBbox(): AllAnchor {
    return {
      // center: this.getBbox('center'),
      // top: this.getBbox('top'),
      // bottom: this.getBbox('bottom'),
      // left: this.getBbox('left'),
      // right: this.getBbox('right'),
      'top-left': this.getBbox('top-left'),
      'top-right': this.getBbox('top-right'),
      'bottom-left': this.getBbox('bottom-left'),
      'bottom-right': this.getBbox('bottom-right'),
    }
  }

  getBbox(val?: ITooltipOptions['anchor']): BBox {
    const anchor = val ?? this.options.anchor

    const point = this.context.map.project(this.options.position)
    const offset = new Point(this.options.offsetX ?? 0, this.options.offsetY ?? 0)
    const { width, height } = this.getOffDOMSize(this.options.element)

    const bbox: BBox = {
      minX: point.x,
      minY: point.y,
      maxX: point.x,
      maxY: point.y,
    }
    // if (anchor === 'top') {
    //   bbox.minX = point.x - offsetWidth / 2
    //   bbox.maxX = point.x + offsetWidth / 2
    //   bbox.maxY = point.y + offsetHeight + Math.abs(offset.y)
    // } else if (anchor === 'bottom') {
    //   bbox.minX = point.x - offsetWidth / 2
    //   bbox.maxX = point.x + offsetWidth / 2
    //   bbox.minY = point.y - offsetHeight + offset.y
    // } else if (anchor === 'left') {
    //   bbox.maxY = point.y + offsetHeight / 2
    //   bbox.minY = point.y - offsetHeight / 2
    //   bbox.maxX = point.x + offsetWidth + Math.abs(offset.x)
    // } else if (anchor === 'right') {
    //   bbox.maxY = point.y + offsetHeight / 2
    //   bbox.minY = point.y - offsetHeight / 2
    //   bbox.minX = point.x - offsetWidth + offset.x
    // } else if (anchor === 'center') {
    //   bbox.maxY = point.y + offsetHeight / 2
    //   bbox.minY = point.y - offsetHeight / 2
    //   bbox.maxX = point.x + offsetWidth / 2
    //   bbox.minX = point.x - offsetWidth / 2
    // } else
    if (anchor === 'top-left') {
      bbox.maxY = point.y + height + Math.abs(offset.y)
      bbox.maxX = point.x + width + Math.abs(offset.x)
    } else if (anchor === 'top-right') {
      bbox.maxY = point.y + height + Math.abs(offset.y)
      bbox.minX = point.x - width + offset.x
    } else if (anchor === 'bottom-left') {
      bbox.minY = point.y - (height + offset.y)
      bbox.maxX = point.x + width + Math.abs(offset.x)
    } else if (anchor === 'bottom-right') {
      bbox.minY = point.y - (height + offset.y)
      bbox.minX = point.x - width + offset.x
    }

    return bbox
  }

  private getOffDOMSize(label: HTMLElement): { width: number; height: number } {
    const element = label.cloneNode(true) as HTMLElement
    // 1. 保存原始样式 (为了测量后恢复，避免污染元素)
    const originalStyles = {
      position: element.style.position,
      visibility: element.style.visibility,
      top: element.style.top,
      left: element.style.left,
      display: element.style.display, // 防止元素本身带有 display: none
    }

    // 2. 设置“隐形”样式
    // 关键：不能用 display: none，否则拿不到尺寸
    element.style.position = 'absolute'
    element.style.visibility = 'hidden'
    element.style.top = '-9999px'
    element.style.left = '-9999px'
    element.style.display = 'block' // 确保它是块级或行内块，能撑开宽高
    // 可选：如果内容是纯文本且需要自动换行，可能需要指定一个 max-width
    // element.style.width = 'max-content';

    // 3. 插入 DOM
    document.body.appendChild(element)

    // 4. 测量
    const width = element.offsetWidth
    const height = element.offsetHeight
    // 如果需要更精确的小数点，可以用 getBoundingClientRect
    // const rect = element.getBoundingClientRect();
    // const width = rect.width;
    // const height = rect.height;

    // 5. 移除 DOM
    document.body.removeChild(element)

    // 6. 恢复原始样式 (如果是克隆的节点这一步可以省略)
    element.style.position = originalStyles.position
    element.style.visibility = originalStyles.visibility
    element.style.top = originalStyles.top
    element.style.left = originalStyles.left
    element.style.display = originalStyles.display

    return { width, height }
  }

  remove(): void {
    if (this.mark) {
      this.mark.remove()
      this.mark = null
    }

    this.options.visible = false
    this.connectLine()
    this.context.map.off('zoom', this.zoom)
    this.context.map.off('zoomend', this.zoom)
  }

  _create(): void {
    this.mark = new Marker({
      className: this.options.className ?? 'mapbox-gl-tooltip',
      element: this.options.element,
      offset: this._getOffsetByAnchor(),
      anchor: this.options.anchor,
    }).setLngLat(this.options.position)
  }

  _getOffsetByAnchor(): Point {
    const offset = new Point(0, 0)
    // if (this.options.anchor === 'center') {
    //   offset.x = 0
    //   offset.y = 0
    // } else if (this.options.anchor === 'top') {
    //   offset.x = 0
    //   offset.y = this.options.offsetY ?? 0
    // } else if (this.options.anchor === 'bottom') {
    //   offset.x = 0
    //   offset.y = -(this.options.offsetY ?? 0)
    // } else if (this.options.anchor === 'left') {
    //   offset.x = this.options.offsetX ?? 0
    //   offset.y = 0
    // } else if (this.options.anchor === 'right') {
    //   offset.x = -(this.options.offsetX ?? 0)
    //   offset.y = 0
    // } else
    if (this.options.anchor === 'top-left') {
      offset.x = this.options.offsetX ?? 0
      offset.y = this.options.offsetY ?? 0
    } else if (this.options.anchor === 'top-right') {
      offset.x = -(this.options.offsetX ?? 0)
      offset.y = this.options.offsetY ?? 0
    } else if (this.options.anchor === 'bottom-left') {
      offset.x = this.options.offsetX ?? 0
      offset.y = -(this.options.offsetY ?? 0)
    } else if (this.options.anchor === 'bottom-right') {
      offset.x = -(this.options.offsetX ?? 0)
      offset.y = -(this.options.offsetY ?? 0)
    }

    return offset
  }

  setLngLat(lngLat: LngLat): this {
    this.options.position = lngLat

    if (this.mark) {
      this.mark.setLngLat(lngLat)
    }

    return this
  }

  connectLine(): void {
    const id = `${String(this.options.id)}-tooltip-connect-line`

    const endPoint = this.connectPoint()
    if (!endPoint || !this.visible) {
      const emptyFeature: GeoJSON.Feature<GeoJSON.Point> = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [0, 0],
        },
        id,
        properties: {},
      }

      this.context.register.setGeoJSONData(TOOLTIP_SOURCE_NAME, emptyFeature)
      return
    }

    const lonLat = [this.options.position.toArray(), endPoint.toArray()]

    const feature: GeoJSON.Feature<GeoJSON.LineString> = lineString(
      lonLat,
      {},
      {
        id,
      },
    )

    this.context.register.setGeoJSONData(TOOLTIP_SOURCE_NAME, feature)
  }

  connectPoint(): LngLat | null {
    if (!this.mark || !this.visible) return null

    const point = this.context.map.project(this.mark.getLngLat())
    const offset = this.mark.getOffset()

    point.x += offset.x
    point.y += offset.y

    const { width } = this.getOffDOMSize(this.options.element)

    if (this.options.anchor === 'top-left') {
      point.x += width / 2
    } else if (this.options.anchor === 'top-right') {
      point.x -= width / 2
    } else if (this.options.anchor === 'bottom-left') {
      point.x += width / 2
    } else if (this.options.anchor === 'bottom-right') {
      point.x -= width / 2
    }

    return this.context.map.unproject(point)
  }

  render(): this {
    if (this.visible) {
      if (!this.mark) {
        this._create()
      }

      this.mark?.addTo(this.context.map)

      if (Tooltip.DEBUG) {
        this.debug()
      }
    } else {
      this.mark?.remove()
      this.mark = null
    }

    this.connectLine()
    return this
  }
}
