import { point } from '@turf/turf'
import type * as GeoJSON from 'geojson'
import type { Map } from 'mapbox-gl'

import { Point } from '@/modules/Plot/plugins/Point'
import type { IIndexPointOptions } from '@/types/Plot/IndexPoint.ts'
import type { PlotType } from '@/types/Plot/Poi.ts'

import { LAYER_LIST, NAME, POINT_INDEX_LAYER_NAME } from './vars.ts'

export class IndexPoint extends Point<IIndexPointOptions> {
  static override NAME: PlotType = NAME
  override readonly LAYER: string = POINT_INDEX_LAYER_NAME

  constructor(map: Map, options: IIndexPointOptions) {
    super(map, options)

    this.removeTooltip()
  }

  public override onAdd(): void {
    super.onAdd()

    LAYER_LIST.forEach((layer) => {
      this.context.register.addLayer(layer)
    })
  }

  public override getFeature(): GeoJSON.Feature<
    GeoJSON.Point,
    IIndexPointOptions['style'] & IIndexPointOptions['properties']
  > | null {
    if (!this.options.position) {
      return null
    }

    return point(
      this.options.position.toArray(),
      {
        ...this.options.style,
        ...this.options.properties,
        index: this.options.index,
        meta: 'circle',
        subMeta: 'indexPoint',
      },
      {
        id: this.options.id,
      },
    )
  }
}
