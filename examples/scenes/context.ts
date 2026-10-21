import { Module, Tooltip } from 'cmap-core'
import type { Map } from 'mapbox-gl'
import { origin, type Demo } from '../shared/demo'

class ContextProbe extends Module {
  constructor(map: Map) {
    super(map)
  }
  override onAdd(): void {}
  override onRemove(): void {}
  get sharedContext() {
    return this.context
  }
}

const mount: Demo = (ctx) => {
  const first = new ContextProbe(ctx.map),
    second = new ContextProbe(ctx.map)
  const label = new Tooltip(ctx.map, {
    position: origin,
    text: '同一 Map，共享上下文',
    anchor: 'center',
  })
  const listener = (message: string) => {
    label.update({ text: message })
    ctx.log('模块 B 收到共享事件', message)
  }
  second.sharedContext.events.on('demo:message', listener)
  ctx.button('模块 A 发送事件', () =>
    first.sharedContext.events.emit('demo:message', '模块间通信成功'),
  )
  ctx.cleanup(() => {
    second.sharedContext.events.off('demo:message', listener)
    first.destroy()
    second.destroy()
    label.remove()
  })
  ctx.log('共享服务身份', {
    context: first.sharedContext === second.sharedContext,
    register: first.sharedContext.register === second.sharedContext.register,
    map: first.sharedContext.map === ctx.map,
  })
}
export default mount
