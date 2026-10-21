import { IndexPoint } from 'cmap-core'
import { at, type Demo } from '../shared/demo'
import { plotControls } from '../shared/plot'

const mount: Demo = (ctx) =>
  plotControls(
    ctx,
    (empty) =>
      new IndexPoint(ctx.map, {
        id: 'index-point-demo',
        name: '序号监测点',
        isName: true,
        index: 3,
        visibility: 'visible',
        position: empty ? undefined : at(0, 0),
        style: {
          'circle-radius': 17,
          'circle-color': '#ffffff',
          'circle-stroke-color': '#168a97',
          'text-size': 16,
        },
      }),
  )
export default mount
