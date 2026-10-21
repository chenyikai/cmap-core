import { EventManager, Point } from 'cmap-core'
import { at, type Demo } from '../shared/demo'

const mount: Demo = (ctx) => {
  const point = new Point(ctx.map, {
    id: 'event-demo',
    name: '点击这个点',
    isName: true,
    position: at(0, 0),
    visibility: 'visible',
    style: { 'circle-radius': 18, 'circle-color': '#168a97' },
  })
  point.render()
  const events = new EventManager(ctx.map)
  let clicks = 0
  const listener = () => ctx.log('EventManager click', { id: point.id, count: ++clicks })
  const listen = () => {
    events.on(point.id, point.LAYER, 'click', listener)
    ctx.log('监听已开启，请点击地图上的圆点')
  }
  listen()
  ctx.button('开启监听', listen)
  ctx.button('关闭监听', () => {
    events.off(point.id, 'click', listener)
    ctx.log('监听已关闭')
  })
  ctx.cleanup(() => {
    events.destroy()
    point.remove()
  })
}
export default mount
