import type { GeoJSONSourceSpecification } from 'mapbox-gl'

export const PLOT_SOURCE_NAME = 'mapbox-gl-plot-source'

export const EMPTY_SOURCE: GeoJSONSourceSpecification = {
  type: 'geojson',
  dynamic: true,
  data: {
    type: 'FeatureCollection',
    features: [],
  },
}
