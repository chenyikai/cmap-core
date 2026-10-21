import { IndexLine } from 'cmap-core'
import { at, type Demo } from '../shared/demo'
import { plotControls } from '../shared/plot'

const mount: Demo = (ctx) =>
  plotControls(
    ctx,
    (empty) =>
      new IndexLine(ctx.map, {
        id: 'index-line-demo',
        name: '有序航点',
        isName: true,
        visibility: 'visible',
        position: empty ? [] : [at(-0.012, -0.005), at(-0.004, 0.005), at(0.01, 0.002)],
        style: { 'line-color': '#168a97', 'line-width': 3 },
        vertexStyle: { 'circle-radius': 14 },
      }),
  )
export default mount
