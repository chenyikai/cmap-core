import type * as GeoJSON from 'geojson'
import type { GeoJSONSource, Map as MapboxMap } from 'mapbox-gl'

import { featureList, GeoJSONSourceState, isValidId } from './GeoJSONSourceState'
import type { GeoJSONStore } from './GeoJSONStore'

export const activeStores = new WeakMap<MapboxMap, Set<Map<string, GeoJSONStore>>>()

/** Internal full snapshot for CMap.change, including edits queued before the next animation frame. */
export function getSourceSnapshot(
  map: MapboxMap,
  id: string,
  fallback?: GeoJSON.GeoJSON | string,
): GeoJSON.GeoJSON | string | undefined {
  return captureSourceSnapshot(map, id, fallback).data
}

export function captureSourceSnapshot(
  map: MapboxMap,
  id: string,
  fallback?: GeoJSON.GeoJSON | string,
): { data: GeoJSON.GeoJSON | string | undefined; acknowledge(): void } {
  const source = map.getSource<GeoJSONSource>(id)
  const data = source?.type === 'geojson' ? GeoJSONSourceState.get(source).snapshot() : fallback
  if (typeof data !== 'object')
    return {
      data,
      acknowledge: (): void => {
        /* URL baselines cannot acknowledge partial edits. */
      },
    }
  const features = new Map(
    featureList(data).map((feature) => [
      isValidId(feature.id) ? String(feature.id) : Symbol(),
      feature,
    ]),
  )
  const captured = [...(activeStores.get(map) ?? [])].flatMap((stores) => {
    const store = stores.get(id)
    return store ? [{ store, patches: new Map(store.pending) }] : []
  })
  const pending = captured
    .flatMap(({ patches }) => [...patches.values()])
    .sort((a, b) => a.sequence - b.sequence)
  for (const { feature } of pending) {
    const key = String(feature.id)
    if (feature.geometry === null) features.delete(key)
    else features.set(key, feature as GeoJSON.Feature)
  }
  return {
    data: { type: 'FeatureCollection', features: [...features.values()] },
    acknowledge(): void {
      // Only edits included in this restored snapshot were consumed. Writes made by
      // synchronous addSource events must stay queued for the following frame.
      for (const { store, patches } of captured) {
        for (const [key, patch] of patches) {
          if (store.pending.get(key) === patch) store.pending.delete(key)
        }
        store.invalidate()
      }
    },
  }
}
