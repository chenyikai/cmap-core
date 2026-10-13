import type {
  ColorSpecification,
  DataDrivenPropertyValueSpecification,
  LngLatLike,
} from 'mapbox-gl'

import type { Point } from '@/modules/Plot/plugins/Point'
import type { IconPointStyle } from '@/types/Plot/IconPoint.ts'
import type { IndexPointStyle } from '@/types/Plot/IndexPoint.ts'
import type { IPoiOptions } from '@/types/Plot/Poi.ts'

export interface PointTextStyle {
  'text-color'?: DataDrivenPropertyValueSpecification<ColorSpecification>
  'text-size'?: number
  'text-offset'?: [number, number]
  'text-rotate'?: number
  'text-allow-overlap'?: boolean
}

export interface CirclePointStyle extends PointTextStyle {
  'circle-stroke-width'?: number
  'circle-stroke-color'?: DataDrivenPropertyValueSpecification<ColorSpecification>
  'circle-radius'?: number
  'circle-color'?: DataDrivenPropertyValueSpecification<ColorSpecification>
}

export type PointStyle = CirclePointStyle | IndexPointStyle | IconPointStyle

export interface IPointOptions<TStyle = PointStyle> extends IPoiOptions {
  position?: LngLatLike
  style?: TStyle
  // edit?: boolean
  properties?: Record<string, any>
}

export type ICirclePointOptions = IPointOptions<CirclePointStyle>

/** Point 的公共实例能力，自动跟随 Point 类的公开成员更新。 */
export type PointInstance<T extends IPointOptions = IPointOptions> = Pick<Point<T>, keyof Point<T>>
