import { point } from '@turf/turf'
import type * as GeoJSON from 'geojson'
import type { LngLat, Map } from 'mapbox-gl'

import { Poi } from '@/modules/Plot/plugins/Poi.ts'
import {
  DEFAULT_CIRCLE_RADIUS,
  DEFAULT_CIRCLE_STROKE_WIDTH,
  DEFAULT_TEXT_SIZE,
  GAP_PX,
  LAYER_LIST,
  NAME,
  POINT_CIRCLE_LAYER_NAME,
} from '@/modules/Plot/plugins/Point/vars.ts'
import { EMPTY_SOURCE, PLOT_SOURCE_NAME } from '@/modules/Plot/vars.ts'
import type { CalcOffsetParams } from '@/types/Plot/IconPoint.ts'
import type { PlotType } from '@/types/Plot/Poi.ts'
import type { IPointOptions } from '@/types/Plot/Point.ts'

import { PointCreateEvent, PointResidentEvent, PointUpdateEvent } from '../Events/PointEvents'

export class Point<T extends IPointOptions = IPointOptions> extends Poi<T, GeoJSON.Point | null> {
  static NAME: PlotType = NAME

  override readonly LAYER: string = POINT_CIRCLE_LAYER_NAME

  public residentEvent: PointResidentEvent

  public updateEvent: PointUpdateEvent

  public createEvent: PointCreateEvent

  constructor(map: Map, options: T) {
    super(map, options)

    this.residentEvent = new PointResidentEvent(map, this)
    this.updateEvent = new PointUpdateEvent(map, this)
    this.createEvent = new PointCreateEvent(map, this)
    this.residentEvent.able()
  }

  public override onAdd(): void {
    this.context.register.addSource(PLOT_SOURCE_NAME, EMPTY_SOURCE)

    LAYER_LIST.forEach((layer) => {
      this.context.register.addLayer(layer)
    })
  }
  public override onRemove(): void {
    this.remove()
  }

  public override get id(): string {
    return this.options.id
  }
  public override edit(): void {
    this.setState({ edit: true })
    this.residentEvent.disabled()
    this.updateEvent.able()
  }
  public override unedit(): void {
    this.setState({ edit: false })
    this.residentEvent.able()
    this.updateEvent.disabled()
  }

  public override focus(): void {
    throw new Error('Method not implemented.')
  }
  public override unfocus(): void {
    throw new Error('Method not implemented.')
  }
  public override select(): void {
    throw new Error('Method not implemented.')
  }
  public override unselect(): void {
    throw new Error('Method not implemented.')
  }

  public override get center(): LngLat | null {
    if (!this.options.position) return null

    return this.options.position
  }

  public override get geometry(): GeoJSON.Point | null {
    throw new Error('Method not implemented.')
  }

  public override getFeature(): GeoJSON.Feature<
    GeoJSON.Point | null,
    T['style'] & T['properties']
  > {
    if (!this.options.position) {
      const emptyFeature: GeoJSON.Feature<null, T['style'] & T['properties']> = {
        type: 'Feature',
        geometry: null,
        id: this.id,
        properties: {},
      }

      return emptyFeature
    }

    const h = (DEFAULT_CIRCLE_RADIUS + DEFAULT_CIRCLE_STROKE_WIDTH) * 2
    const scale = 1
    const anchor = 'center'

    const calculatedOffset = this.calculateTextOffset({
      iconHeight: h,
      iconScale: scale,
      iconAnchor: anchor,
      textSize: DEFAULT_TEXT_SIZE,
      gap: GAP_PX,
    })

    return point(
      this.options.position.toArray(),
      {
        ...this.options.style,
        ...this.options.properties,
        visibility: this.options.visibility,
        isName: this.options.isName,
        text: this.options.name,
        _calcTextOffset: calculatedOffset,
        meta: 'circle',
      },
      {
        id: this.options.id,
      },
    )
  }
  public override start(): void {
    if (this.center === null) {
      this.createEvent.able()
    }
  }
  public override stop(): void {
    this.createEvent.disabled()
  }

  public override move(position: T['position']): void {
    this.options.position = position
    this.render()
  }
  public override update(options: T): void {
    this.options = options
    this.render()
  }
  public override remove(): void {
    this.residentEvent.disabled()
    this.updateEvent.disabled()
    this.createEvent.disabled()

    this.removeAllListeners()

    const emptyFeature: GeoJSON.Feature<null> = {
      type: 'Feature',
      geometry: null,
      id: this.id,
      properties: {},
    }

    this.context.register.setGeoJSONData(PLOT_SOURCE_NAME, emptyFeature)
  }
  public override render(): void {
    this.context.register.setGeoJSONData(PLOT_SOURCE_NAME, this.getFeature() as GeoJSON.Feature)
  }

  /**
   * 计算文字相对于图标的偏移量
   * 返回单位为 em (Mapbox text-offset 标准单位)
   */
  protected calculateTextOffset(params: CalcOffsetParams): [number, number] {
    const { iconHeight, iconScale = 1, iconAnchor = 'bottom', textSize = 12, gap = GAP_PX } = params

    // 1. 计算图标在屏幕上的实际像素高度
    const actualHeight = iconHeight * iconScale

    // 2. 计算需要的垂直偏移像素 (Pixel)
    let offsetY_px = 0

    // 根据锚点判断图标占据了坐标点下方多少空间
    if (iconAnchor.includes('bottom')) {
      // A. 底部对齐 (bottom, bottom-left, bottom-right)
      // 图标在坐标点上方，完全不挡路，只需要加个间距
      offsetY_px = gap
    } else if (iconAnchor.includes('top')) {
      // B. 顶部对齐 (top, top-left, top-right)
      // 图标挂在坐标点下方，文字要躲开整个图标的高度
      offsetY_px = actualHeight + gap
    } else {
      // C. 居中对齐 (center, left, right)
      // 图标跨越坐标点，文字要躲开半个图标的高度
      offsetY_px = actualHeight / 2 + gap
    }

    // 3. 转换为 em 单位 (Mapbox 要求)
    // 公式: 像素 / 字体大小
    const offsetY_em = offsetY_px / textSize

    // 返回 [x, y]，这里我们只处理垂直偏移
    return [0, offsetY_em]
  }
}
