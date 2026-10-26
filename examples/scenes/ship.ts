import { Ship, AisShip, type IAisShipOptions } from 'cmap-core'
import { at, origin, type Demo } from '../shared/demo'
import { ships } from '../shared/data'

const mount: Demo = (ctx) => {
  const manager = new Ship(ctx.map, { plugins: [AisShip] })
  manager.load(ships())
  ctx.map.jumpTo({ center: origin, zoom: 16 })
  ctx.button('真实船体', () => ctx.map.jumpTo({ zoom: 16 }))
  ctx.button('图标模式', () => ctx.map.jumpTo({ zoom: 14 }))
  let step = 0
  ctx.button('更新一艘船', () => {
    const ship = manager.get('demo-ship-1')
    if (!ship) return ctx.log('请先重新加载数据')
    step++
    manager.add({
      ...ship.options,
      position: at(step * 0.00015, -0.0017),
      time: new Date(),
      name: `已更新 ${step}`,
    })
    ctx.log('add 更新已有实例', {
      reused: manager.get(ship.id) === ship,
      count: manager.ships.length,
    })
  })
  ctx.button('聚焦', () => manager.select('demo-ship-1'))
  ctx.button('重新加载', () => {
    manager.load(ships())
    ctx.log('加载 9 艘合成船舶')
  })
  ctx.button('清空', () => {
    manager.removeAll()
    ctx.log('已清空')
  })
  ctx.map.on('ship-click', (event: { options: IAisShipOptions }) =>
    ctx.log('ship-click', { id: event.options.id, name: event.options.name }),
  )
  ctx.cleanup(() => manager.destroy())
  ctx.log('真实船型转向小弯为船宽的一半；左转、右转、静止及不同数据时效均有样本。')
}
export default mount
