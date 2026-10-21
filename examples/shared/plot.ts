import type { IPoiOptions, Poi } from 'cmap-core'
import type { Geometry } from 'geojson'
import { at, type DemoContext } from './demo'

export function plotControls(
  ctx: DemoContext,
  create: (empty: boolean) => Poi<IPoiOptions, Geometry | null>,
): void {
  let plot = create(false)
  const bind = () => {
    for (const event of ['create', 'click', 'update.done', 'mid.update.done']) {
      plot.on(event, () => ctx.log(event, plot.getFeature()))
    }
    plot.render()
  }
  bind()
  ctx.button('编辑', () => {
    plot.edit()
    ctx.log('拖动图形或控制点进行编辑')
  })
  ctx.button('结束编辑', () => plot.unedit())
  ctx.button('移动', () => plot.move(at(0.003, 0.001)))
  ctx.button('显示 / 隐藏', () => (plot.visibility === 'visible' ? plot.hide() : plot.show()))
  ctx.button('导出 GeoJSON', () => ctx.log('GeoJSON', plot.getFeature()))
  ctx.button('重新绘制', () => {
    plot.remove()
    plot = create(true)
    bind()
    plot.start()
    ctx.log('绘制：点单击；线双击结束；多边形右键或回到首点结束；圆形两次点击')
  })
  ctx.button('重置', () => {
    plot.remove()
    plot = create(false)
    bind()
  })
  ctx.cleanup(() => plot.remove())
  ctx.log('示例已绘制，可使用上方按钮操作')
}
