import type { ColorSpecification, DataDrivenPropertyValueSpecification, LngLat } from 'mapbox-gl'

import type { IPoiOptions } from '@/types/Plot/Poi.ts'

export interface CircleStyle {
  'fill-color'?: DataDrivenPropertyValueSpecification<ColorSpecification>
  'fill-opacity'?: DataDrivenPropertyValueSpecification<number>
}

export interface ICircleOptions extends IPoiOptions {
  center?: LngLat
  radius?: number
  unit?:
    | 'meters'
    | 'metres'
    | 'millimeters'
    | 'millimetres'
    | 'centimeters'
    | 'centimetres'
    | 'kilometers'
    | 'kilometres'
    | 'miles'
    | 'nauticalmiles'
    | 'inches'
    | 'yards'
    | 'feet'
    | 'radians'
    | 'degrees'
  style?: CircleStyle
}
