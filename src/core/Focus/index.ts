import { bbox, multiLineString } from '@turf/turf'
import EventEmitter from 'eventemitter3'
import type { BBox, Feature, LineString, MultiLineString, Point, Polygon } from 'geojson'
import { set } from 'lodash-es'
import type { GeoJSONSource, LngLatLike } from 'mapbox-gl'
import type { Map } from 'mapbox-gl'
import { v4 } from 'uuid'

import type { FocusItem, IFocusOptions } from '@/types/Focus'
import { distanceToPx, getPointScope } from '@/utils/util.ts'

import { FOCUS_LAYER, FOCUS_SOURCE_NAME } from './vars.ts'

class Focus extends EventEmitter {
  private readonly map: Map
  focusItems: FocusItem[] = []

  zoomendFunc = this._zoomend.bind(this)

  constructor(map: Map) {
    super()

    this.map = map
    this.onAdd()
  }

  get features(): FocusItem['feature'][] {
    return this.focusItems.map((item) => item.border)
  }

  onAdd(): void {
    this.map.addSource(FOCUS_SOURCE_NAME, {
      type: 'geojson',
      dynamic: true,
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    })

    this.map.addLayer(FOCUS_LAYER)
  }
  onRemove(): void {
    this.removeAll()
  }

  set(feature: Feature, options?: IFocusOptions): string {
    const uuid = options?.id ?? v4()

    this._onHandle(uuid, feature, options)

    return uuid
  }

  get(id: string): FocusItem | undefined {
    return this.focusItems.find((item) => item.id === id)
  }

  remove(id: string): void {
    const i = this.focusItems.findIndex((item) => item.id === id)
    if (i !== -1) {
      this.focusItems.splice(i, 1)
    }
    this.render()
  }

  removeAll(): void {
    this.focusItems = []
    this.render()
  }

  render(): void {
    const source = this.map.getSource<GeoJSONSource>(FOCUS_SOURCE_NAME)

    if (source) {
      if (this.features.length > 0) {
        source.updateData({
          type: 'FeatureCollection',
          features: this.features,
        })
      } else {
        source.setData({
          type: 'FeatureCollection',
          features: this.features,
        })
      }
    }
  }

  _zoomend(): void {
    this.focusItems.forEach((item) => {
      this.set(item.feature, { ...item.options, id: item.id })
    })

    this.render()
  }

  _onHandle(uuid: string, feature: Feature, options?: IFocusOptions): void {
    let item: FocusItem | null = null
    if (feature.geometry.type === 'Point') {
      item = this._onPoint(uuid, feature as Feature<Point>, options)
    } else if (feature.geometry.type === 'LineString') {
      this._onLineString(uuid, feature as Feature<LineString>, options)
    } else if (feature.geometry.type === 'Polygon') {
      item = this._onPolygon(uuid, feature as Feature<Polygon>)
    }

    const i = this.focusItems.findIndex((item) => item.id === uuid)
    if (i !== -1) {
      set(this.focusItems, i, item)
    } else {
      if (item) {
        this.focusItems.push(item)
      }
    }

    this.render()

    if (this.features.length > 0) {
      this.map.on('zoomend', this.zoomendFunc)
    } else {
      this.map.off('zoomend', this.zoomendFunc)
    }
  }

  _onPoint(id: string, feature: Feature<Point>, options?: IFocusOptions): FocusItem {
    const size = (options?.size ?? 0) / 2 + (options?.padding ?? 0)
    const center = feature.geometry.coordinates as LngLatLike
    const { x, y } = this.map.project(center)

    const bbox = getPointScope(this.map, x, y, size)
    const border = this._getBorder(id, bbox, size)

    return { id, border, feature, options }
  }

  _onLineString(id: string, feature: Feature<LineString>, options?: IFocusOptions): void {
    console.log(id, feature, options)
  }

  _onPolygon(id: string, feature: Feature<Polygon>, options?: IFocusOptions): FocusItem {
    const _bbox = bbox(feature)
    const border = this._getBorder(id, _bbox, options?.size ?? 80)

    return { id, border, feature, options }
  }

  _getBorder(id: string, bbox: BBox, size: number): Feature<MultiLineString, { id: string }> {
    const [minLng, minLat, maxLng, maxLat] = bbox

    const armLengthMeters = (size / distanceToPx(this.map, 1)) * 0.3

    // 2. 将米转换为经纬度差值 (核心优化)
    // 地球平均半径约 6371km，1度纬度 ≈ 111319米
    const METERS_PER_DEGREE_LAT = 111319
    const dLat = armLengthMeters / METERS_PER_DEGREE_LAT

    // 经度会随纬度变化，需除以 cos(lat)
    // 使用中心纬度或者最小纬度均可，视觉误差极小
    const latRad = (minLat * Math.PI) / 180
    const dLng = dLat / Math.cos(latRad)

    // 3. 直接构建坐标数组 (顺序：左下 -> 左上 -> 右上 -> 右下)
    // 每个角是一个 L 形：[延伸点, 角点, 延伸点]
    const coordinates = [
      // 左下角 (BL): 向右延伸 -> 角点 -> 向上延伸
      [
        [minLng + dLng, minLat],
        [minLng, minLat],
        [minLng, minLat + dLat],
      ],

      // 左上角 (TL): 向下延伸 -> 角点 -> 向右延伸
      [
        [minLng, maxLat - dLat],
        [minLng, maxLat],
        [minLng + dLng, maxLat],
      ],

      // 右上角 (TR): 向左延伸 -> 角点 -> 向下延伸
      [
        [maxLng - dLng, maxLat],
        [maxLng, maxLat],
        [maxLng, maxLat - dLat],
      ],

      // 右下角 (BR): 向上延伸 -> 角点 -> 向左延伸
      [
        [maxLng, minLat + dLat],
        [maxLng, minLat],
        [maxLng - dLng, minLat],
      ],
    ]

    // 4. 返回结果
    return multiLineString(coordinates, { id }, { id })
  }
}

export default Focus
