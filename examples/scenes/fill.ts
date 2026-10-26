import { Fill } from 'cmap-core'
import { at, type Demo } from '../shared/demo'
import { plotControls } from '../shared/plot'

const mount: Demo = (ctx) =>
  plotControls(
    ctx,
    (empty) =>
      new Fill(ctx.map, {
        id: 'fill-demo',
        name: '锚地区域',
        visibility: 'visible',
        position: empty
          ? []
          : [at(-0.01, -0.006), at(0.01, -0.006), at(0.007, 0.006), at(-0.006, 0.009)],
        style: { 'fill-color': '#168a97', 'fill-opacity': 0.25 },
        outLineStyle: { 'line-color': '#168a97', 'line-width': 3 },
      }),
  )
export default mount
