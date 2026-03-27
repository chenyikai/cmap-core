import type { ColorSpecification, DataDrivenPropertyValueSpecification } from 'mapbox-gl'

import type { IPoiOptions, LineStringPosition } from '@/types/Plot/Poi.ts'
import type { PointStyle } from '@/types/Plot/Point.ts'

export enum PointType {
  VERTEX = 'Vertex',
  MIDPOINT = 'MidPoint',
}

export interface LineStyle {
  'line-color'?: DataDrivenPropertyValueSpecification<ColorSpecification>
  'line-width'?: DataDrivenPropertyValueSpecification<number>
  'text-size'?: DataDrivenPropertyValueSpecification<number>
}

export interface ILineOptions extends IPoiOptions {
  position?: LineStringPosition
  style?: LineStyle
  vertexStyle?: PointStyle
  midStyle?: PointStyle
  properties?: Record<string, any>
}
