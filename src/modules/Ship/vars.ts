import type { LayerSpecification } from 'mapbox-gl'

import type { SvgIcon } from '@/types/IconManager'

export const NAME = 'Ais'

export const SHIP_SOURCE_NAME = 'mapbox-gl-ship-source'

export const SHIP_ICON_LAYER_NAME = 'mapbox-gl-ship-icon-layer'

export const SHIP_ICON_DIRECTION_LAYER_NAME = 'mapbox-gl-ship-icon-direction-layer'

export const SHIP_REAL_LAYER_NAME = 'mapbox-gl-ship-real-layer'

export const SHIP_REAL_OUTLINE_LAYER_NAME = 'mapbox-gl-ship-real-outline-layer'

export const MIN_ICON_SIZE = 0.2

export const MAX_ICON_SIZE = 0.5

export enum UPDATE_STATUS {
  ONLINE = 'Online',
  DELAY = 'Delay',
  OFFLINE = 'Offline',
}

export enum SHIP_COLOR {
  ONLINE = '#03CC02',
  DELAY = '#FFFD6C',
  OFFLINE = '#999999',
}

export const SHIP_ICON_DIRECTION_LAYER: LayerSpecification = {
  id: SHIP_ICON_DIRECTION_LAYER_NAME,
  source: SHIP_SOURCE_NAME,
  filter: ['==', ['get', 'meta'], 'directionLine'],
  type: 'line',
  layout: {},
  paint: {
    'line-color': [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      '#f00',
      ['boolean', ['feature-state', 'focus'], false],
      '#f00',
      '#000',
    ],
    'line-width': 1,
  },
}

export const SHIP_ICON_LAYER: LayerSpecification = {
  id: SHIP_ICON_LAYER_NAME,
  source: SHIP_SOURCE_NAME,
  filter: ['==', '$type', 'Point'],
  type: 'symbol',
  layout: {
    'icon-allow-overlap': true,
    'icon-image': ['get', 'icon'],
    'icon-rotate': ['get', 'direction'],
    'icon-size': [
      'interpolate',
      ['linear'],
      ['zoom'],
      0,
      ['coalesce', ['get', 'minIconSize'], 0.2],
      19,
      ['coalesce', ['get', 'maxIconSize'], 0.5],
    ],
  },
}

export const SHIP_REAL_LAYER: LayerSpecification = {
  id: SHIP_REAL_LAYER_NAME,
  source: SHIP_SOURCE_NAME,
  type: 'fill',
  filter: ['!=', ['get', 'meta'], 'directionLine'],
  layout: {},
  paint: {
    'fill-color': [
      'case',
      ['==', ['get', 'updateStatus'], UPDATE_STATUS.ONLINE],
      SHIP_COLOR.ONLINE,
      ['==', ['get', 'updateStatus'], UPDATE_STATUS.DELAY],
      SHIP_COLOR.DELAY,
      ['==', ['get', 'updateStatus'], UPDATE_STATUS.OFFLINE],
      SHIP_COLOR.OFFLINE,
      SHIP_COLOR.OFFLINE,
    ],
  },
}

export const SHIP_REAL_OUTLINE_LAYER: LayerSpecification = {
  id: SHIP_REAL_OUTLINE_LAYER_NAME,
  source: SHIP_SOURCE_NAME,
  type: 'line',
  filter: ['!=', ['get', 'meta'], 'directionLine'],
  layout: {},
  paint: {
    'line-color': [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      '#f00',
      ['boolean', ['feature-state', 'focus'], false],
      '#f00',
      '#000',
    ],
    'line-width': 2,
  },
}

export const LAYER_LIST: LayerSpecification[] = [
  SHIP_ICON_DIRECTION_LAYER,
  SHIP_ICON_LAYER,
  SHIP_REAL_LAYER,
  SHIP_REAL_OUTLINE_LAYER,
]

export const SHIP_ICON: SvgIcon[] = [
  {
    name: `${NAME}-$color`,
    svg:
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<svg width="33px" height="49px" viewBox="0 0 33 49" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">\n' +
      '    <title>delay_nospeed</title>\n' +
      '    <g id="页面-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">\n' +
      '        <g id="delay_nospeed" fill="$color" stroke="#000000" stroke-width="2">\n' +
      '            <path d="M16.5,3.13354433 L31.6080922,48 L1.39190779,48 L16.5,3.13354433 Z" id="三角形"></path>\n' +
      '        </g>\n' +
      '    </g>\n' +
      '</svg>',
  },
  {
    name: `${NAME}-$color-active`,
    svg:
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<svg width="33px" height="49px" viewBox="0 0 33 49" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">\n' +
      '    <title>delay_nospeed_select</title>\n' +
      '    <g id="页面-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">\n' +
      '        <g id="delay_nospeed_select" fill="$color" stroke="#FF0000" stroke-width="2">\n' +
      '            <path d="M16.5,3.13354433 L31.6080922,48 L1.39190779,48 L16.5,3.13354433 Z" id="三角形"></path>\n' +
      '        </g>\n' +
      '    </g>\n' +
      '</svg>',
  },
]
