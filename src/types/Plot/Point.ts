import type { ColorSpecification } from 'mapbox-gl'

import type { IPoiOptions, PointPosition } from '@/types/Plot/Poi.ts'

export interface IPointOptions extends IPoiOptions {
  position?: PointPosition
  style?: {
    'circle-stroke-width'?: number
    'circle-stroke-color'?: ColorSpecification
    'circle-radius'?: number
    'circle-color'?: ColorSpecification
  }
  properties?: Record<string, any>
}
