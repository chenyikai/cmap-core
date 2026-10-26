import { Track, type TrackItem } from 'cmap-core'
import { route } from '../shared/data'
import type { Demo } from '../shared/demo'

const mount: Demo = (ctx) => {
  const track = new Track(ctx.map, { startLabel: '起', endLabel: '终' })
  const load = () => {
    track.remove()
    track.load(route('route-a'))
    track.load(route('route-b', 0.008))
    track.render()
    ctx.fit([...route(), ...route('route-b', 0.008)].map((item) => item.position))
    ctx.log('已加载 2 组轨迹：id 是轨迹 ID，pId 是唯一轨迹点 ID')
  }
  load()
  ctx.button('重新加载', load)
  ctx.button('查看 GeoJSON', () => ctx.log('轨迹要素', track.getFeature()))
  ctx.button('清空轨迹', () => {
    track.remove()
    ctx.log('已清空')
  })
  ctx.map.on('track-hover', (event: TrackItem) =>
    ctx.log('track-hover', { id: event.id, pId: event.pId, time: event.time }),
  )
  ctx.cleanup(() => {
    track.remove()
    track.destroy()
  })
}
export default mount
