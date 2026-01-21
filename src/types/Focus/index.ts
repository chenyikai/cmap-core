import type { Feature, MultiLineString } from 'geojson'

export interface IFocusOptions {
  size?: number
  padding?: number
  armLength?: number
}

export interface FocusItem {
  id: string | number
  border: Feature<MultiLineString>
  feature: Feature
  options?: IFocusOptions
}
