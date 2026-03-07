import type { DataDrivenPropertyValueSpecification, LayerSpecification } from 'mapbox-gl'

import type { SortLayer } from '@/core/ResourceRegister'
import { Z_INDEX } from '@/modules/Plot/plugins/Point/vars.ts'
import { PLOT_SOURCE_NAME } from '@/modules/Plot/vars.ts'
import { PlotType } from '@/types/Plot/Poi.ts'

export const NAME = PlotType.ICON_POINT

export const POINT_ICON_LAYER_NAME = 'mapbox-gl-plot-point-icon-layer'

export const DEFAULT_TEXT_SIZE = 12

export const DEFAULT_ICON_ANCHOR = 'bottom'

export const GAP_PX = 5 // 文字和图标边缘的固定间距 (像素)

export const DEFAULT_ICON_SIZE = 1

const zoomScale: DataDrivenPropertyValueSpecification<number> = [
  'interpolate',
  ['linear'],
  ['zoom'],
  5,
  0.5,
  14,
  1,
  22,
  2.5,
]

// 结合属性与缩放因子
export const iconSize: DataDrivenPropertyValueSpecification<number> = [
  '*',
  ['coalesce', ['get', 'icon-size'], DEFAULT_ICON_SIZE],
  zoomScale,
]

export const ICON_ROTATE: DataDrivenPropertyValueSpecification<number> = [
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
    'icon-rotate': ICON_ROTATE,
  },
  paint: {},
}

export const LAYER_LIST: SortLayer[] = [
  {
    layer: POINT_ICON_LAYER,
    zIndex: Z_INDEX,
  },
]
