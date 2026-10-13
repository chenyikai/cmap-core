import type * as GeoJSON from 'geojson'
import type {
  GeoJSONSource,
  LayerSpecification,
  Map as MapboxGlMap,
  Source,
  SourceSpecification,
} from 'mapbox-gl'

import { GeoJSONStore } from './GeoJSONStore'
import { activeStores } from './snapshot'

export interface SortLayer {
  zIndex: number
  layer: LayerSpecification
}

// Focus, Ship and Plot can use different registers on the same map.
// Retain ordering metadata for layers left on the map by destroy(false).
const mapLayers = new WeakMap<MapboxGlMap, Map<string, SortLayer>>()

class ResourceRegister {
  private readonly map: MapboxGlMap
  private readonly sourceFeatures = new Map<string, GeoJSONStore>()
  private readonly dirtySourceIds = new Set<string>()
  private readonly layers: Map<string, SortLayer>
  private renderFrameId: number | null = null
  private flushing = false
  private destroyed = false
  private mapRemoved = false
  private readonly managedSourceIds = new Set<string>()
  private readonly managedLayerIds = new Set<string>()

  constructor(map: MapboxGlMap) {
    this.map = map
    let layers = mapLayers.get(map)
    if (!layers) {
      layers = new Map()
      mapLayers.set(map, layers)
    }
    this.layers = layers
    let stores = activeStores.get(map)
    if (!stores) {
      stores = new Set()
      activeStores.set(map, stores)
    }
    stores.add(this.sourceFeatures)
    map.once('remove', this.onMapRemove)
    map.on('styledata', this.onReady)
    map.on('style.load', this.onReady)
    map.on('sourcedata', this.onReady)
    map.on('error', this.onSourceError)
  }

  private readonly onMapRemove = (): void => {
    // Mapbox has already destroyed its style when it fires remove: no source/layer API calls.
    this.mapRemoved = true
    this.layers.clear()
    mapLayers.delete(this.map)
    this.destroy()
  }

  private readonly onReady = (event: { type: string; sourceId?: string }): void => {
    if (this.destroyed || this.flushing) return
    if (event.sourceId && this.sourceFeatures.get(event.sourceId)?.state?.requiresFull) {
      this.dirtySourceIds.add(event.sourceId)
    }
    if (event.sourceId && !this.dirtySourceIds.has(event.sourceId)) return
    this.scheduleRender()
  }

  private readonly onSourceError = (event: { type: string; sourceId?: string }): void => {
    if (this.destroyed || !event.sourceId) return
    const store = this.sourceFeatures.get(event.sourceId)
    if (!store?.state) return
    const retry = store.state.recover()
    this.dirtySourceIds.add(event.sourceId)
    if (retry) this.scheduleRender()
  }

  // Mapbox calls synchronously dispatch user events, which can destroy this instance.
  private isDestroyed(): boolean {
    return this.destroyed
  }

  /** 幂等地添加 Source；已有 Source 的运行时数据优先，不覆盖调用方的数据。 */
  public addSource(id: string, source: SourceSpecification): void {
    if (this.destroyed) return
    if (!this.map.getSource(id)) {
      const finalSource: SourceSpecification =
        source.type === 'geojson' && !source.promoteId
          ? { ...source, promoteId: 'id' }
          : { ...source }
      this.map.addSource(id, finalSource)
      if (this.isDestroyed()) return
      // Validation can fail via an error event without throwing.
      if (this.map.getSource(id)) this.managedSourceIds.add(id)
    }
    if (this.map.getSource(id)?.type === 'geojson') this.syncStore(id)
    if (this.dirtySourceIds.has(id)) this.scheduleRender()
  }

