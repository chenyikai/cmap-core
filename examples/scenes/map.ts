import { CMap, Tooltip } from 'cmap-core'
import { origin, type Demo } from '../shared/demo'

const mount: Demo = (ctx) => {
  const label = new Tooltip(ctx.map, {
    position: origin,
    text: '从这里开始接入 CMap',
    anchor: 'center',
  })
  ctx.button('放大', () => ctx.cmap.zoomIn())
  ctx.button('缩小', () => ctx.cmap.zoomOut())
  ctx.button('旋转与倾斜', () => ctx.map.easeTo({ bearing: 45, pitch: 40 }))
  ctx.button('复位相机', () => ctx.map.jumpTo({ center: origin, zoom: 13.3, bearing: 0, pitch: 0 }))
  const token = import.meta.env.VITE_TDT_TOKEN
  if (token) {
    ctx.button('天地图矢量', () => ctx.cmap.change(CMap.LAND))
    ctx.button('天地图影像', () => ctx.cmap.change(CMap.SATELLITE))
  }
  ctx.button('读取相机', () =>
    ctx.log('当前相机', {
      center: ctx.map.getCenter(),
      zoom: ctx.map.getZoom(),
      bearing: ctx.map.getBearing(),
    }),
  )
  ctx.cleanup(() => label.remove())
  ctx.log(
    token
      ? '已配置天地图 Token，可切换底图'
      : '默认使用无网络底图。配置 .env.local 中的 VITE_TDT_TOKEN 并重启开发服务后可体验天地图切换。',
  )
}
export default mount
