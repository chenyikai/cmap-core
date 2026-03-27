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
  private sourceData = new Map<string, GeoJSON.FeatureCollection>()
  /** Feature 索引，key 为 `${sourceId}:${featureId}` */
  private featureIndex = new Map<string, number>()
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
    this.sourceData.delete(sourceId)
    this.managedSourceIds.delete(sourceId)
    // 清理该 source 相关的 feature 索引
    for (const key of this.featureIndex.keys()) {
      if (key.startsWith(`${sourceId}:`)) {
        this.featureIndex.delete(key)
      }
    }
  }

  public findFeature(source: string, featureId: string): GeoJSON.Feature | undefined {
    const data = this.sourceData.get(source)
    return data?.features.find((item) => item.id === featureId)
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
    this.checkDestroyed()
    const inputFeatures = Array.isArray(data) ? data : [data]

    let collection = this.sourceData.get(id)
    if (!collection) {
      collection = { type: 'FeatureCollection', features: [] }
      this.sourceData.set(id, collection)
    }

    inputFeatures.forEach((newFeature) => {
      if (!isValidId(newFeature.id)) return

      const indexKey = `${id}:${String(newFeature.id)}`
      const existingIndex = this.featureIndex.get(indexKey)

      // === 删除逻辑 (Geometry 为 null) ===
      if (newFeature.geometry === null) {
        if (existingIndex !== undefined) {
          collection.features.splice(existingIndex, 1)
          this.featureIndex.delete(indexKey)
          // 更新被删除元素之后的索引
          for (const [key, idx] of this.featureIndex.entries()) {
            if (key.startsWith(`${id}:`) && idx > existingIndex) {
              this.featureIndex.set(key, idx - 1)
            }
          }
        }
      } else {
        const feature = newFeature as GeoJSON.Feature
        if (existingIndex !== undefined) {
          // 替换旧数据
          collection.features[existingIndex] = feature
        } else {
          // 追加新数据
          const newIndex = collection.features.length
          collection.features.push(feature)
          this.featureIndex.set(indexKey, newIndex)
        }
      }
    })

    this.dirtySourceIds.add(id)
    this.scheduleRender()
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
        const collection = this.sourceData.get(id)

        if (source?.type === 'geojson' && collection) {
          ;(source as GeoJSONSource).setData({
            ...collection,
            features: [...collection.features],
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
    this.sourceData.clear()
    this.dirtySourceIds.clear()
    this.featureIndex.clear()
    this.managedSourceIds.clear()
    this.managedLayerIds.clear()
  }
}

export default ResourceRegister
