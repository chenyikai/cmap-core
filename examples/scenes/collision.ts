import { Collision } from 'cmap-core'
import type { Demo } from '../shared/demo'

const mount: Demo = (ctx) => {
  const collision = new Collision<'left' | 'right'>()
  const board = document.createElement('div')
  board.className = 'collision-board'
  ctx.overlay.append(board)
  const box = (x: number, y: number) => ({ minX: x, minY: y, maxX: x + 90, maxY: y + 42 })
  let allowAlternative = true
  const render = () => {
    const items = collision.load([
      { id: 'A', positions: { left: box(20, 30) } },
      {
        id: 'B',
        positions: { left: box(40, 40), right: box(150, 40) },
        priority: allowAlternative ? ['left', 'right'] : ['left'],
      },
      { id: 'C', positions: { left: box(20, 110), right: box(150, 110) } },
    ])
    board.replaceChildren()
    for (const item of items) {
      const element = document.createElement('div'),
        bbox = item.getBBox()
      element.className = `collision-box${item.visible ? '' : ' hidden-box'}`
      Object.assign(element.style, {
        left: `${bbox.minX}px`,
        top: `${bbox.minY}px`,
        width: `${bbox.maxX - bbox.minX}px`,
        height: `${bbox.maxY - bbox.minY}px`,
      })
      element.textContent = `${item.id} · ${item.visible ? item.dir : '被隐藏'}`
      board.append(element)
    }
    ctx.log(
      '碰撞结果',
      items.map((item) => ({ id: item.id, visible: item.visible, dir: item.dir })),
    )
  }
  ctx.button('切换 B 的备用方向', () => {
    allowAlternative = !allowAlternative
    render()
  })
  ctx.cleanup(() => collision.clear())
  render()
}
export default mount
