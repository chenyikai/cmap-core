import { IconManager, IconPoint } from 'cmap-core'
import { at, type Demo } from '../shared/demo'
import { beaconSvg } from '../shared/data'

const mount: Demo = async (ctx) => {
  const icons = new IconManager(ctx.map)
  const result = await icons.addSvg({ name: 'beacon-demo', svg: beaconSvg })
  if (!icons.has('beacon-demo')) throw new Error(String(result.msg))
  const point = new IconPoint(ctx.map, {
    id: 'beacon',
    icon: 'beacon-demo',
    position: at(0, 0),
    visibility: 'visible',
    name: '本地 SVG 图标',
    isName: true,
  })
  point.render()
  ctx.button('检查图标', () => {
    const image = icons.getImage('beacon-demo')
    ctx.log('图标状态', {
      registered: icons.has('beacon-demo'),
      width: image?.width,
      height: image?.height,
    })
  })
  ctx.button('旋转图标', () =>
    point.update({
      ...point.options,
      style: {
        ...point.options.style,
        'icon-rotate': ((point.options.style?.['icon-rotate'] ?? 0) + 45) % 360,
      },
    }),
  )
  ctx.cleanup(() => {
    point.remove()
  })
  ctx.log('SVG 已加载后再创建 IconPoint', { code: result.code, name: result.data.name })
}
export default mount
