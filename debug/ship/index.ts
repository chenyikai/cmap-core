import { LngLat, type Map } from 'mapbox-gl'
import type { TabPageApi } from '@tweakpane/core' // 注意：从 core 导入类型
import { AisShip, Ship } from '@/index'
import { logEvent } from '../utils/logger'
import { staticShipData } from './mock'

let shipManager: Ship | null = null

export function initShipDebug(map: Map, folder: TabPageApi) {
  folder.addButton({ title: '加载海量船舶 (Mock)' }).on('click', () => {
    if (!shipManager) {
      shipManager = new Ship(map, { plugins: [AisShip] })
    }

    const list = staticShipData.map((item: any) => ({
      type: 'Ais',
      direction: item.hdg || 0,
      height: item.length,
      width: item.width,
      id: item.mmsi,
      name: item.cnname || item.mmsi,
      position: new LngLat(Number(item.location.split(',')[1]), Number(item.location.split(',')[0])),
      speed: item.sog,
      hdg: item.hdg || 0,
      cog: item.cog,
      rot: item.rot,
      time: item.updateTime,
      tooltip: true,
    }))

    shipManager.load(list)
    logEvent('船舶加载完毕', { count: list.length })
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
