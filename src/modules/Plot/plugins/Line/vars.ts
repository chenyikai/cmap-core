import type { LayerSpecification } from 'mapbox-gl'

import { PLOT_SOURCE_NAME } from '@/modules/Plot/vars.ts'
import { PlotType } from '@/types/Plot/Poi.ts'

export const NAME = PlotType.LINE

export const LINE_LAYER_NAME = 'mapbox-gl-plot-line-layer'

export const DEFAULT_LINE_COLOR = '#f00'

export const DEFAULT_LINE_WIDTH = 3

export const LINE_LAYER: LayerSpecification = {
  id: LINE_LAYER_NAME,
  type: 'line',
  filter: ['all', ['==', '$type', 'LineString']],
  source: PLOT_SOURCE_NAME,
  paint: {
    'line-color': ['coalesce', ['get', 'line-color'], DEFAULT_LINE_COLOR],
    'line-width': ['coalesce', ['get', 'line-width'], DEFAULT_LINE_WIDTH],
  },
  layout: {},
}

export const LAYER_LIST: LayerSpecification[] = [LINE_LAYER]
