import type * as GeoJSON from 'geojson'
import type { GeoJSONSource } from 'mapbox-gl'

export type Feature = GeoJSON.Feature<GeoJSON.Geometry | null>
export type FeatureKey = string | symbol

export function isValidId(id: unknown): id is string | number {
  return typeof id === 'string' || (typeof id === 'number' && Number.isFinite(id))
}

export function featureList(data: GeoJSON.GeoJSON): GeoJSON.Feature[] {
  if (data.type === 'FeatureCollection') return data.features
  if (data.type === 'Feature') return [data]
  return [{ type: 'Feature', properties: {}, geometry: data }]
}

const states = new WeakMap<GeoJSONSource, GeoJSONSourceState>()

/** Full source data independent of Mapbox's _data, which becomes a delta after updateData. */
export class GeoJSONSourceState {
  readonly features = new Map<FeatureKey, GeoJSON.Feature>()
  readonly options: ReturnType<GeoJSONSource['serialize']>
  version = 0
  readable = false
  requiresFull = false
  private unsupported = 0
  private incrementalDisabled = false
  private lastWasIncremental = false
  private rawData: ReturnType<GeoJSONSource['serialize']>['data']

  static get(source: GeoJSONSource): GeoJSONSourceState {
    let state = states.get(source)
    if (!state) {
      state = new GeoJSONSourceState(source)
      states.set(source, state)
    }
    return state
  }

  private constructor(source: GeoJSONSource) {
    this.options = source.serialize()
    this.replace(this.options.data)
    const setData = source.setData.bind(source)
    const updateData =
      typeof source.updateData === 'function' ? source.updateData.bind(source) : undefined
    // Observe public writes, including external setData during worker coalescing (no data event).
    // Methods/return values stay compatible; the wrappers live only as long as this Source.
    source.setData = (data): GeoJSONSource => {
      const mixedIntoAppend = !!this.options.dynamic && this.lastWasIncremental && !source.loaded()
      this.replace(data)
      this.lastWasIncremental = false
      // External full replacements may bypass the register's backpressure. Mapbox
      // coalesces them with append=true; replay a full replacement once it settles.
      this.requiresFull = mixedIntoAppend
      try {
        return setData(data)
      } catch (error) {
        this.requiresFull = true
        throw error
      }
    }
    if (typeof updateData === 'function') {
      source.updateData = (data): GeoJSONSource => {
        if (
          !this.options.dynamic ||
          typeof data === 'string' ||
          !['Feature', 'FeatureCollection'].includes(data.type)
        ) {
          return updateData(data)
        }
        this.append(data)
        this.lastWasIncremental = true
        try {
          return updateData(data)
        } catch (error) {
          this.recover()
          throw error
        }
      }
    }
  }

  private unsupportedFeature(feature: Feature): boolean {
    return !isValidId(feature.id) || feature.geometry?.type === 'GeometryCollection'
  }

  private put(key: FeatureKey, feature: GeoJSON.Feature): void {
    const previous = this.features.get(key)
    if (previous && this.unsupportedFeature(previous)) this.unsupported--
    this.features.set(key, feature)
    if (this.unsupportedFeature(feature)) this.unsupported++
  }

  private replace(data: typeof this.rawData): void {
    this.rawData = data
    this.readable = typeof data === 'object'
    this.features.clear()
    this.unsupported = 0
    if (typeof data === 'object') {
      for (const feature of featureList(data)) {
        this.put(isValidId(feature.id) ? String(feature.id) : Symbol(), feature)
      }
    }
    this.version++
  }

  private append(data: GeoJSON.GeoJSON): void {
    if (!this.readable) return
    for (const feature of featureList(data) as Feature[]) {
      const key = isValidId(feature.id) ? String(feature.id) : Symbol()
      if (feature.geometry === null) {
        const previous = this.features.get(key)
        if (previous && this.unsupportedFeature(previous)) this.unsupported--
        this.features.delete(key)
      } else this.put(key, feature as GeoJSON.Feature)
    }
    this.version++
  }

  canUpdate(source: GeoJSONSource): boolean {
    const spec = this.options
    return (
      !!spec.dynamic &&
      typeof source.updateData === 'function' &&
      this.readable &&
      !this.requiresFull &&
      !this.incrementalDisabled &&
      this.unsupported === 0 &&
      !spec.cluster &&
      !spec.lineMetrics &&
      !spec.generateId &&
      !spec.filter
    )
  }

  /** Normalize numeric/string ID aliases without leaving the old typed ID in Mapbox's index. */
  delta(features: Iterable<Feature>): GeoJSON.FeatureCollection {
    const result: GeoJSON.Feature[] = []
    for (const feature of features) {
      const previous = this.features.get(String(feature.id))
      // Insert-then-delete within one frame never reached the worker. Mapbox's dynamic
      // index can throw when asked to delete an unknown ID with cached tiles present.
      if (feature.geometry === null && !previous?.geometry) continue
      if (previous?.geometry && previous.id !== feature.id) {
        result.push({ ...previous, geometry: null } as Feature as GeoJSON.Feature)
        if (feature.geometry === null) continue
      }
      result.push(feature as GeoJSON.Feature)
    }
    return { type: 'FeatureCollection', features: result }
  }

  snapshot(): typeof this.rawData {
    return this.readable
      ? { type: 'FeatureCollection', features: [...this.features.values()] }
      : this.rawData
  }

  /** An incremental failure gets one full-data fallback; full-data failures do not busy-loop. */
  recover(): boolean {
    const retry = this.lastWasIncremental && !this.incrementalDisabled
    this.requiresFull = true
    this.incrementalDisabled = true
    return retry
  }
}
