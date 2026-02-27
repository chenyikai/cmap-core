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
import type { IIconPointOptions } from '@/types/Plot/IconPoint.ts'
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
        isName: true,
        _calcTextOffset: calculatedOffset,
        meta: 'icon',
      },
      {
        id: this.options.id,
      },
    )
  }
}
