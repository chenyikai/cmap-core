import type { GeoJSONSource, StyleSpecification } from 'mapbox-gl'
import '../../src/styles/index.scss'
import ResourceRegister from '../../src/core/ResourceRegister'
import { getSourceSnapshot } from '../../src/core/ResourceRegister/snapshot'
import { CMap } from '../../src/modules/CMap'

// Local raster tiles exercise source loading and styledata timing without a remote service.
const tiles = ['#aac6eb', '#dde7dd'].map((color) => {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 16
  const context = canvas.getContext('2d')!
  context.fillStyle = color
  context.fillRect(0, 0, 16, 16)
  return canvas.toDataURL()
})
const style = (variant = 0): StyleSpecification => ({
  version: 8,
  sources: { base: { type: 'raster', tiles: [tiles[variant]], tileSize: 256 } },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#aac6eb' } },
    { id: 'base_layer', type: 'raster', source: 'base', paint: { 'raster-fade-duration': 0 } },
  ],
})
const cmap = new CMap({ container: 'map', center: [122.25, 29.95], zoom: 12, style: style() })
const map = cmap.getMap()
const results = document.getElementById('results')!
const errors: string[] = []
map.on('error', (event) => errors.push(event.error.message))
window.addEventListener('error', (event) => errors.push(event.message))
const feature = (id: string | number): GeoJSON.Feature<GeoJSON.Point> => ({
  type: 'Feature',
  id,
  properties: { id },
  geometry: { type: 'Point', coordinates: [122.25, 29.95] },
})
const assert = (condition: unknown, message: string): void => {
  if (!condition) throw new Error(message)
}
const frames = (count = 3): Promise<void> =>
  new Promise((resolve) => {
    const next = (): void => {
      if (--count <= 0) resolve()
      else requestAnimationFrame(next)
    }
    requestAnimationFrame(next)
  })
const idle = (): Promise<void> =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('地图未在 10 秒内空闲')), 10000)
    map.once('idle', () => {
      clearTimeout(timeout)
      resolve()
    })
    // loaded() can be true while symbol placement/fading is still in progress.
    // Observe a real idle event before asserting queryRenderedFeatures().
    map.triggerRepaint()
  })
const settle = async (): Promise<void> => {
  await frames()
  await idle()
  await frames()
  await idle()
}
const pass = (message: string): void => {
  results.textContent += '\n✓ ' + message
}

