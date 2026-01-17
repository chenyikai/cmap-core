import type { LayerSpecification } from 'mapbox-gl'

export const NAME = 'Ais'

export const SHIP_SOURCE_NAME = 'mapbox-gl-ship-source'

export const SHIP_ICON_LAYER_NAME = 'mapbox-gl-ship-icon-layer'

export const SHIP_REAL_LAYER_NAME = 'mapbox-gl-ship-real-layer'

export const SHIP_REAL_OUTLINE_LAYER_NAME = 'mapbox-gl-ship-real-outline-layer'

export const SHIP_ICON_LAYER: LayerSpecification = {
  id: SHIP_ICON_LAYER_NAME,
  source: SHIP_SOURCE_NAME,
  filter: ['==', '$type', 'Point'],
  type: 'symbol',
  layout: {
    'icon-allow-overlap': true,
    'icon-image': ['get', 'icon'],
    'icon-rotate': ['get', 'direction'],
    'icon-size': ['interpolate', ['linear'], ['zoom'], 0, 0.2, 19, 0.5],
  },
}

export const SHIP_REAL_LAYER: LayerSpecification = {
  id: SHIP_REAL_LAYER_NAME,
  source: SHIP_SOURCE_NAME,
  type: 'fill',
  layout: {},
  paint: {
    'fill-color': '#0f0',
  },
}

export const SHIP_REAL_OUTLINE_LAYER: LayerSpecification = {
  id: SHIP_REAL_OUTLINE_LAYER_NAME,
  source: SHIP_SOURCE_NAME,
  type: 'line',
  layout: {},
  paint: {
    'line-color': ['case', ['boolean', ['feature-state', 'hover'], false], '#f00', '#000'],
    'line-width': 2,
  },
}

export const LAYER_LIST: LayerSpecification[] = [
  SHIP_ICON_LAYER,
  SHIP_REAL_LAYER,
  SHIP_REAL_OUTLINE_LAYER,
]

export const SHIP_ICON = [
  {
    name: NAME + '-static',
    url: new URL('./images/AisShip/icon-static.png', import.meta.url).href,
  },
  {
    name: NAME + '-static-active',
    url: new URL('./images/AisShip/icon-static-active.png', import.meta.url).href,
  },
  {
    name: NAME + '-straight',
    url: new URL('./images/AisShip/icon-straight.png', import.meta.url).href,
  },
  {
    name: NAME + '-straight-active',
    url: new URL('./images/AisShip/icon-straight-active.png', import.meta.url).href,
  },
  {
    name: NAME + '-left',
    url: new URL('./images/AisShip/icon-left.png', import.meta.url).href,
  },
  {
    name: NAME + '-left-active',
    url: new URL('./images/AisShip/icon-left-active.png', import.meta.url).href,
  },
  {
    name: NAME + '-right',
    url: new URL('./images/AisShip/icon-right.png', import.meta.url).href,
  },
  {
    name: NAME + '-right-active',
    url: new URL('./images/AisShip/icon-right-active.png', import.meta.url).href,
  },
]
