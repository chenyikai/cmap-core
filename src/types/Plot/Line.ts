import type { IPoiOptions, LineStringPosition } from '@/types/Plot/Poi.ts'
import type { PointStyle } from '@/types/Plot/Point.ts'

export enum PointType {
  VERTEX = 'Vertex',
  MIDPOINT = 'MidPoint',
}

export type LineStyle = object

export interface ILineOptions extends IPoiOptions {
  position?: LineStringPosition
  style?: LineStyle
  vertexStyle?: PointStyle
  midStyle?: PointStyle
  index?: boolean
  properties?: Record<string, any>
}
