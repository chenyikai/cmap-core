import type { Feature, MultiLineString } from 'geojson'

export interface IFocusOptions {
  icon?: string
  size?: number
  id?: string
  padding?: number
}

export interface FocusItem {
  id: string
  border: Feature<MultiLineString>
  feature: Feature
  options?: IFocusOptions
}
