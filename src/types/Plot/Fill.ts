import type { LineStyle } from '@/types/Plot/Line.ts'
import type { IPoiOptions, PolygonPosition } from '@/types/Plot/Poi.ts'
import type { PointStyle } from '@/types/Plot/Point.ts'

export type FillStyle = object

export interface IFillOptions extends IPoiOptions {
  position?: PolygonPosition
  style?: FillStyle
  outLineStyle?: LineStyle
  vertexStyle?: PointStyle
  midStyle?: PointStyle
  titleStyle?: PointStyle
  properties?: Record<string, any>
}
