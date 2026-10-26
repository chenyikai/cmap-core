import type * as GeoJSON from 'geojson'
import type { GeoJSONSource } from 'mapbox-gl'

import { type Feature, GeoJSONSourceState, isValidId } from './GeoJSONSourceState'

let sequence = 0
export interface FeaturePatch {
  feature: Feature
  sequence: number
}

/** A source snapshot plus uncommitted ID-based edits. Anonymous baseline features are retained. */
export class GeoJSONStore {
  readonly features = new Map<string | symbol, GeoJSON.Feature>()
  pending = new Map<string, FeaturePatch>()
  readable = false
  warnedURL = false
  private source?: GeoJSONSource
  state?: GeoJSONSourceState
  private version = -1

  invalidate(): void {
    this.version = -1
  }

  sync(source?: GeoJSONSource): void {
    if (!source) {
      this.readable = false
      return
    }
    const state = GeoJSONSourceState.get(source)
    if (source === this.source && state.version === this.version && this.readable) return
    this.source = source
    this.state = state
    this.version = state.version
    // Mapbox keeps URLs as URLs; querySourceFeatures is only a tiled/viewport subset.
    // Never use that subset (or an empty cache) to overwrite a URL-backed source.
    this.readable = state.readable
    if (!state.readable) return
    this.warnedURL = false
    this.features.clear()
    for (const [key, feature] of state.features) this.features.set(key, feature)
    for (const [key, patch] of this.pending) this.apply(key, patch.feature)
  }

  upsert(feature: Feature): boolean {
    if (!isValidId(feature.id)) return false
    const key = String(feature.id)
    // A delete against an unknown baseline must survive until the source is available.
    if (feature.geometry === null && this.readable && !this.features.has(key)) return false
    this.apply(key, feature)
    this.pending.set(key, { feature, sequence: ++sequence })
    return true
  }

  private apply(key: string, feature: Feature): void {
    if (feature.geometry === null) this.features.delete(key)
    else this.features.set(key, feature as GeoJSON.Feature)
  }

  snapshot(): GeoJSON.FeatureCollection {
    return { type: 'FeatureCollection', features: [...this.features.values()] }
  }

  /** Called before setData, whose synchronous events may enqueue a new batch. */
  takePending(): Map<string, FeaturePatch> {
    const batch = this.pending
    this.pending = new Map()
    // The source wrapper updates its version before dispatching synchronous Mapbox events.
    this.version = (this.state?.version ?? 0) + 1
    return batch
  }

  restorePending(batch: Map<string, FeaturePatch>): void {
    this.pending = new Map([...batch, ...this.pending])
    this.invalidate()
  }
}
