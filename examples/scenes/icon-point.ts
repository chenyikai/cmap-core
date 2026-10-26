import { IconPoint, IconManager } from 'cmap-core'
import { at, type Demo } from '../shared/demo'
import { beaconSvg } from '../shared/data'
import { plotControls } from '../shared/plot'

const mount: Demo = async (ctx) => {
  const icons = new IconManager(ctx.map)
  const result = await icons.addSvg({ name: 'demo-beacon', svg: beaconSvg })
  if (result.code !== IconManager.SUCCESS && !icons.has('demo-beacon'))
    throw new Error(String(result.msg))
  plotControls(
    ctx,
    (empty) =>
      new IconPoint(ctx.map, {
        id: 'icon-point-demo',
        icon: 'demo-beacon',
        name: '灯塔',
        isName: true,
        visibility: 'visible',
        position: empty ? undefined : at(0, 0),
        style: { 'icon-size': 1, 'icon-anchor': 'bottom' },
      }),
  )
}
export default mount
