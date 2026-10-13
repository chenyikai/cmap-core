import type * as GeoJSON from 'geojson'
import type { LayerSpecification, Map as MapboxGlMap, Source, SourceSpecification } from 'mapbox-gl'

export interface SortLayer {
  zIndex: number
  layer: LayerSpecification
}

/** 检查 id 是否有效（非 null/undefined） */
function isValidId(id: unknown): id is string | number {
  return id !== null && id !== undefined
}

/** GeoJSON Source 类型，包含 setData 方法 */
interface GeoJSONSource {
  type: 'geojson'
  setData(data: GeoJSON.GeoJSON): void
}

class ResourceRegister {
  private map: MapboxGlMap
  // Preserve insertion order while allowing O(1) upsert/delete, including bulk ship removal.
  private sourceFeatures = new Map<string, Map<string, GeoJSON.Feature>>()
  private dirtySourceIds = new Set<string>()
  private renderFrameId: number | null = null
  private layerList: SortLayer[] = []
  private destroyed = false
  /** 记录由此类创建的 source id */
  private managedSourceIds = new Set<string>()
  /** 记录由此类创建的 layer id */
  private managedLayerIds = new Set<string>()

  constructor(map: MapboxGlMap) {
    this.map = map
    map.once('remove', this.onMapRemove)
  }

  private readonly onMapRemove = (): void => {
    this.destroy()
  }

  private checkDestroyed(): void {
    if (this.destroyed) {
      console.warn('[ResourceRegister] Instance has been destroyed')
    }
  }

  /**
   * 幂等地添加 Source
   */
  public addSource(id: string, source: SourceSpecification): void {
    this.checkDestroyed()
    if (!this.map.getSource(id)) {
      const finalSource: SourceSpecification =
        source.type === 'geojson' && !source.promoteId
          ? { ...source, promoteId: 'id' }
          : { ...source }
      this.map.addSource(id, finalSource)
      this.managedSourceIds.add(id)
    }
  }

  /**
   * 幂等地添加 Layer
   */
  public addLayer(sortLayer: SortLayer): void {
    this.checkDestroyed()
    const { layer, zIndex } = sortLayer

    if (!this.map.getLayer(layer.id)) {
      const i = this.layerList.findIndex((item) => item.zIndex > zIndex)
      if (i === -1) {
        this.map.addLayer(layer)
        this.layerList.push({ zIndex, layer })
      } else {
        const beforeLayer = this.layerList[i].layer
        this.map.addLayer(layer, beforeLayer.id)
        this.layerList.splice(i, 0, { layer, zIndex })
      }
      this.managedLayerIds.add(layer.id)
    }
  }

  /**
   * 移除 Layer
   */
  public removeLayer(layerId: string): void {
    this.checkDestroyed()
    if (this.map.getLayer(layerId)) {
      this.map.removeLayer(layerId)
    }
    const index = this.layerList.findIndex((item) => item.layer.id === layerId)
    if (index > -1) {
      this.layerList.splice(index, 1)
    }
    this.managedLayerIds.delete(layerId)
  }

  /**
   * 移除 Source（会先移除关联的 Layer）
   */
  public removeSource(sourceId: string): void {
    this.checkDestroyed()
    // 移除使用该 source 的 layer
    const layersToRemove = this.layerList.filter(
      (item) => 'source' in item.layer && item.layer.source === sourceId,
    )
    layersToRemove.forEach((item) => {
      this.removeLayer(item.layer.id)
    })

    if (this.map.getSource(sourceId)) {
      this.map.removeSource(sourceId)
    }
    this.sourceFeatures.delete(sourceId)
    this.dirtySourceIds.delete(sourceId)
    this.managedSourceIds.delete(sourceId)
  }

  public findFeature(source: string, featureId: string): GeoJSON.Feature | undefined {
    return this.sourceFeatures.get(source)?.get(featureId)
  }

  /**
   * 获取 Source
   */
  public getSource(id: string): Source | undefined {
    return this.map.getSource(id)
  }

  /**
   * 核心逻辑：更新内存数据 -> 标记为脏 -> 调度渲染
   * 支持增、删、改
   */
  public setGeoJSONData(
    id: string,
    data: GeoJSON.Feature<GeoJSON.Geometry | null> | GeoJSON.Feature<GeoJSON.Geometry | null>[],
  ): void {
    if (this.destroyed) return
    const inputFeatures = Array.isArray(data) ? data : [data]

    let collection = this.sourceFeatures.get(id)
    if (!collection) {
      collection = new Map()
      this.sourceFeatures.set(id, collection)
    }

    let changed = false
    for (const newFeature of inputFeatures) {
      if (!isValidId(newFeature.id)) continue

      const key = String(newFeature.id)

      // === 删除逻辑 (Geometry 为 null) ===
      if (newFeature.geometry === null) {
        if (collection.delete(key)) changed = true
      } else {
        collection.set(key, newFeature as GeoJSON.Feature)
        changed = true
      }
    }

    if (changed) {
      this.dirtySourceIds.add(id)
      this.scheduleRender()
    }
  }

  /**
   * 调度器：利用 requestAnimationFrame 防抖
   */
  private scheduleRender(): void {
    if (this.renderFrameId !== null) return

    this.renderFrameId = requestAnimationFrame(() => {
      this.flushUpdates()
      this.renderFrameId = null
    })
  }

  /**
   * 执行器：真正调用 Mapbox API
   */
  private flushUpdates(): void {
    if (this.destroyed) return

    this.dirtySourceIds.forEach((id) => {
      try {
        const source = this.getSource(id)
        const collection = this.sourceFeatures.get(id)

        if (source?.type === 'geojson' && collection) {
          ;(source as GeoJSONSource).setData({
            type: 'FeatureCollection',
            features: [...collection.values()],
          })
        }
      } catch (e) {
        console.warn(`[ResourceRegister] Failed to update source "${id}":`, e)
      }
    })

    this.dirtySourceIds.clear()
  }

  public setState(source: string, id: string, states: Record<string, unknown>): void {
    this.checkDestroyed()
    if (!this.map.getSource(source)) {
      console.warn(`[ResourceRegister] Source "${source}" not found`)
      return
    }
    this.map.setFeatureState(
      {
        source,
        id,
      },
      states,
    )
  }

  public getState(source: string, id: string): Record<string, unknown> | null | undefined {
    this.checkDestroyed()
    if (!this.map.getSource(source)) {
      return null
    }
    return this.map.getFeatureState({
      source,
      id,
    })
  }

  /**
   * 销毁清理
   * @param removeFromMap 是否从地图上移除由此类管理的 Source 和 Layer，默认 false
   */
  public destroy(removeFromMap = false): void {
    if (this.destroyed) return
    this.destroyed = true
    this.map.off('remove', this.onMapRemove)

    if (this.renderFrameId !== null) {
      cancelAnimationFrame(this.renderFrameId)
      this.renderFrameId = null
    }

    if (removeFromMap) {
      // 移除由此类管理的 layer
      for (const layerId of this.managedLayerIds) {
        if (this.map.getLayer(layerId)) {
          this.map.removeLayer(layerId)
        }
      }
      // 移除由此类管理的 source
      for (const sourceId of this.managedSourceIds) {
        if (this.map.getSource(sourceId)) {
          this.map.removeSource(sourceId)
        }
      }
    }

    this.layerList = []
    this.sourceFeatures.clear()
    this.dirtySourceIds.clear()
    this.managedSourceIds.clear()
    this.managedLayerIds.clear()
  }
}

export default ResourceRegister
