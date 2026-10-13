import { LngLat, type GeoJSONSource } from 'mapbox-gl'
import '../../src/styles/index.scss'
import { CMap } from '../../src/modules/CMap'
import Ship from '../../src/modules/Ship'
import { AisShip } from '../../src/modules/Ship/plugins/AisShip'
import { SHIP_SOURCE_NAME } from '../../src/modules/Ship/vars'
import type { IAisShipOptions } from '../../src/types/Ship'

const cmap = new CMap({
  container: 'map',
  center: [122.25, 29.95],
  zoom: 16,
  style: {
    version: 8,
    sources: {},
    layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#aac6eb' } }],
  },
})
const map = cmap.getMap()
const results = document.getElementById('results')!
const errors: string[] = []
map.on('error', (event) => errors.push(event.error.message))
window.addEventListener('error', (event) => errors.push(event.message))
let manager: Ship
const waitFrames = (count = 3): Promise<void> =>
  new Promise((resolve) => {
    const frame = (): void => {
      if (--count <= 0) resolve()
      else requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  })
const assert = (condition: unknown, message: string): void => {
  if (!condition) throw new Error(message)
}
const data = (id: string | number, extra: Partial<IAisShipOptions> = {}): IAisShipOptions => ({
  id,
  name: `测试船 ${id}`,
  type: AisShip.NAME,
  position: new LngLat(122.25, 29.95),
  time: new Date(),
  hdg: 0,
  cog: 0,
  rot: 0,
  direction: 0,
  speed: 0,
  width: 20,
  height: 100,
  tooltip: true,
  ...extra,
})
const snapshot = (): GeoJSON.Feature[] => {
  const source = map.getSource<GeoJSONSource>(SHIP_SOURCE_NAME)!
  return (source._data as GeoJSON.FeatureCollection).features
}
function scene(count = 5): void {
  map.jumpTo({ center: [122.25, 29.95], zoom: count > 5 ? 13 : 16, bearing: 0, pitch: 0 })
  manager.load(
    Array.from({ length: count }, (_, i) =>
      data(i, {
        name:
          count > 5
            ? `浙渔 ${10000 + i}`
            : ['正北船体', '向东船体', '向南船体', '向西船体', '静止船体'][i],
        position: map.unproject([
          480 + (i % (count > 5 ? 15 : 3)) * (count > 5 ? 42 : 210),
          200 + Math.floor(i / (count > 5 ? 15 : 3)) * (count > 5 ? 32 : 240),
        ]),
        hdg: (i % 4) * 90,
        cog: (i % 4) * 90,
      }),
    ),
  )
}

async function run(): Promise<void> {
  results.textContent = '检查中…'
  const passed: string[] = []
  try {
    manager.removeAll()
    const ship = manager.add(data(0))!
    await waitFrames()
    assert(
      snapshot().some((x) => x.id === 0),
      'add 未提交船体',
    )
    const tooltip = ship.tooltip
    manager.add(data('0', { name: '更新后的标签' }))
    assert(
      manager.ships.length === 1 && manager.get(0) === ship && ship.tooltip === tooltip,
      '实例或标签没有复用',
    )
    passed.push('✓ add 立即显示；重复 ID 复用实例与标签')

    const before = JSON.stringify(ship.real().geometry)
    map.jumpTo({ bearing: 90, pitch: 45 })
    const after = JSON.stringify(ship.real().geometry)
    const values = (value: string): number[] => JSON.parse(value).coordinates.flat(2)
    assert(
      values(before).every((v, i) => Math.abs(v - values(after)[i]) < 1e-8),
      '地图旋转改变船体地理坐标',
    )
    passed.push('✓ 旋转 90° / 倾斜 45° 后船体坐标稳定')

    manager.event.onMove({ features: [{ id: 0 }] } as never)
    assert(ship.isHover, '数字 0 无法悬停')
    manager.focus(0)
    manager.removeAll()
    assert(map.getCanvasContainer().style.cursor === '', '鼠标状态残留')
    assert(!map.getFeatureState({ source: SHIP_SOURCE_NAME, id: 0 }).hover, '悬停状态残留')
    passed.push('✓ ID=0 交互；清空后状态和聚焦框移除')

    manager.add(data('pending'))
    manager.select('pending')
    manager.remove('pending')
    map.stop()
    await waitFrames()
    assert(snapshot().length === 0, '删除后船舶被移动回调恢复')
    passed.push('✓ select → remove → moveend 不恢复已删除船舶')

    manager.load([data('keep')])
    const cancel = (event: { cancel(): void }): void => event.cancel()
    map.on('beforeRemove', cancel)
    map.remove()
    map.off('beforeRemove', cancel)
    assert(manager.get('keep'), '取消关闭仍清空船舶')
    passed.push('✓ 取消地图关闭保留船舶')

    const entries = Array.from({ length: 100 }, (_, i) => data(i))
    manager.load(entries)
    let geometryCalls = 0
    for (const current of manager.ships) {
      const getFeature = current.getFeature.bind(current)
      current.getFeature = () => {
        geometryCalls++
        return getFeature()
      }
    }
    manager.load(entries.map((entry) => ({ ...entry })))
    assert(geometryCalls === 0, '未变化数据仍重建几何')
    passed.push('✓ 100 条相同数据刷新：0 次几何重建')
    scene()
    await waitFrames(10)
    assert(errors.length === 0, errors.join('\n'))
    results.textContent = passed.join('\n') + '\n全部通过 · 无 Mapbox / 页面错误'
  } catch (error) {
    results.textContent = passed.join('\n') + '\n失败：' + String(error)
  }
}

map.once('load', () => {
  manager = new Ship(map, { plugins: [AisShip] })
  for (const button of document.querySelectorAll('button')) button.disabled = false
  document.getElementById('run')!.onclick = () => void run()
  document.getElementById('rotate')!.onclick = () => {
    map.jumpTo({ bearing: map.getBearing() === 0 ? 90 : 0, pitch: map.getPitch() === 0 ? 45 : 0 })
    manager.render()
  }
  document.getElementById('dense')!.onclick = () => scene(198)
  document.getElementById('destroy')!.onclick = () => {
    try {
      manager.select(manager.ships[0].id)
      map.remove()
      assert(manager.ships.length === 0, '销毁后实例残留')
      assert(!document.querySelector('.cmap-tooltip-canvas'), '销毁后标签画布残留')
      assert(errors.length === 0, errors.join('\n'))
      results.textContent += '\n✓ 真实 map.remove()：实例、标签、回调已释放'
      for (const button of document.querySelectorAll('button')) button.disabled = true
    } catch (error) {
      results.textContent += '\n销毁失败：' + String(error)
    }
  }
  void run()
})
