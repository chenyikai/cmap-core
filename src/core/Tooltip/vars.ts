import type { LayerSpecification } from 'mapbox-gl'

export const CONNECT_LINE_LAYER_NAME = 'mapbox-gl-tooltip-connect-line'

export const CONNECT_DEBUG_LINE_LAYER_NAME = 'mapbox-gl-tooltip-connect-debug-line'

export const CONNECT_DEBUG_FILL_LAYER_NAME = 'mapbox-gl-tooltip-connect-debug-fill'

export const TOOLTIP_SOURCE_NAME = 'mapbox-gl-tooltip-source'

export const CONNECT_LINE_LAYER: LayerSpecification = {
  id: CONNECT_LINE_LAYER_NAME,
  source: TOOLTIP_SOURCE_NAME,
  type: 'line',
  paint: {
    'line-color': '#000',
    'line-width': 1,
  },
}

export const CONNECT_DEBUG_LINE_LAYER: LayerSpecification = {
  id: CONNECT_DEBUG_LINE_LAYER_NAME,
  source: TOOLTIP_SOURCE_NAME,
  type: 'line',
  filter: ['all', ['==', 'meta', 'debug']],
  paint: {
    'line-color': '#f00',
    'line-width': 1,
  },
}

export const CONNECT_DEBUG_FILL_LAYER: LayerSpecification = {
  id: CONNECT_DEBUG_FILL_LAYER_NAME,
  source: TOOLTIP_SOURCE_NAME,
  type: 'fill',
  filter: ['all', ['==', 'meta', 'debug']],
  paint: {
    'fill-color': '#f00',
    'fill-opacity': 0,
  },
}

export const LAYERS = [CONNECT_LINE_LAYER, CONNECT_DEBUG_FILL_LAYER, CONNECT_DEBUG_LINE_LAYER]
