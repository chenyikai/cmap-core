import type { DataDrivenPropertyValueSpecification, LayerSpecification } from 'mapbox-gl'

import type { SortLayer } from '@/core/ResourceRegister'
import { PLOT_SOURCE_NAME } from '@/modules/Plot/vars.ts'
import { PlotType } from '@/types/Plot/Poi.ts'

export const NAME = PlotType.INDEX_POINT

export const POINT_INDEX_LAYER_NAME = 'mapbox-gl-plot-point-index-layer'

export const DEFAULT_TEXT_COLOR = '#333'
// 复用缩放因子
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

export const POINT_INDEX_LAYER: LayerSpecification = {
  id: POINT_INDEX_LAYER_NAME,
  type: 'symbol',
  filter: [
    'all',
    ['==', '$type', 'Point'],
    ['==', 'meta', 'circle'],
    ['==', 'subMeta', 'indexPoint'],
    ['==', 'visibility', 'visible'],
  ],
  source: PLOT_SOURCE_NAME,
  paint: {
    'text-color': ['coalesce', ['get', 'text-color'], DEFAULT_TEXT_COLOR],
  },
  layout: {
    'text-field': ['get', 'index'],
    'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
    'text-anchor': 'center',
    'text-size': ['*', ['coalesce', ['get', 'text-size'], 12], zoomScale],
    'text-allow-overlap': true,
  },
}

export const LAYER_LIST: SortLayer[] = [
  {
    layer: POINT_INDEX_LAYER,
    // zIndex: TEXT_Z_INDEX,
    zIndex: 11,
  },
]
