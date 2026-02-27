import type { ColorSpecification } from 'mapbox-gl'

import type { IconPointStyle } from '@/types/Plot/IconPoint.ts'
import type { IndexPointStyle } from '@/types/Plot/IndexPoint.ts'
import type { IPoiOptions, PointPosition } from '@/types/Plot/Poi.ts'

export interface CirclePointStyle {
  'circle-stroke-width'?: number
  'circle-stroke-color'?: ColorSpecification
  'circle-radius'?: number
  'circle-color'?: ColorSpecification
}

export type PointStyle = CirclePointStyle | IndexPointStyle | IconPointStyle

export interface IPointOptions extends IPoiOptions {
  position?: PointPosition
  style?: PointStyle
  // edit?: boolean
  properties?: Record<string, any>
}
