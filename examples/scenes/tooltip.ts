import { Tooltip } from 'cmap-core'
import { at, type Demo } from '../shared/demo'

const mount: Demo = (ctx) => {
  const tip = new Tooltip(ctx.map, {
    position: at(0, 0),
    text: 'new Tooltip 即可显示',
    theme: 'ship',
    line: true,
    offsetY: 35,
  })
  const button = document.createElement('button')
  button.textContent = '可点击的 DOM 标签'
  button.style.pointerEvents = 'auto'
  button.onclick = () => ctx.log('DOM 标签点击事件')
  const dom = new Tooltip(ctx.map, {
    position: at(0.012, 0.006),
    element: button,
    anchor: 'center',
  })
  let extras: Tooltip[] = [],
    count = 0
  ctx.button('更新文本', () => tip.update({ text: `更新次数 ${++count}` }))
  ctx.button('显示 / 隐藏', () => (tip.options.visible ? tip.hide() : tip.show()))
  ctx.button('生成 500 个避让标签', () => {
    extras.forEach((item) => item.remove())
    extras = Array.from(
      { length: 500 },
      (_, i) =>
        new Tooltip(ctx.map, {
          position: at(((i % 25) - 12) * 0.0012, (Math.floor(i / 25) - 10) * 0.0012),
          text: `标签 ${i + 1}`,
          collision: true,
          line: true,
          offsetY: 20,
          targetRadius: 3,
        }),
    )
    ctx.log('已创建 500 个共享 Canvas 标签；碰撞项可暂时隐藏，缩放后重新布局。')
  })
  ctx.button('清除批量标签', () => {
    extras.forEach((item) => item.remove())
    extras = []
  })
  ctx.cleanup(() => {
    tip.remove()
    dom.remove()
    extras.forEach((item) => item.remove())
  })
  ctx.log('文本走 Canvas；交互 HTML 走 DOM，二者的内容参数互斥。')
}
export default mount