map.once(
  'load',
  () =>
    void (async () => {
      const register = new ResourceRegister(map)
      const focus = new ResourceRegister(map)
      const snapshot = (): GeoJSON.FeatureCollection =>
        getSourceSnapshot(map, 'test') as GeoJSON.FeatureCollection
      const workerIds = (): Set<string> =>
        new Set(map.querySourceFeatures('test').map((item) => String(item.id)))
      results.textContent = '正在核对真实 Worker 数据…'
      try {
        register.addSource('test', {
          type: 'geojson',
          dynamic: true,
          data: { type: 'FeatureCollection', features: [feature('initial')] },
        })
        focus.addLayer({
          zIndex: 99999,
          layer: {
            id: 'focus',
            type: 'circle',
            source: 'test',
            paint: { 'circle-color': '#ef4444', 'circle-radius': 12 },
          },
        })
        register.addLayer({
          zIndex: 300,
          layer: {
            id: 'ships',
            type: 'circle',
            source: 'test',
            paint: { 'circle-color': '#fff', 'circle-radius': 6 },
          },
        })
        assert(
          map.getStyle().layers.findIndex((l) => l.id === 'ships') <
            map.getStyle().layers.findIndex((l) => l.id === 'focus'),
          '跨实例排序错误',
        )
        pass('跨实例图层排序正确')
        const source = map.getSource<GeoJSONSource>('test')!
        const updateData = source.updateData.bind(source)
        const deltas: GeoJSON.FeatureCollection[] = []
        source.updateData = (data) => {
          deltas.push(data as GeoJSON.FeatureCollection)
          return updateData(data)
        }
        // Deliberately enqueue before the initial worker request completes.
        for (let i = 0; i < 1000; i++) register.setGeoJSONData('test', feature(i))
        await settle()
        assert(
          deltas.length === 1 && snapshot().features.length === 1001 && workerIds().size === 1001,
          '初次加载与增量混合导致数据丢失',
        )
        pass('初次加载尚未完成时写入 1000 条：Worker 完整保留 1001 条')

        register.setGeoJSONData('test', { ...feature(5), properties: { id: 5, revision: 2 } })
        await settle()
        assert(
          deltas.at(-1)!.features.length === 1 && workerIds().size === 1001,
          '单条更新发送了全量或丢失其他要素',
        )
        assert(
          map
            .querySourceFeatures('test')
            .some((item) => item.id === 5 && item.properties?.revision === 2),
          'Worker 未应用修改',
        )
        assert(
          (source.serialize().data as GeoJSON.FeatureCollection).features.length === 1,
          '未真正走 updateData',
        )
        pass('1001 条数据修改 1 条 → 只发送 1 条增量；Worker 内容正确')

        const reenter = (event: { sourceId?: string }): void => {
          if (event.sourceId !== 'test') return
          map.off('sourcedataloading', reenter)
          register.setGeoJSONData('test', feature('reentrant'))
        }
        map.on('sourcedataloading', reenter)
        register.setGeoJSONData('test', feature('trigger'))
        await settle()
        assert(
          workerIds().has('reentrant') && workerIds().has('initial'),
          '增量重入或等待 Worker 时丢数据',
        )
        pass('提交期间再次更新：按批次排队，无丢失')

        register.setGeoJSONData('test', [{ ...feature('0'), geometry: null }, feature('1')])
        await settle()
        assert(
          !workerIds().has('0') && workerIds().has('1') && workerIds().size === 1002,
          '数字/字符串 ID 切换或删除异常',
        )
        pass('数字/字符串 ID 切换与增量删除正确')

        // Exercise the real CMap.change controller. Substitute only the raster basemap
        // specification to keep this regression independent of external tile services.
        const setStyle = map.setStyle.bind(map)
        map.addImage('regression-symbol', {
          width: 8,
          height: 8,
          data: new Uint8Array(8 * 8 * 4).fill(255),
        })
        register.addLayer({
          zIndex: 301,
          layer: {
            id: 'ship-symbol',
            type: 'symbol',
            source: 'test',
            layout: { 'icon-image': 'regression-symbol', 'icon-allow-overlap': true },
          },
        })
        await settle()
        let switches = 0
        map.setStyle = () => {
          // Keep Mapbox's default style diff, exactly like the production switch.
          return setStyle(style(++switches % 2))
        }
        for (let i = 0; i < 6; i++) {
          cmap.change(i % 2 ? CMap.LAND : CMap.SATELLITE)
          await settle()
          assert(errors.length === 0, errors.join('\n'))
          assert(map.hasImage('regression-symbol'), '切换后运行时图标丢失')
          assert(
            map.queryRenderedFeatures({ layers: ['ship-symbol'] }).length > 0,
            `切换 ${i + 1} 后符号图层未渲染：` +
              JSON.stringify({
                loaded: map.loaded(),
                worker: workerIds().size,
                snapshot: snapshot().features.length,
                layer: !!map.getLayer('ship-symbol'),
                circles: map.queryRenderedFeatures({ layers: ['ships'] }).length,
              }),
          )
          assert(workerIds().size === 1002, '默认差量切换丢失数据')
        }
        pass('默认 style diff 连续切换 6 次：符号正常渲染，图标与 1002 条数据保留，无布局异常')
        register.setGeoJSONData('test', { ...feature(5), properties: { id: 5, revision: 3 } })
        cmap.change(CMap.SATELLITE)
        register.setGeoJSONData('test', { ...feature(5), properties: { id: 5, revision: 4 } })
        cmap.change(CMap.LAND)
        await settle()
        assert(
          workerIds().size === 1002 &&
            map.querySourceFeatures('test').some((item) => item.properties?.revision === 4) &&
            map.queryRenderedFeatures({ layers: ['ship-symbol'] }).length > 0,
          '快速差量切换时图层或最新更新丢失',
        )
        assert(errors.length === 0, errors.join('\n'))
        pass('默认差量快速连切：旧恢复取消，最新修改和符号保留')
        register.removeLayer('ship-symbol')

        // Also cover full style replacement and overlapping switches.
        map.setStyle = () =>
          setStyle(style(), {
            diff: false,
            localFontFamily: undefined,
            localIdeographFontFamily: undefined,
          })
        register.setGeoJSONData('test', [
          { ...feature(2), geometry: null },
          feature('before-switch'),
        ])
        cmap.change(CMap.SATELLITE)
        register.setGeoJSONData('test', feature('during-switch'))
        cmap.change(CMap.LAND)
        await settle()
        assert(
          workerIds().size === 1003 && snapshot().features.length === 1003,
          '连续切换底图丢失完整数据',
        )
        assert(
          workerIds().has('before-switch') &&
            workerIds().has('during-switch') &&
            !workerIds().has('2') &&
            !workerIds().has('0'),
          '切换时新增丢失或删除要素复活',
        )
        assert(map.getLayer('focus') && map.getLayer('ships'), '切换后图层缺失')
        pass('真实 CMap.change 连续切换：1003 条完整保留，未提交增删也正确')

        register.setGeoJSONData(
          'test',
          snapshot().features.map((item) => ({ ...item, geometry: null })),
        )
        await settle()
        assert(workerIds().size === 0 && snapshot().features.length === 0, '增量清空后残留要素')
        pass('增量删除全部要素：Worker 与完整快照均为空')

        register.setGeoJSONData('test', feature('pending-remove'))
        map.remove()
        register.addSource('late', { type: 'geojson', data: feature('late') })
        register.setState('test', 'initial', { hover: true })
        register.destroy(true)
        focus.destroy(true)
        await frames()
        assert(errors.length === 0, errors.join('\n'))
        pass('真实地图销毁：取消待提交任务，旧调用安全')
        results.textContent += '\n全部通过 · 无 Mapbox / 页面错误'
      } catch (error) {
        results.textContent += '\n失败：' + (error instanceof Error ? error.stack : String(error))
      }
    })(),
)
