import type { StyleSpecification } from 'mapbox-gl'

import { MapType } from '@/types/CMap'

const TDT_TOKEN = 'dedbd86f02e50097b36eb7cfc2e0bf5f'

const TMap: Record<MapType, string> = {
  [MapType.LAND]: 'vec_w',
  [MapType.SATELLITE]: 'img_w',
}

export function createStyle(
  type: MapType = MapType.LAND,
  http2 = true,
  tdtToken?: string,
  glyphs?: string,
): StyleSpecification {
  const protocol = http2 ? 'https' : 'http'
  const token = tdtToken ?? TDT_TOKEN

  const T: string = TMap[type]

  const baseTiles = Array.from(
    { length: 8 },
    (_, index) =>
      `${protocol}://t${String(index)}.tianditu.gov.cn/DataServer?T=${T}&x={x}&y={y}&l={z}&tk=${token}`,
  )

  const labelTiles = Array.from(
    { length: 8 },
    (_, index) =>
      `${protocol}://t${String(index)}.tianditu.gov.cn/DataServer?T=cva_w&x={x}&y={y}&l={z}&tk=${token}`,
  )

  return {
    version: 8,
    name: 'Basic',
    glyphs:
      glyphs ?? 'https://sdkinteligenceberth.zhonganhse.com:21333/app/font/{fontstack}/{range}.pbf',
    sources: {
      base: {
        tiles: baseTiles,
        type: 'raster',
        tileSize: 256,
        minzoom: 0,
        maxzoom: 21,
      },
      label: {
        tiles: labelTiles,
        type: 'raster',
        tileSize: 256,
        minzoom: 0,
        maxzoom: 21,
      },
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': 'rgba(212,234,238,1)',
        },
      },
      {
        id: 'base_layer',
        source: 'base',
        type: 'raster',
      },
      {
        id: 'label_layer',
        source: 'label',
        type: 'raster',
      },
      {
        id: 'base-end',
        type: 'background',
        paint: {
          'background-color': 'transparent',
        },
      },
      {
        id: 'point-end',
        type: 'background',
        paint: {
          'background-color': 'transparent',
        },
      },
    ],
  }
}
