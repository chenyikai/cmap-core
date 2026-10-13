import type { FilterSpecification, LayerSpecification } from 'mapbox-gl'

import type { SortLayer } from '@/core/ResourceRegister'
import { PLOT_SOURCE_NAME } from '@/modules/Plot/vars.ts'
import { PlotType } from '@/types/Plot/Poi.ts'

export const NAME = PlotType.POINT

export const Z_INDEX = 10
export const TEXT_Z_INDEX = Z_INDEX + 1

export const POINT_CIRCLE_LAYER_NAME = 'mapbox-gl-plot-point-circle-layer'
export const POINT_TEXT_LAYER_NAME = 'mapbox-gl-plot-point-text-layer'
export const POINT_TEXT_COLLISION_LAYER_NAME = 'mapbox-gl-plot-point-text-collision-layer'

export const DEFAULT_TEXT_SIZE = 12
export const DEFAULT_TEXT_COLOR = '#333'
export const GAP_PX = 5
export const DEFAULT_CIRCLE_RADIUS = 10
export const DEFAULT_CIRCLE_COLOR = '#fff'
export const DEFAULT_CIRCLE_STROKE_WIDTH = 2
export const DEFAULT_CIRCLE_STROKE_COLOR = '#f00'

// 提取基础数据属性
const baseRadius = ['coalesce', ['get', 'circle-radius'], DEFAULT_CIRCLE_RADIUS]
const baseStrokeWidth = ['coalesce', ['get', 'circle-stroke-width'], DEFAULT_CIRCLE_STROKE_WIDTH]
const baseTextSize = ['coalesce', ['get', 'text-size'], DEFAULT_TEXT_SIZE]
const calculatedTextOffset = [
  'interpolate',
  ['linear'],
  ['zoom'],
  5,
  ['coalesce', ['get', '_calcTextOffsetZ5'], ['get', '_calcTextOffset'], [0, 0]],
  14,
  ['coalesce', ['get', '_calcTextOffsetZ14'], ['get', '_calcTextOffset'], [0, 0]],
  22,
  ['coalesce', ['get', '_calcTextOffsetZ22'], ['get', '_calcTextOffset'], [0, 0]],
]

// 提取 Hover 悬停时的放大倍数
const hoverScale = ['case', ['boolean', ['feature-state', 'hover'], false], 1.2, 1]

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
    // 必须把 interpolate ['zoom'] 放在最外层！
    // 内部公式：基础值 * hover缩放 * 当前层级缩放因子
    'circle-radius': [
      'interpolate',
      ['linear'],
      ['zoom'],
      5,
      ['*', baseRadius, hoverScale, 0.5],
      14,
      ['*', baseRadius, hoverScale, 1],
      22,
      ['*', baseRadius, hoverScale, 2.5],
    ],
    'circle-stroke-width': [
      'interpolate',
      ['linear'],
      ['zoom'],
      5,
      ['*', baseStrokeWidth, hoverScale, 0.5],
      14,
      ['*', baseStrokeWidth, hoverScale, 1],
      22,
      ['*', baseStrokeWidth, hoverScale, 2.5],
    ],
    'circle-color': ['coalesce', ['get', 'circle-color'], DEFAULT_CIRCLE_COLOR],
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
    ['!=', 'text-allow-overlap', false],
  ],
  source: PLOT_SOURCE_NAME,
  layout: {
    'text-field': ['get', 'text'],
    'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
    'text-offset': ['coalesce', ['get', 'text-offset'], calculatedTextOffset, [0, 0]],
    'text-anchor': 'top',
    'text-rotate': ['coalesce', ['get', 'text-rotate'], 0],
    'text-allow-overlap': true,
    // 文字大小同样遵循外层 interpolate
    'text-size': [
      'interpolate',
      ['linear'],
      ['zoom'],
      5,
      ['*', baseTextSize, 0.5],
      14,
      ['*', baseTextSize, 1],
      22,
      ['*', baseTextSize, 2.5],
    ],
  },
  paint: {
    'text-color': ['coalesce', ['get', 'text-color'], DEFAULT_TEXT_COLOR],
    'text-halo-color': '#ffffff', // 白色描边，防止线条颜色穿透文字
    'text-halo-width': 1,
  },
}

/** 为需要参与碰撞检测的名称提供独立图层，因为该属性不支持按 Feature 表达式设置。 */
export const POINT_TEXT_COLLISION_LAYER: LayerSpecification = {
  ...POINT_TEXT_LAYER,
  id: POINT_TEXT_COLLISION_LAYER_NAME,
  filter: [
    'all',
    ['==', '$type', 'Point'],
    ['==', 'isName', true],
    ['==', 'visibility', 'visible'],
    ['==', 'text-allow-overlap', false],
  ] as FilterSpecification,
  layout: {
    ...POINT_TEXT_LAYER.layout,
    'text-allow-overlap': false,
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
  {
    layer: POINT_TEXT_COLLISION_LAYER,
    zIndex: TEXT_Z_INDEX,
  },
]
