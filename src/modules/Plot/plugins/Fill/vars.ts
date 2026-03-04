import type { LayerSpecification } from 'mapbox-gl'

import type { SortLayer } from '@/core/ResourceRegister'
import { PLOT_SOURCE_NAME } from '@/modules/Plot/vars.ts'
import { PlotType } from '@/types/Plot/Poi.ts'

export const NAME = PlotType.Fill

export const Z_INDEX = 3

export const FILL_LAYER_NAME = 'mapbox-gl-plot-fill-layer'

export const DEFAULT_LINE_COLOR = '#f00'

export const DEFAULT_LINE_WIDTH = 3

export const FILL_LAYER: LayerSpecification = {
  id: FILL_LAYER_NAME,
  type: 'fill',
  filter: ['all', ['==', '$type', 'Polygon'], ['==', 'visibility', 'visible']],
  source: PLOT_SOURCE_NAME,
  paint: {
    'fill-color': '#f00',
    'fill-opacity': 0.3,
  },
  layout: {},
}

export const LAYER_LIST: SortLayer[] = [
  {
    layer: FILL_LAYER,
    zIndex: Z_INDEX,
  },
]
