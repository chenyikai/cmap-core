import type { ColorSpecification } from 'mapbox-gl'

import type { IPointOptions } from '@/types/Plot/Point.ts'

export interface IndexPointStyle {
  'text-color'?: string
  'text-size'?: number
  'circle-stroke-width'?: number
  'circle-stroke-color'?: ColorSpecification
  'circle-radius'?: number
  'circle-color'?: ColorSpecification
}

export interface IIndexPointOptions extends IPointOptions {
  index: number
  style?: IndexPointStyle
}
