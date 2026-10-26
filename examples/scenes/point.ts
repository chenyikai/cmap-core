import { Point } from 'cmap-core'
import { at, type Demo } from '../shared/demo'
import { plotControls } from '../shared/plot'

const mount: Demo = (ctx) =>
  plotControls(
    ctx,
    (empty) =>
      new Point(ctx.map, {
        id: 'point-demo',
        name: '港口监测点',
        isName: true,
        visibility: 'visible',
        position: empty ? undefined : at(0, 0),
        style: { 'circle-radius': 12, 'circle-color': '#168a97', 'circle-stroke-color': '#ffffff' },
      }),
  )
export default mount
