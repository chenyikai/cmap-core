import { ResourceRegister, CMap } from 'cmap-core'
import type { Feature, Point } from 'geojson'
import { at, type Demo } from '../shared/demo'

const mount: Demo = (ctx) => {
  const register = new ResourceRegister(ctx.map)
  const source = 'demo-resources',
    layer = 'demo-resources-points'
  register.addSource(source, {
    type: 'geojson',
    dynamic: true,
    data: { type: 'FeatureCollection', features: [] },
  })
  register.addLayer({
    zIndex: 10,
    layer: {
      id: layer,
      source,
      type: 'circle',
      paint: {
        'circle-radius': 12,
        'circle-color': [
          'case',
          ['boolean', ['feature-state', 'active'], false],
          '#d47d4c',
          '#168a97',
        ],
      },
    },
  })
  const feature = (index: number, offset = 0): Feature<Point> => ({
    type: 'Feature',
    id: `point-${index}`,
    properties: { id: `point-${index}` },
    geometry: { type: 'Point', coordinates: at((index - 1) * 0.008, offset).toArray() },
  })
  const load = () => register.setGeoJSONData(source, [feature(0), feature(1), feature(2)])
  load()
  let offset = 0
  ctx.button('增量移动中间点', () => {
    offset += 0.001
    register.setGeoJSONData(source, feature(1, offset))
    ctx.log('只提交 point-1 的增量')
  })
  ctx.button('切换高亮', () =>
    register.setState(source, 'point-1', { active: !register.getState(source, 'point-1')?.active }),
  )
  ctx.button('删除右侧点', () =>
    register.setGeoJSONData(source, {
      type: 'Feature',
      id: 'point-2',
      geometry: null,
      properties: { id: 'point-2' },
    }),
  )
  ctx.button('读取快照中的点', () =>
    ctx.log('findFeature', register.findFeature(source, 'point-1')),
  )
  ctx.button('重置数据', load)
  if (import.meta.env.VITE_TDT_TOKEN)
    ctx.button('切换影像并保留数据', () => ctx.cmap.change(CMap.SATELLITE))
  ctx.cleanup(() => register.destroy(true))
  ctx.log('3 个稳定 ID 的点已提交。数组是增量补丁，不是全量替换；geometry:null 表示删除。')
}
export default mount
