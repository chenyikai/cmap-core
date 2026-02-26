import { CMap } from "../src/modules/CMap";
import '../src/styles/index.scss'
import { initShip } from "./ship";
import { registerTack } from "./track";
import { Point } from '@/modules/Plot/plugins/Point'
import { IndexPoint } from '@/modules/Plot/plugins/IndexPoint'
import { LngLat } from 'mapbox-gl'
import { Tooltip } from '@/core/Tooltip'

const cMap = new CMap({
  container: 'map',
  type: CMap.LAND,
  center: [122.09160659512042, 30.004767949301183],
  zoom: 14,
});

setTimeout(() => {
  // cMap.change(CMap.LAND)
}, 2000)

cMap.on('loaded', (map) => {

  window.map = map

  // map.showCollisionBoxes = true
  const flag = false

  if (flag) {
    initShip(cMap)
  }

  const trackFlag = false

  if (trackFlag) {
    registerTack(map)
  }

  // const point = new Point(map, {
  //   id: '3',
  //   name: '测试' + Date.now(),
  //   tooltip: true,
  // })
  //
  // point.start()
  //
  // point.once('Point.create', (data) => {
  //   console.log(data, 'dakdhajhdja');
  //   point.edit()
  // })

  // Tooltip.DEBUG = true
  //

  const index = new IndexPoint(map, {
    id: '1',
    name: '浙江宝驿4s店',
    index: 1,
    tooltip: false,
    style: {
      'text-color': '#f00'
    },
    position: new LngLat(122.09660659512042, 30.004767949301183)
  })

  index.render()

  // index.on('dblclick', () => {
  //   index.edit()
  // })

  index.edit()

  // const point = new Point(map, {
  //   id: '12',
  //   name: '浙江宝驿4s店',
  //   tooltip: true,
  //   position: new LngLat(122.09160659512042, 30.004767949301183)
  // })
  //
  // point.render()
  //
  // point.edit()
  //
  // point.on('hover', (data) => {
  //   console.log(data, 'point');
  // })
  //
  // const point1= new Point(map, {
  //   id: '12',
  //   name: '23',
  //   tooltip: true,
  //   position: new LngLat(122.09560659512042, 30.004767949301183)
  // })
  //
  // point1.on('hover', (data) => {
  //   console.log(data, 'point1');
  // })
  //
  // point1.render()
})
