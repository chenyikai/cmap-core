import { CMap } from "../src/modules/CMap";
import { AisShip } from "../src/modules/Ship/plugins/AisShip";
import { IAisShipOptions } from "../src/types/Ship/AisShip";
import { set } from 'lodash-es'
import { shipData } from "./ship/mock";
import { LngLat } from 'mapbox-gl'
import { ResidentEvent } from '@/modules/Ship/Events/ResidentEvent'
import 'mapbox-gl/dist/mapbox-gl.css'
import '../src/styles/ship.scss'
import Collision from '../src/core/Collision/index'


function kvToJson(k: any, v: any) {
  const list: any = [];
  v.forEach((valueItem: any) => {
    let data = {};
    valueItem.forEach((item: any, index: any) => {
      if (Array.isArray(item)) {
        set(data, 'list', {
          k: k[index],
          v: item,
        });
      } else {
        set(data, k[index], item);
      }
    });
    list.push(data);
  });
  return list;
}

console.log(kvToJson);

const cMap = new CMap({
  container: 'map',
  type: CMap.LAND,
  center: [122.09160659512042, 30.004767949301183],
  zoom: 14,
});

cMap.on('loaded', (map) => {
  window.map = map

  const aisShips = shipData
    .map((item: any) => {
    const [lat, lon] = item.location.split(',');

    const options: IAisShipOptions = {
      direction: item.hdg || 0,
      height: item.length,
      id: item.mmsi,
      name: item.cnname || item.enname || item.mmsi,
      position: new LngLat(Number(lon), Number(lat)),
      speed: item.sog,
      hdg: item.hdg || 0,
      cog: item.cog,
      rot: item.rot,
      statusId: item.statusId,
      status: item.status,
      time: item.updateTime,
      type: 'ais',
      width: item.width,
      top: item.toBow,
      bottom: item.toStern,
      right: item.toStarboard,
      left: item.toPort,
      tooltip: true,
      immediate: true
    };

    return new AisShip(map, options)
  });

  const tooltips = aisShips.map(ship => ship.tooltip);

  const collisions = aisShips.flatMap(ship => {
      if (ship.tooltip) {
        return [{
          id: ship.tooltip.id,
          ...ship.tooltip.getAllBbox()
        }]
      } else {
        return []
      }
    })

  const collision = new Collision(map, { collisions: [] });

  collision.load(collisions).forEach((collision) => {
    const tooltip = tooltips.find((tooltip) => tooltip?.id === collision.id);
    if (!tooltip) return;

    if (collision.visible) {
      tooltip.setAnchor(collision.dir);
    } else {
      tooltip.hide();
    }
  });

  new ResidentEvent(map, aisShips)
})
