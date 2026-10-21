import { EventState, Tooltip } from 'cmap-core'
import type { Map, MapMouseEvent } from 'mapbox-gl'
import { origin, type Demo } from '../shared/demo'

class ClickState extends EventState {
  private readonly onClick = (event: MapMouseEvent) => this.emit('position', event.lngLat)
  constructor(map: Map) {
    super(map)
  }
  override onAdd(): void {}
  override onRemove(): void {
    this.disabled()
    this.removeAllListeners()
  }
  override enabled(): void {
    if (this.status === EventState.ON) return
    this.context.map.on('click', this.onClick)
    this.status = EventState.ON
  }
  override disabled(): void {
    this.context.map.off('click', this.onClick)
    this.status = EventState.OFF
  }
}

const mount: Demo = (ctx) => {
  const state = new ClickState(ctx.map)
  const label = new Tooltip(ctx.map, { position: origin, text: '开启后点击地图', anchor: 'center' })
  state.on('position', (position) => {
    label.setLngLat(position)
    ctx.log('点击坐标', position.toArray())
  })
  ctx.button('开启 / 关闭点击', () => ctx.log('交互状态', state.switch()))
  ctx.cleanup(() => {
    state.destroy()
    label.remove()
  })
  ctx.log('当前状态 Off；switch() 调用 enabled / disabled，实际绑定或解除事件。')
}
export default mount
