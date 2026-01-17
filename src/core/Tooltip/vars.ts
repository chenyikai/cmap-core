import type { LayerSpecification } from 'mapbox-gl'

export const CONNECT_LINE_LAYER_NAME = 'mapbox-gl-tooltip-connect-line'

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
