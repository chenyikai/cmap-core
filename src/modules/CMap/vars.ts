import type { StyleSpecification } from 'mapbox-gl'

const TDT_TOKEN = 'dedbd86f02e50097b36eb7cfc2e0bf5f'

export const landStyle: StyleSpecification = {
  version: 8,
  name: 'Basic',
  glyphs: 'https://sdkinteligenceberth.zhonganhse.com:21333/app/font/{fontstack}/{range}.pbf',
  sources: {
    base: {
      tiles: [
        `http://t0.tianditu.gov.cn/DataServer?T=vec_w&x={x}&y={y}&l={z}&tk=${TDT_TOKEN}`,
        `http://t1.tianditu.gov.cn/DataServer?T=vec_w&x={x}&y={y}&l={z}&tk=${TDT_TOKEN}`,
        `http://t2.tianditu.gov.cn/DataServer?T=vec_w&x={x}&y={y}&l={z}&tk=${TDT_TOKEN}`,
        `http://t3.tianditu.gov.cn/DataServer?T=vec_w&x={x}&y={y}&l={z}&tk=${TDT_TOKEN}`,
        `http://t4.tianditu.gov.cn/DataServer?T=vec_w&x={x}&y={y}&l={z}&tk=${TDT_TOKEN}`,
        `http://t5.tianditu.gov.cn/DataServer?T=vec_w&x={x}&y={y}&l={z}&tk=${TDT_TOKEN}`,
        `http://t6.tianditu.gov.cn/DataServer?T=vec_w&x={x}&y={y}&l={z}&tk=${TDT_TOKEN}`,
        `http://t7.tianditu.gov.cn/DataServer?T=vec_w&x={x}&y={y}&l={z}&tk=${TDT_TOKEN}`,
      ],
      type: 'raster',
      tileSize: 256,
      minzoom: 0,
      maxzoom: 21,
    },
    label: {
      tiles: [
        `http://t0.tianditu.gov.cn/DataServer?T=cva_w&x={x}&y={y}&l={z}&tk=${TDT_TOKEN}`,
        `http://t1.tianditu.gov.cn/DataServer?T=cva_w&x={x}&y={y}&l={z}&tk=${TDT_TOKEN}`,
        `http://t2.tianditu.gov.cn/DataServer?T=cva_w&x={x}&y={y}&l={z}&tk=${TDT_TOKEN}`,
        `http://t3.tianditu.gov.cn/DataServer?T=cva_w&x={x}&y={y}&l={z}&tk=${TDT_TOKEN}`,
        `http://t4.tianditu.gov.cn/DataServer?T=cva_w&x={x}&y={y}&l={z}&tk=${TDT_TOKEN}`,
        `http://t5.tianditu.gov.cn/DataServer?T=cva_w&x={x}&y={y}&l={z}&tk=${TDT_TOKEN}`,
        `http://t6.tianditu.gov.cn/DataServer?T=cva_w&x={x}&y={y}&l={z}&tk=${TDT_TOKEN}`,
        `http://t7.tianditu.gov.cn/DataServer?T=cva_w&x={x}&y={y}&l={z}&tk=${TDT_TOKEN}`,
      ],
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

export const satelliteStyle: StyleSpecification = {
  version: 8,
  name: 'Basic',
  glyphs: 'https://sdkinteligenceberth.zhonganhse.com:21333/app/font/{fontstack}/{range}.pbf',
  sources: {
    base: {
      tiles: [
        `http://t0.tianditu.gov.cn/DataServer?T=img_w&x={x}&y={y}&l={z}&tk=${TDT_TOKEN}`,
        `http://t1.tianditu.gov.cn/DataServer?T=img_w&x={x}&y={y}&l={z}&tk=${TDT_TOKEN}`,
        `http://t2.tianditu.gov.cn/DataServer?T=img_w&x={x}&y={y}&l={z}&tk=${TDT_TOKEN}`,
        `http://t3.tianditu.gov.cn/DataServer?T=img_w&x={x}&y={y}&l={z}&tk=${TDT_TOKEN}`,
        `http://t4.tianditu.gov.cn/DataServer?T=img_w&x={x}&y={y}&l={z}&tk=${TDT_TOKEN}`,
        `http://t5.tianditu.gov.cn/DataServer?T=img_w&x={x}&y={y}&l={z}&tk=${TDT_TOKEN}`,
        `http://t6.tianditu.gov.cn/DataServer?T=img_w&x={x}&y={y}&l={z}&tk=${TDT_TOKEN}`,
        `http://t7.tianditu.gov.cn/DataServer?T=img_w&x={x}&y={y}&l={z}&tk=${TDT_TOKEN}`,
      ],
      type: 'raster',
      tileSize: 256,
      minzoom: 0,
      maxzoom: 21,
    },
    label: {
      tiles: [
        `http://t0.tianditu.gov.cn/DataServer?T=cva_w&x={x}&y={y}&l={z}&tk=${TDT_TOKEN}`,
        `http://t1.tianditu.gov.cn/DataServer?T=cva_w&x={x}&y={y}&l={z}&tk=${TDT_TOKEN}`,
        `http://t2.tianditu.gov.cn/DataServer?T=cva_w&x={x}&y={y}&l={z}&tk=${TDT_TOKEN}`,
        `http://t3.tianditu.gov.cn/DataServer?T=cva_w&x={x}&y={y}&l={z}&tk=${TDT_TOKEN}`,
        `http://t4.tianditu.gov.cn/DataServer?T=cva_w&x={x}&y={y}&l={z}&tk=${TDT_TOKEN}`,
        `http://t5.tianditu.gov.cn/DataServer?T=cva_w&x={x}&y={y}&l={z}&tk=${TDT_TOKEN}`,
        `http://t6.tianditu.gov.cn/DataServer?T=cva_w&x={x}&y={y}&l={z}&tk=${TDT_TOKEN}`,
        `http://t7.tianditu.gov.cn/DataServer?T=cva_w&x={x}&y={y}&l={z}&tk=${TDT_TOKEN}`,
      ],
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
