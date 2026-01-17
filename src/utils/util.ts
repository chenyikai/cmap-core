import { envelope, featureCollection, point } from '@turf/turf'
import type { BBox } from 'geojson'
import type { Map } from 'mapbox-gl'

/**
 * 将物理距离（米）转换为当前地图层级下的屏幕像素（px）
 * @param map Mapbox 地图实例
 * @param distance 距离（单位：米）
 * @param latitude 计算基准纬度（默认取当前地图中心）
 */
export function distanceToPx(map: Map, distance: number, latitude?: number): number {
  const EARTH_CIRCUMFERENCE = 40075017

  const lat = latitude ?? map.getCenter().lat

  const zoom = map.getZoom()

  const latRad = lat * (Math.PI / 180)
  const metersPerPixel = (EARTH_CIRCUMFERENCE * Math.cos(latRad)) / Math.pow(2, zoom + 9)

  return distance / metersPerPixel
}

export function getPointScope(map: Map, x: number, y: number, width: number): BBox {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return envelope(
    featureCollection([
      point(map.unproject([x - width / 2, y - width / 2]).toArray()),
      point(map.unproject([x + width / 2, y + width / 2]).toArray()),
    ]),
  ).bbox!
}
