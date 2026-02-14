import type { LngLat } from 'mapbox-gl'

export type PointPosition = LngLat

export type LineStringPosition = PointPosition[]

export type PolygonPosition = LineStringPosition[]

export enum PlotType {
  POINT = 'Point',
  LINE = 'LineString',
  POLYGON = 'Polygon',
  CIRCLE = 'Circle',
}

export interface IPoiOptions {
  id: string
  name: string
  tooltip?: boolean
  style?: Record<string, unknown>
  properties?: Record<string, any>
}
