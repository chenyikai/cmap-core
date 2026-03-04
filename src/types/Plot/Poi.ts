import type { LngLat } from 'mapbox-gl'

export type PlotPosition = LngLat | LineStringPosition | PolygonPosition

export type PointPosition = LngLat

export type LineStringPosition = PointPosition[]

export type PolygonPosition = PointPosition[]

export enum PlotType {
  POINT = 'Point',
  INDEX_POINT = 'IndexPoint',
  ICON_POINT = 'IconPoint',
  LINE = 'LineString',
  Fill = 'Polygon',
  CIRCLE = 'Circle',
}

export type PlotVisibility = 'visible' | 'none'

export interface IPoiOptions {
  id: string
  name?: string
  visibility: PlotVisibility
  isName?: boolean
  style?: any
  properties?: Record<string, any>
}
