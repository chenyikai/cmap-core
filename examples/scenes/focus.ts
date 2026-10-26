import { Focus, Point, Fill } from 'cmap-core'
import { at, type Demo } from '../shared/demo'

const mount: Demo = (ctx) => {
  const focus = new Focus(ctx.map)
  const point = new Point(ctx.map, {
    id: 'focus-point',
    position: at(-0.008, 0),
    visibility: 'visible',
    style: { 'circle-color': '#168a97' },
  })
  const fill = new Fill(ctx.map, {
    id: 'focus-polygon',
    visibility: 'visible',
    position: [at(0.001, -0.005), at(0.012, -0.004), at(0.008, 0.006)],
    style: { 'fill-color': '#168a97', 'fill-opacity': 0.25 },
    outLineStyle: { 'line-color': '#168a97' },
  })
  point.render()
  fill.render()
  const show = () => {
    const p = point.getFeature(),
      polygon = fill.getFeature()
    if (p.geometry) focus.set(p as GeoJSON.Feature, { size: 24, padding: 12 })
    if (polygon.geometry) focus.set(polygon as GeoJSON.Feature, { armLength: 15, padding: 12 })
  }
  show()
  ctx.button('显示聚焦框', show)
  ctx.button('移除点聚焦框', () => focus.remove('focus-point'))
  ctx.button('清空聚焦框', () => focus.removeAll())
  ctx.cleanup(() => {
    focus.removeAll()
    point.remove()
    fill.remove()
  })
  ctx.log('Focus 只负责边框；镜头移动由 map 的相机方法负责。')
}
export default mount
