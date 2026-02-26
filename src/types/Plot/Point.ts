import type { ColorSpecification } from 'mapbox-gl'

import type { IndexPointStyle } from '@/types/Plot/IndexPoint.ts'
import type { IPoiOptions, PointPosition } from '@/types/Plot/Poi.ts'

export interface CirclePointStyle {
  'circle-stroke-width'?: number
  'circle-stroke-color'?: ColorSpecification
  'circle-radius'?: number
  'circle-color'?: ColorSpecification
}

export type PointStyle = CirclePointStyle | IndexPointStyle

export interface IPointOptions extends IPoiOptions {
  position?: PointPosition
  style?: PointStyle
  properties?: Record<string, any>
}
