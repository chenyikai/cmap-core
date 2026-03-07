import type { DataDrivenPropertyValueSpecification, LayerSpecification } from 'mapbox-gl'

import type { SortLayer } from '@/core/ResourceRegister'
import { DEFAULT_TEXT_COLOR } from '@/modules/Plot/plugins/IndexPoint/vars.ts'
import { PLOT_SOURCE_NAME } from '@/modules/Plot/vars.ts'
import { PlotType } from '@/types/Plot/Poi.ts'

export const NAME = PlotType.POINT

export const Z_INDEX = 10

export const TEXT_Z_INDEX = Z_INDEX + 1

export const POINT_CIRCLE_LAYER_NAME = 'mapbox-gl-plot-point-circle-layer'

export const POINT_TEXT_LAYER_NAME = 'mapbox-gl-plot-point-text-layer'

export const DEFAULT_TEXT_SIZE = 12

export const GAP_PX = 5 // 文字和图标边缘的固定间距 (像素)

export const DEFAULT_CIRCLE_RADIUS = 10

export const DEFAULT_CIRCLE_COLOR = '#fff'

export const DEFAULT_CIRCLE_STROKE_WIDTH = 2

export const DEFAULT_CIRCLE_STROKE_COLOR = '#f00'

// 🌟 核心：定义一个随 zoom 线性变化的比例因子
const zoomScale: DataDrivenPropertyValueSpecification<number> = [
  'interpolate',
  ['linear'],
  ['zoom'],
  5,
  0.5, // zoom为5时，缩小为 0.5 倍
  14,
  1, // zoom为14时，保持原大小 (1 倍)
  22,
  2.5, // zoom为22时，放大为 2.5 倍 (可根据实际视觉效果微调)
]

// const circleRadius = ['coalesce', ['get', 'circle-radius'], DEFAULT_CIRCLE_RADIUS]
const circleRadius: DataDrivenPropertyValueSpecification<number> = [
  '*',
  ['coalesce', ['get', 'circle-radius'], DEFAULT_CIRCLE_RADIUS],
  zoomScale,
]

// const circleStrokeWidth = ['coalesce', ['get', 'circle-stroke-width'], DEFAULT_CIRCLE_STROKE_WIDTH]

const circleStrokeWidth: DataDrivenPropertyValueSpecification<number> = [
  '*',
  ['coalesce', ['get', 'circle-stroke-width'], DEFAULT_CIRCLE_STROKE_WIDTH],
  zoomScale,
]

export const POINT_CIRCLE_LAYER: LayerSpecification = {
  id: POINT_CIRCLE_LAYER_NAME,
  type: 'circle',
  filter: [
    'all',
    ['==', '$type', 'Point'],
    ['==', 'meta', 'circle'],
    ['==', 'visibility', 'visible'],
  ],
  source: PLOT_SOURCE_NAME,
  paint: {
    'circle-radius': [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      ['*', circleRadius, 1.2],
      circleRadius,
    ],
    'circle-color': ['coalesce', ['get', 'circle-color'], DEFAULT_CIRCLE_COLOR],
    'circle-stroke-width': [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      ['*', circleStrokeWidth, 1.2],
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
  filter: [
    'all',
    ['==', '$type', 'Point'],
    ['==', 'isName', true],
    ['==', 'visibility', 'visible'],
  ],
  source: PLOT_SOURCE_NAME,
  layout: {
    'text-field': ['get', 'text'],
    'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
    'text-offset': ['coalesce', ['get', '_calcTextOffset'], ['get', 'text-offset'], [0, 0]],
    'text-anchor': 'top',
    'text-rotate': ['coalesce', ['get', 'icon-rotate'], 0],
    'text-size': ['*', ['coalesce', ['get', 'text-size'], DEFAULT_TEXT_SIZE], zoomScale],
    'text-allow-overlap': true,
  },
  paint: {
    'text-color': ['coalesce', ['get', 'text-color'], DEFAULT_TEXT_COLOR],
  },
}

export const LAYER_LIST: SortLayer[] = [
  {
    layer: POINT_CIRCLE_LAYER,
    zIndex: Z_INDEX,
  },
  {
    layer: POINT_TEXT_LAYER,
    zIndex: TEXT_Z_INDEX,
  },
]
