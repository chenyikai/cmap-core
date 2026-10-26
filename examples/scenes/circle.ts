import { Circle } from 'cmap-core'
import { at, type Demo } from '../shared/demo'
import { plotControls } from '../shared/plot'

const mount: Demo = (ctx) =>
  plotControls(
    ctx,
    (empty) =>
      new Circle(ctx.map, {
        id: 'circle-demo',
        name: '警戒范围',
        visibility: 'visible',
        center: empty ? undefined : at(0, 0),
        radius: empty ? undefined : 700,
        unit: 'meters',
        steps: 64,
        style: {
          'fill-color': '#168a97',
          'fill-opacity': 0.2,
          'line-color': '#168a97',
          'line-width': 2,
        },
      }),
  )
export default mount
