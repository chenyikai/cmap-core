import { Line } from 'cmap-core'
import { at, type Demo } from '../shared/demo'
import { plotControls } from '../shared/plot'

const mount: Demo = (ctx) =>
  plotControls(
    ctx,
    (empty) =>
      new Line(ctx.map, {
        id: 'line-demo',
        name: '巡检航线',
        isName: true,
        visibility: 'visible',
        position: empty ? [] : [at(-0.012, -0.005), at(-0.004, 0.005), at(0.01, 0.002)],
        style: { 'line-color': '#168a97', 'line-width': 4 },
        vertexStyle: { 'circle-color': '#fff', 'circle-stroke-color': '#168a97' },
      }),
  )
export default mount
