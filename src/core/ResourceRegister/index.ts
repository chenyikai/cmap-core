import type * as GeoJSON from 'geojson'
import type { LayerSpecification, Map, Source, SourceSpecification } from 'mapbox-gl'

class ResourceRegister {
  private map: Map

  constructor(map: Map) {
    this.map = map
  }

  /**
   * 幂等地添加 Source
   * 如果已存在，则忽略；如果不存在，则创建。
   */
  public addSource(id: string, source: SourceSpecification): void {
    if (!this.map.getSource(id)) {
      this.map.addSource(id, source)
    }
  }

  /**
   * 幂等地添加 Layer
   */
  public addLayer(layer: LayerSpecification, beforeId?: string): void {
    if (!this.map.getLayer(layer.id)) {
      this.map.addLayer(layer, beforeId)
    }
  }

  /**
   * 获取 Source 的强类型辅助方法
   */
  public getSource(id: string): Source | undefined {
    return this.map.getSource<Source>(id)
  }

  /**
   * 安全更新 Source 数据 (针对 GeoJSON)
   */
  public updateGeoJSONData(id: string, feature: GeoJSON.Feature<null | GeoJSON.Geometry>): void {
    const source = this.getSource(id)
    if (source?.type === 'geojson') {
      source.updateData(feature as GeoJSON.GeoJSON)
    }
  }
}

export default ResourceRegister
