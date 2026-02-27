import type { DataDrivenPropertyValueSpecification, LayerSpecification } from 'mapbox-gl'

import { DEFAULT_TEXT_COLOR } from '@/modules/Plot/plugins/IndexPoint/vars.ts'
import { PLOT_SOURCE_NAME } from '@/modules/Plot/vars.ts'
import { PlotType } from '@/types/Plot/Poi.ts'

export const NAME = PlotType.ICON_POINT

export const POINT_ICON_LAYER_NAME = 'mapbox-gl-plot-point-icon-layer'

export const POINT_ICON_TEXT_LAYER_NAME = 'mapbox-gl-plot-point-icon-text-layer'

export const DEFAULT_TEXT_SIZE = 12

export const DEFAULT_ICON_ANCHOR = 'bottom'

export const GAP_PX = 5 // 文字和图标边缘的固定间距 (像素)

export const DEFAULT_ICON_SIZE = 1
export const iconSize: DataDrivenPropertyValueSpecification<string> = [
  'coalesce',
  ['get', 'icon-size'],
  DEFAULT_ICON_SIZE,
]
export const iconRotate: DataDrivenPropertyValueSpecification<string> = [
  'coalesce',
  ['get', 'icon-rotate'],
  0,
]

export const POINT_ICON_LAYER: LayerSpecification = {
  id: POINT_ICON_LAYER_NAME,
  type: 'symbol',
  filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'icon']],
  source: PLOT_SOURCE_NAME,
  layout: {
    'icon-allow-overlap': true,
    'icon-anchor': ['coalesce', ['get', 'icon-anchor'], DEFAULT_ICON_ANCHOR],
    'icon-image': ['get', 'icon'],
    'icon-size': iconSize,
    'icon-rotate': iconRotate,
  },
  paint: {},
}

export const POINT_ICON_TEXT_LAYER: LayerSpecification = {
  id: POINT_ICON_TEXT_LAYER_NAME,
  type: 'symbol',
  filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'icon']],
  source: PLOT_SOURCE_NAME,
  layout: {
    'text-field': ['get', 'text'],
    'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
    'text-offset': ['coalesce', ['get', '_calcTextOffset'], ['get', 'text-offset'], [0, 0]],
    'text-anchor': 'top',
    'text-rotate': iconRotate,
    'text-size': ['coalesce', ['get', 'text-size'], DEFAULT_TEXT_SIZE],
    'text-allow-overlap': true,
  },
  paint: {
    'text-color': ['coalesce', ['get', 'text-color'], DEFAULT_TEXT_COLOR],
  },
}

export const LAYER_LIST: LayerSpecification[] = [POINT_ICON_LAYER, POINT_ICON_TEXT_LAYER]
