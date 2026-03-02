import type {
  ColorSpecification,
  DataDrivenPropertyValueSpecification,
  LayerSpecification,
} from 'mapbox-gl'

import { PLOT_SOURCE_NAME } from '@/modules/Plot/vars.ts'
import { PlotType } from '@/types/Plot/Poi.ts'

export const NAME = PlotType.LINE

export const LINE_LAYER_NAME = 'mapbox-gl-plot-line-layer'

export const DEFAULT_LINE_COLOR = '#f00'

export const DEFAULT_LINE_WIDTH = 3

const lineColor: DataDrivenPropertyValueSpecification<ColorSpecification> = [
  'coalesce',
  ['get', 'line-color'],
  DEFAULT_LINE_COLOR,
]

const lineWidth: DataDrivenPropertyValueSpecification<number> = [
  'coalesce',
  ['get', 'line-width'],
  DEFAULT_LINE_WIDTH,
]

const lineDasharray: DataDrivenPropertyValueSpecification<number[]> = [
  'coalesce',
  ['get', 'line-dasharray'],
  [99999, 99999],
]

export const LINE_LAYER: LayerSpecification = {
  id: LINE_LAYER_NAME,
  type: 'line',
  filter: ['all', ['==', '$type', 'LineString'], ['==', 'visibility', 'visible']],
  source: PLOT_SOURCE_NAME,
  paint: {
    'line-dasharray': lineDasharray,
    'line-color': lineColor,
    'line-width': [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      ['+', lineWidth, ['%', lineWidth, 1.2]],
      lineWidth,
    ],
  },
  layout: {},
}

export const LAYER_LIST: LayerSpecification[] = [LINE_LAYER]
