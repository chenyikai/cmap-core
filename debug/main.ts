import { CMap } from '@/index'
import { Pane } from 'tweakpane'
import '../src/styles/index.scss'

import { initPlotDebug } from './plot'
import { initShipDebug } from './ship'
// import { initTrackDebug } from './track'
import { logEvent } from './utils/logger'

const cMap = new CMap({
  container: 'map',
  type: CMap.LAND,
  center: [122.091606, 30.004767],
  zoom: 14,
})

// 初始化 Tweakpane
const pane = new Pane({
  title: 'CMap SDK 调试控制台',
  expanded: true
})

cMap.mapLoaded().then((map) => {
  // @ts-ignore 暴露给全局方便浏览器控制台调试
  window.map = map

  logEvent('系统提示', 'Mapbox 渲染引擎已就绪')

  // 创建美观的 Tab 标签页
  const tab = pane.addTab({
    pages:[
      { title: '⚙️ 基础' },
      { title: '🚢 船舶' },
      { title: '📐 标绘' },
      { title: '🛣️ 轨迹' }
    ]
  })

  // === 第一页：基础环境控制 ===
  const envParams = { isSatellite: false }
  tab.pages[0].addBinding(envParams, 'isSatellite', {
    label: '卫星影像'
  }).on('change', (ev: any) => {
    cMap.change(ev.value ? CMap.SATELLITE : CMap.LAND)
    logEvent('切换底图', ev.value ? '卫星影像' : '矢量地图')
  })

  // === 分发 map 和 TabPage 给各个子模块 ===
  initShipDebug(map, tab.pages[1])
  initPlotDebug(map, tab.pages[2])
  // initTrackDebug(map, tab.pages[3])
})