  /** 幂等地添加 Layer；同一地图、同一 slot 内按 zIndex 稳定排序。 */
  public addLayer({ layer, zIndex }: SortLayer): void {
    if (this.destroyed || this.map.getLayer(layer.id)) return
    const before = [...this.layers.values()]
      .filter((item) => item.layer.id !== layer.id && item.zIndex > zIndex)
      .sort((a, b) => a.zIndex - b.zIndex)
      .find((item) => {
        const existing = this.map.getLayer(item.layer.id)
        return existing && existing.slot === layer.slot
      })
    this.map.addLayer(layer, before?.layer.id)
    if (!this.isDestroyed() && this.map.getLayer(layer.id)) {
      // Recreated layers have a new insertion order, even if an old ID is reused.
      this.layers.delete(layer.id)
      this.layers.set(layer.id, { layer, zIndex })
      this.managedLayerIds.add(layer.id)
    }
  }

  public removeLayer(layerId: string): void {
    if (this.destroyed) return
    this.removeMapLayer(layerId)
  }

  private removeMapLayer(layerId: string): void {
    if (this.map.getLayer(layerId)) this.map.removeLayer(layerId)
    if (this.mapRemoved) return
    if (this.map.getLayer(layerId)) return
    this.layers.delete(layerId)
    this.managedLayerIds.delete(layerId)
  }

  /** 移除 Source 及本实例创建的关联 Layer；外部依赖导致移除失败时保留缓存。 */
  public removeSource(sourceId: string): void {
    if (this.destroyed) return
    for (const layerId of this.managedLayerIds) {
      const layer = this.map.getLayer(layerId)
      if (layer && 'source' in layer && layer.source === sourceId) this.removeLayer(layerId)
    }
    if (this.isDestroyed()) return
    if (this.map.getSource(sourceId)) this.map.removeSource(sourceId)
    if (this.isDestroyed() || this.map.getSource(sourceId)) return
    this.sourceFeatures.delete(sourceId)
    this.dirtySourceIds.delete(sourceId)
    this.managedSourceIds.delete(sourceId)
    if (this.dirtySourceIds.size === 0) this.cancelRender()
  }

  public findFeature(source: string, featureId: string): GeoJSON.Feature | undefined {
    if (this.destroyed) return undefined
    return this.syncStore(source).features.get(featureId)
  }

  public getSource(id: string): Source | undefined {
    return this.destroyed ? undefined : this.map.getSource(id)
  }

  private syncStore(id: string): GeoJSONStore {
    let store = this.sourceFeatures.get(id)
    if (!store) {
      store = new GeoJSONStore()
      this.sourceFeatures.set(id, store)
    }
    const source = this.map.getSource(id)
    store.sync(source?.type === 'geojson' ? source : undefined)
    return store
  }

  /**
   * 按 feature.id 增改，geometry:null 删除；数字/字符串形式的同一 ID 视为相同要素。
   * 初始无 ID 要素会保留，但不能按 ID 更新。promoteId 的现有配置不变。
   * 支持增量的动态源按帧提交差量，其他源保留完整快照提交。
   * URL Source 无法同步取得完整数据；增量暂存，直到 Source 提供内联 GeoJSON。
   */
  public setGeoJSONData(
    id: string,
    data: GeoJSON.Feature<GeoJSON.Geometry | null> | GeoJSON.Feature<GeoJSON.Geometry | null>[],
  ): void {
    if (this.destroyed) return
    const store = this.syncStore(id)
    let changed = false
    for (const feature of Array.isArray(data) ? data : [data]) {
      if (store.upsert(feature)) changed = true
    }
    if (changed) {
      this.dirtySourceIds.add(id)
      this.scheduleRender()
    }
  }

  private scheduleRender(): void {
    if (this.destroyed || this.renderFrameId !== null || this.dirtySourceIds.size === 0) return
    this.renderFrameId = requestAnimationFrame(() => {
      this.renderFrameId = null
      this.flushUpdates()
    })
  }

  private cancelRender(): void {
    if (this.renderFrameId === null) return
    cancelAnimationFrame(this.renderFrameId)
    this.renderFrameId = null
  }

