import type { LngLat } from 'mapbox-gl'

export type PointPosition = LngLat

export type LineStringPosition = PointPosition[]

export type PolygonPosition = LineStringPosition[]

export enum PlotType {
  POINT = 'Point',
  INDEX_POINT = 'IndexPoint',
  ICON_POINT = 'IconPoint',
  LINE = 'LineString',
  POLYGON = 'Polygon',
  CIRCLE = 'Circle',
}

export interface IPoiOptions {
  id: string
  name: string
  tooltip?: boolean
  // style?: Record<string, unknown>
  style?: any
  properties?: Record<string, any>
}
