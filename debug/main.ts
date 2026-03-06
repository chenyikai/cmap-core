import { CMap } from "../src/modules/CMap";
import "../src/styles/index.scss";
import { initShip } from "./ship";
import { registerTack } from "./track";
import { registerPlot } from "./plot";
import { Map, LngLat } from "mapbox-gl";

const cMap = new CMap({
  container: 'map',
  type: CMap.LAND,
  center: [122.09160659512042, 30.004767949301183],
  zoom: 14,
});

setTimeout(() => {
  // cMap.change(CMap.LAND)
}, 2000)

cMap.on('loaded', (map: Map) => {

  // @ts-ignore
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

  const plotFlag = true
  if (plotFlag) {
    registerPlot(map)
  }

  // const list: number[][] = []
  // map.on('click', e => {
  //   list.push([e.lngLat.lng, e.lngLat.lat])
  //
  //   console.log(list, 'list');
  // })

})
