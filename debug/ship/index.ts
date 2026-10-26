import { LngLatBounds, type Map } from 'mapbox-gl'
import type { TabPageApi } from '@tweakpane/core' // 注意：从 core 导入类型
import { AisShip, Ship } from '@/index'
import { logEvent } from '../utils/logger'
import { staticShipData } from './mock'
import { toShipOptions } from './mockAdapter'
import { COASTAL_REGIONS, createShipMockData, type CoastalRegionId } from './mockGenerator'

let shipManager: Ship | null = null

export function initShipDebug(map: Map, folder: TabPageApi) {
  const params = { region: 'all', count: 6000, tooltip: true }
  folder.addBinding(params, 'region', {
    label: 'Mock 范围',
    options: {
      '中国沿海（全部）': 'all',
      ...Object.fromEntries(COASTAL_REGIONS.map((region) => [region.name, region.id])),
      '原舟山样本（198 艘）': 'legacy',
    },
  })
  folder.addBinding(params, 'count', {
    label: '生成数量',
    options: { '1,000 艘': 1000, '6,000 艘': 6000, '20,000 艘（压力测试）': 20000 },
  })
  folder.addBinding(params, 'tooltip', { label: '加载船名' })

  folder.addButton({ title: '加载海量船舶 (Mock)' }).on('click', () => {
    if (!shipManager) {
      shipManager = new Ship(map, { plugins: [AisShip] })
    }

    const data =
      params.region === 'legacy'
        ? staticShipData
        : createShipMockData({
            count: params.count,
            region: params.region as CoastalRegionId | 'all',
          })
    const list = data.map((item) => toShipOptions(item, params.tooltip))

    shipManager.load(list)
    const bounds = new LngLatBounds()
    for (const ship of list) bounds.extend(ship.position)
    if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 700 })
    logEvent('船舶加载完毕', {
      count: list.length,
      region: params.region,
      note:
        params.region === 'legacy'
          ? '原舟山样本'
          : '合成 Mock，非真实船位；放大地图可检查船名与船体轮廓',
      vesselTypes: new Set(
        data.flatMap((item) => ('mock' in item && item.mock ? [item.mock.vesselType] : [])),
      ).size,
    })
  })

  folder.addBlade({ view: 'separator' })

  // 2. 随机聚焦测试
  folder.addButton({ title: '聚焦随机船舶' }).on('click', () => {
    if (shipManager && shipManager.ships.length > 0) {
      const randomIndex = Math.floor(Math.random() * shipManager.ships.length)
      const randomId = shipManager.ships[randomIndex].id
      shipManager.select(randomId)
      logEvent('镜头飞跃并聚焦', { id: randomId })
    } else {
      logEvent('警告', '当前没有船舶数据')
    }
  })

  folder.addBlade({ view: 'separator' })

  folder.addButton({ title: '清空船舶' }).on('click', () => {
    shipManager?.removeAll()
    logEvent('系统提示', '所有船舶已清空')
  })

  map.on('ship-click', (ship) => {
    logEvent('🖱️ 船舶被点击', ship)
  })
}
