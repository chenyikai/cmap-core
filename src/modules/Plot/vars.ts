import type { GeoJSONSourceSpecification } from 'mapbox-gl'

export const PLOT_SOURCE_NAME = 'mapbox-gl-plot-source'

export const EMPTY_SOURCE: GeoJSONSourceSpecification = {
  type: 'geojson',
  // dynamic: true,
  data: {
    type: 'FeatureCollection',
    features: [],
  },
  buffer: 256,
  tolerance: 0.2,
  lineMetrics: true,
}

export enum CURSOR {
  CREATE = 'crosshair',
  CLICK = 'pointer',
  MOVE = 'move',
  EMPTY = '',
}

export enum Event {
  CREATE = 'create',
  BEFORE_UPDATE = 'update.before',
  UPDATE = 'update.execute',
  DONE_UPDATE = 'update.done',
  MID_BEFORE_UPDATE = 'mid.update.before',
  MID_UPDATE = 'mid.update.execute',
  MID_DONE_UPDATE = 'mid.update.done',
  HOVER = 'hover',
  UN_HOVER = 'unhover',
  CLICK = 'click',
  DBL_CLICK = 'dblclick',
}

export enum Meta {
  Line = 'Line',
  LINE_TITLE = 'lineTitle',
}
