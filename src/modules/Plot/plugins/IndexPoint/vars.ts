import type { LayerSpecification } from 'mapbox-gl'

import { PLOT_SOURCE_NAME } from '@/modules/Plot/vars.ts'
import { PlotType } from '@/types/Plot/Poi.ts'

export const NAME = PlotType.INDEX_POINT

export const POINT_INDEX_LAYER_NAME = 'mapbox-gl-plot-point-index-layer'

export const DEFAULT_TEXT_COLOR = '#333'

export const POINT_INDEX_LAYER: LayerSpecification = {
  id: POINT_INDEX_LAYER_NAME,
  type: 'symbol',
  filter: [
    'all',
    ['==', '$type', 'Point'],
    ['==', 'meta', 'circle'],
    ['==', 'subMeta', 'indexPoint'],
  ],
  source: PLOT_SOURCE_NAME,
  paint: {
    'text-color': ['coalesce', ['get', 'text-color'], DEFAULT_TEXT_COLOR],
  },
  layout: {
    'text-field': ['get', 'index'],
    'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
    'text-anchor': 'center',
    'text-size': ['coalesce', ['get', 'text-size'], 12],
    'text-allow-overlap': true,
  },
}

export const LAYER_LIST: LayerSpecification[] = [POINT_INDEX_LAYER]
