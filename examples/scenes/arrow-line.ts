import { ArrowLine } from 'cmap-core'
import { at, type Demo } from '../shared/demo'
import { plotControls } from '../shared/plot'

const mount: Demo = (ctx) =>
  plotControls(
    ctx,
    (empty) =>
      new ArrowLine(ctx.map, {
        id: 'arrow-line-demo',
        name: '通航方向',
        isName: true,
        visibility: 'visible',
        position: empty
          ? []
          : [at(-0.012, -0.005), at(-0.004, 0.005), at(0.004, 0.002), at(0.013, 0.008)],
        style: { 'line-color': '#168a97', 'line-width': 3 },
        vertexStyle: { 'icon-size': 0.7 },
      }),
  )
export default mount
