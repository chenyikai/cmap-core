import type { LayerSpecification } from 'mapbox-gl'

import { DEFAULT_TEXT_COLOR } from '@/modules/Plot/plugins/IndexPoint/vars.ts'
import { PLOT_SOURCE_NAME } from '@/modules/Plot/vars.ts'
import { PlotType } from '@/types/Plot/Poi.ts'

export const NAME = PlotType.POINT

export const POINT_CIRCLE_LAYER_NAME = 'mapbox-gl-plot-point-circle-layer'

export const POINT_TEXT_LAYER_NAME = 'mapbox-gl-plot-point-text-layer'

export const DEFAULT_TEXT_SIZE = 12

export const GAP_PX = 5 // 文字和图标边缘的固定间距 (像素)

export const DEFAULT_CIRCLE_RADIUS = 10

export const DEFAULT_CIRCLE_COLOR = '#fff'

export const DEFAULT_CIRCLE_STROKE_WIDTH = 2

export const DEFAULT_CIRCLE_STROKE_COLOR = '#f00'

const circleRadius = ['coalesce', ['get', 'circle-radius'], DEFAULT_CIRCLE_RADIUS]

const circleStrokeWidth = ['coalesce', ['get', 'circle-stroke-width'], DEFAULT_CIRCLE_STROKE_WIDTH]

export const POINT_CIRCLE_LAYER: LayerSpecification = {
  id: POINT_CIRCLE_LAYER_NAME,
  type: 'circle',
  filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'circle']],
  source: PLOT_SOURCE_NAME,
  paint: {
    'circle-radius': [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      ['+', circleRadius, ['%', circleRadius, 0.6]],
      circleRadius,
    ],
    'circle-color': ['coalesce', ['get', 'circle-color'], DEFAULT_CIRCLE_COLOR],
    'circle-stroke-width': [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      ['+', circleStrokeWidth, ['%', circleStrokeWidth, 0.6]],
      circleStrokeWidth,
    ],
    'circle-stroke-color': [
      'coalesce',
      ['get', 'circle-stroke-color'],
      DEFAULT_CIRCLE_STROKE_COLOR,
    ],
  },
}

export const POINT_TEXT_LAYER: LayerSpecification = {
  id: POINT_TEXT_LAYER_NAME,
  type: 'symbol',
  filter: ['all', ['==', '$type', 'Point'], ['==', 'isName', true]],
  source: PLOT_SOURCE_NAME,
  layout: {
    'text-field': ['get', 'text'],
    'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
    'text-offset': ['coalesce', ['get', '_calcTextOffset'], ['get', 'text-offset'], [0, 0]],
    'text-anchor': 'top',
    'text-rotate': ['coalesce', ['get', 'icon-rotate'], 0],
    'text-size': ['coalesce', ['get', 'text-size'], DEFAULT_TEXT_SIZE],
    'text-allow-overlap': true,
  },
  paint: {
    'text-color': ['coalesce', ['get', 'text-color'], DEFAULT_TEXT_COLOR],
  },
}

export const LAYER_LIST: LayerSpecification[] = [POINT_CIRCLE_LAYER, POINT_TEXT_LAYER]
