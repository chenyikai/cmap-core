import { Ship, AisShip, Track, Fill, Circle, Point, Tooltip, CMap } from 'cmap-core'
import { at, type Demo } from '../shared/demo'
import { ships, route } from '../shared/data'

const mount: Demo = (ctx) => {
  const fleet = new Ship(ctx.map, { plugins: [AisShip] })
  fleet.load(ships())
  const track = new Track(ctx.map, { startLabel: '起', endLabel: '终' })
  track.load(route())
  track.render()
  const zone = new Fill(ctx.map, {
    id: 'overview-zone',
    name: '锚地',
    visibility: 'visible',
    position: [at(-0.011, -0.009), at(0.005, -0.009), at(0.003, -0.003), at(-0.01, -0.003)],
    style: { 'fill-color': '#168a97', 'fill-opacity': 0.22 },
    outLineStyle: { 'line-color': '#168a97', 'line-width': 2 },
  })
  const circle = new Circle(ctx.map, {
    id: 'overview-circle',
    center: at(0.012, 0.005),
    radius: 400,
    visibility: 'visible',
    style: { 'fill-color': '#e7a34b', 'fill-opacity': 0.2, 'line-color': '#c78a3a' },
  })
  const point = new Point(ctx.map, {
    id: 'overview-port',
    name: '港区监测点',
    isName: true,
    visibility: 'visible',
    position: at(-0.012, 0.007),
    style: { 'circle-color': '#168a97' },
  })
  zone.render()
  circle.render()
  point.render()
  const label = new Tooltip(ctx.map, {
    position: at(-0.006, -0.006),
    text: '锚地区域',
    theme: 'ship',
    anchor: 'center',
  })
  const showOverview = () => ctx.fit([at(-0.016, -0.012), at(0.018, 0.013)])
  showOverview()
  ctx.button('船体特写', () => ctx.map.jumpTo({ center: at(0, 0), zoom: 16 }))
  ctx.button('全景', showOverview)
  ctx.button('刷新船位', () => {
    const ship = fleet.get('demo-ship-1')!
    fleet.add({ ...ship.options, position: at(0.0005, -0.0003), time: new Date() })
    ctx.log('只刷新一艘船，其余实例及标签复用')
  })
  ctx.button('编辑锚地', () => zone.edit())
  ctx.button('结束编辑', () => zone.unedit())
  if (import.meta.env.VITE_TDT_TOKEN) {
    ctx.button('矢量底图', () => ctx.cmap.change(CMap.LAND))
    ctx.button('影像底图', () => ctx.cmap.change(CMap.SATELLITE))
  }
  ctx.cleanup(() => {
    fleet.destroy()
    track.remove()
    track.destroy()
    zone.remove()
    circle.remove()
    point.remove()
    label.remove()
  })
  ctx.log(
    '综合场景就绪：9 艘船、1 条轨迹、1 个锚地、1 个圆形范围、1 个监测点及文本标签。全部为合成数据。',
  )
}
export default mount
