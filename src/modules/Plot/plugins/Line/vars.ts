import type {
  ColorSpecification,
  DataDrivenPropertyValueSpecification,
  LayerSpecification,
} from 'mapbox-gl'

import type { SortLayer } from '@/core/ResourceRegister'
import { Meta, PLOT_SOURCE_NAME } from '@/modules/Plot/vars.ts'
import { PlotType } from '@/types/Plot/Poi.ts'

export const NAME = PlotType.LINE

export const Z_INDEX = 5
export const TEXT_Z_INDEX = Z_INDEX + 1 // 文字层级要比线高一点

export const LINE_LAYER_NAME = 'mapbox-gl-plot-line-layer'
export const DOTTED_LINE_LAYER_NAME = 'mapbox-gl-plot-dotted-line-layer'
export const LINE_TEXT_LAYER_NAME = 'mapbox-gl-plot-line-text-layer'

export const DEFAULT_LINE_COLOR = '#f00'
export const DEFAULT_LINE_WIDTH = 3
export const DEFAULT_TEXT_COLOR = '#333'
export const DEFAULT_TEXT_SIZE = 18

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

// 文字大小缩放因子 (随缩放层级线性变化)
const baseTextSize = ['coalesce', ['get', 'text-size'], DEFAULT_TEXT_SIZE]

export const DOTTED_LINE_LAYER: LayerSpecification = {
  id: DOTTED_LINE_LAYER_NAME,
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
  layout: {
    'line-join': 'round',
    'line-cap': 'round',
  },
}

export const LINE_LAYER: LayerSpecification = {
  id: LINE_LAYER_NAME,
  type: 'line',
  filter: ['all', ['==', '$type', 'LineString'], ['==', 'visibility', 'visible']],
  source: PLOT_SOURCE_NAME,
  paint: {
    // 'line-dasharray': lineDasharray,
    'line-color': lineColor,
    'line-width': [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      ['+', lineWidth, ['%', lineWidth, 1.2]],
      lineWidth,
    ],
  },
  layout: {
    'line-join': 'round',
    'line-cap': 'round',
  },
}

// 🌟 新增：线段标题文本图层
export const LINE_TEXT_LAYER: LayerSpecification = {
  id: LINE_TEXT_LAYER_NAME,
  type: 'symbol',
  filter: [
    'all',
    ['==', '$type', 'LineString'],
    ['==', 'isName', true],
    ['==', 'meta', Meta.LINE_TITLE],
    ['==', 'visibility', 'visible'],
  ],
  source: PLOT_SOURCE_NAME,
  layout: {
    'icon-ignore-placement': true,
    'text-ignore-placement': false,
    'text-letter-spacing': 0.01,
    'symbol-placement': 'line-center', // 让文字居中附着在线上
    'text-field': ['get', 'text'],
    'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
    'text-allow-overlap': true,
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

export const LAYER_LIST: SortLayer[] = [
  {
    layer: DOTTED_LINE_LAYER,
    zIndex: Z_INDEX,
  },
  {
    layer: LINE_LAYER,
    zIndex: Z_INDEX,
  },
  {
    layer: LINE_TEXT_LAYER,
    zIndex: TEXT_Z_INDEX, // 注册文字图层
  },
]
