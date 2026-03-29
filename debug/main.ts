import { CMap } from '@/index'
import { Pane } from 'tweakpane'
import '../src/styles/index.scss'

import { initPlotDebug, initPlotManagePane } from './plot'
import { initShipDebug } from './ship'
// import { initTrackDebug } from './track'
import { logEvent } from './utils/logger'
// import { LngLat } from "mapbox-gl";

const cMap = new CMap({
  container: 'map',
  type: CMap.LAND,
  center: [122.091606, 30.004767],
  // center: [122.61947449287959, 29.882149834354422],
  zoom: 14,
  // zoom: 9.5,
})

// 初始化 Tweakpane（右侧主面板）
const pane = new Pane({
  title: 'CMap SDK 调试控制台',
  expanded: true
})

// 创建左上角容器
const leftTopContainer = document.createElement('div')
leftTopContainer.style.cssText = 'position: absolute; top: 10px; left: 10px; z-index: 100;'
document.body.appendChild(leftTopContainer)

// 初始化左上角标绘管理面板
const plotManagePane = new Pane({
  title: '📋 已绘标绘管理',
  expanded: true,
  container: leftTopContainer
})

cMap.mapLoaded().then((map) => {
  // @ts-ignore 暴露给全局方便浏览器控制台调试
  window.map = map

  // const circle = new Circle(map, {
  //   id: 'circle-1',
  //   visibility: 'visible',
  //   center: new LngLat(122.091606, 30.004767),
  //   radius: 1,
  //   unit: 'kilometers'
  // })
  //
  // circle.render()

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
  const envParams = { isSatellite: false, source: CMap.LAND }
  const mapTab = tab.pages[0]
  // mapTab.addBinding(envParams, 'isSatellite', {
  //   label: '卫星影像'
  // }).on('change', (ev: any) => {
  //   cMap.change(ev.value ? CMap.SATELLITE : CMap.LAND)
  //   logEvent('切换底图', ev.value ? '卫星影像' : '矢量地图')
  // })

  mapTab.addBinding(envParams, 'source', {
    label: '图源',
    options: {
      '地图': CMap.LAND,
      '卫星图': CMap.SATELLITE
    }
  }).on('change', () => {
    cMap.change(envParams.source)
  })

  // === 分发 map 和 TabPage 给各个子模块 ===
  initShipDebug(map, tab.pages[1])
  initPlotDebug(map, tab.pages[2])
  initPlotManagePane(map, plotManagePane)
  // initTrackDebug(map, tab.pages[3])
})
