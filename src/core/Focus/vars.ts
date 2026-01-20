import type { LayerSpecification } from 'mapbox-gl'

/** ------------------------------------------------ 聚焦图层 --------------------------------------------------------**/

export const FOCUS_SOURCE_NAME = 'mapbox-gl-focus-source'

export const FOCUS_LAYER_NAME = 'mapbox-gl-focus-layer'

export const FOCUS_LAYER: LayerSpecification = {
  id: FOCUS_LAYER_NAME,
  type: 'line',
  source: FOCUS_SOURCE_NAME,
  paint: {
    'line-color': '#f00',
    'line-width': 3,
  },
  layout: {},
}
