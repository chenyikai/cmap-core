import { point } from '@turf/turf'
import type * as GeoJSON from 'geojson'
import type { Map } from 'mapbox-gl'

import {
  PointCreateEvent,
  PointResidentEvent,
  PointUpdateEvent,
} from '@/modules/Plot/plugins/Events/PointEvents.ts'
import { Point } from '@/modules/Plot/plugins/Point'
import { EMPTY_SOURCE, PLOT_SOURCE_NAME } from '@/modules/Plot/vars.ts'
import type { CalcOffsetParams, IIconPointOptions } from '@/types/Plot/IconPoint.ts'
import type { PlotType } from '@/types/Plot/Poi.ts'

import {
  DEFAULT_ICON_ANCHOR,
  DEFAULT_ICON_SIZE,
  DEFAULT_TEXT_SIZE,
  GAP_PX,
  LAYER_LIST,
  NAME,
  POINT_ICON_LAYER_NAME,
} from './vars.ts'

export class IconPoint extends Point<IIconPointOptions> {
  static override NAME: PlotType = NAME

  override readonly LAYER: string = POINT_ICON_LAYER_NAME

  constructor(map: Map, options: IIconPointOptions) {
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

  /**
   * 计算文字相对于图标的偏移量
   * 返回单位为 em (Mapbox text-offset 标准单位)
   */
  private calculateTextOffset(params: CalcOffsetParams): [number, number] {
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

  public override getFeature(): GeoJSON.Feature<
    GeoJSON.Point,
    IIconPointOptions['style'] & IIconPointOptions['properties']
  > | null {
    if (!this.options.position) {
      return null
    }

    const h = this.context.iconManage.getImage(this.options.icon)?.height ?? 0
    const scale = this.options.style?.['icon-size'] ?? DEFAULT_ICON_SIZE
    const anchor = this.options.style?.['icon-anchor'] ?? DEFAULT_ICON_ANCHOR
    const tSize = this.options.style?.['text-size'] ?? DEFAULT_TEXT_SIZE

    const calculatedOffset = this.calculateTextOffset({
      iconHeight: h,
      iconScale: scale,
      iconAnchor: anchor,
      textSize: tSize,
      gap: GAP_PX,
    })

    return point(
      this.options.position.toArray(),
      {
        ...this.options.style,
        ...this.options.properties,
        icon: this.options.icon,
        text: this.options.name,
        _calcTextOffset: calculatedOffset,
        meta: 'icon',
      },
      {
        id: this.options.id,
      },
    )
  }
}