  private flushUpdates(): void {
    if (this.destroyed) return
    // Only consume this batch. setData events can enqueue edits for the next frame.
    const batch = [...this.dirtySourceIds]
    this.dirtySourceIds.clear()
    this.flushing = true
    try {
      for (const id of batch) {
        if (this.isDestroyed()) break
        const store = this.sourceFeatures.get(id)
        if (!store || (store.pending.size === 0 && !store.state?.requiresFull)) continue
        let changes: GeoJSONStore['pending'] | undefined
        let incremental = false
        try {
          this.syncStore(id)
          const source = this.map.getSource<GeoJSONSource>(id)
          if (source?.type !== 'geojson' || !store.readable) {
            this.dirtySourceIds.add(id)
            if (source?.type === 'geojson' && !store.warnedURL) {
              console.warn(
                `[ResourceRegister] Source "${id}" has URL data; updates are queued until a complete inline GeoJSON snapshot is available`,
              )
              store.warnedURL = true
            }
            continue
          }
          const state = store.state!
          // Mapbox coalesces using the in-flight request's append flag. Never mix a delta
          // into an unfinished initial/full load, or a full replacement into an append.
          if (state.options.dynamic && !source.loaded()) {
            this.dirtySourceIds.add(id)
            continue
          }
          incremental = state.canUpdate(source)
          const data = incremental
            ? state.delta([...store.pending.values()].map((patch) => patch.feature))
            : store.snapshot()
          if (incremental && data.features.length === 0) {
            store.takePending()
            store.invalidate()
            continue
          }
          changes = store.takePending()
          if (incremental) source.updateData(data)
          else source.setData(data)
        } catch (error) {
          if (!this.isDestroyed() && this.sourceFeatures.get(id) === store) {
            if (changes) store.restorePending(changes)
            if (incremental) store.state?.recover()
            this.dirtySourceIds.add(id)
            if (incremental && this.map.getSource<GeoJSONSource>(id)?.loaded())
              this.scheduleRender()
          }
          console.warn(`[ResourceRegister] Failed to update source "${id}":`, error)
        }
      }
    } finally {
      this.flushing = false
    }
    // Missing/failed sources wait for a readiness event or a new write, not a busy rAF loop.
  }

  public setState(source: string, id: string, states: Record<string, unknown>): void {
    if (this.destroyed) return
    if (!this.map.getSource(source)) {
      console.warn(`[ResourceRegister] Source "${source}" not found`)
      return
    }
    this.map.setFeatureState({ source, id }, states)
  }

  public getState(source: string, id: string): Record<string, unknown> | null | undefined {
    if (this.destroyed || !this.map.getSource(source)) return null
    return this.map.getFeatureState({ source, id })
  }

  /** 默认只释放本实例；true 额外移除本实例创建的资源，不移除外部关联图层。 */
  public destroy(removeFromMap = false): void {
    if (this.destroyed) return
    this.destroyed = true
    this.map.off('styledata', this.onReady)
    this.map.off('style.load', this.onReady)
    this.map.off('sourcedata', this.onReady)
    this.map.off('error', this.onSourceError)
    this.cancelRender()
    if (removeFromMap) {
      for (const layerId of this.managedLayerIds) {
        if (this.mapRemoved) break
        try {
          this.removeMapLayer(layerId)
        } catch (error) {
          console.warn(`[ResourceRegister] Failed to remove layer "${layerId}":`, error)
        }
      }
      for (const sourceId of this.managedSourceIds) {
        if (this.mapRemoved) break
        try {
          if (this.map.getSource(sourceId)) this.map.removeSource(sourceId)
          // Removal can synchronously dispatch an event that removes the entire map.
          if (!this.wasMapRemoved() && this.map.getSource(sourceId))
            console.warn(`[ResourceRegister] Source "${sourceId}" is still in use and was retained`)
        } catch (error) {
          console.warn(`[ResourceRegister] Failed to remove source "${sourceId}":`, error)
        }
      }
    }
    this.map.off('remove', this.onMapRemove)
    this.sourceFeatures.clear()
    this.dirtySourceIds.clear()
    const stores = activeStores.get(this.map)
    stores?.delete(this.sourceFeatures)
    if (stores?.size === 0) activeStores.delete(this.map)
    this.managedSourceIds.clear()
    this.managedLayerIds.clear()
  }

  private wasMapRemoved(): boolean {
    return this.mapRemoved
  }
}

export default ResourceRegister
