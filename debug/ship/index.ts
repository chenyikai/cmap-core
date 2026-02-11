import axios from 'axios'
import { LngLat, Map } from "mapbox-gl";
import { set } from "lodash-es";
import { IAisShipOptions } from "../../src/types/Ship/AisShip";
import Ship from "../../src/modules/Ship";
import { CMap } from "../../src/modules/CMap"
import { staticShipData, gjShipData } from "./mock";
import { AisShip, Tooltip } from "../../src";
import  IconManager from "../../src/core/IconManager";

import wjhgyc from "./icon/wjhgyc.png";
import yjhgyc from "./icon/yjhgyc.png";
import wjhnmgyc from "./icon/wjhnmgyc.png";
import yjhnmgyc from "./icon/yjhnmgyc.png";
import yjhnmsyc from "./icon/yjhnmsyc.png";
import yjhsyc from "./icon/yjhsyc.png";
import zyzgyc from "./icon/zyzgyc.png";
import zyznmgyc from "./icon/zyznmgyc.png";
import zyznmsyc from "./icon/zyznmsyc.png";
import zyzsyc from "./icon/zyzsyc.png";
import qwc from "./icon/qwc.png";

let ship: Ship | null = null

export function initShip(cMap: CMap) {
  cMap.mapLoaded().then(map => {
    window.ship = ship = new Ship(map, {
      plugins: [AisShip]
    });

    const icon = new IconManager(map)
    icon.load([
      {
        name: "wjhgyc",
        url: wjhgyc,
      },
      {
        name: "yjhgyc",
        url: yjhgyc,
      },
      {
        name: "zyzgyc",
        url: zyzgyc,
      },
      {
        name: "wjhnmgyc",
        url: wjhnmgyc,
      },
      {
        name: "yjhnmgyc",
        url: yjhnmgyc,
      },
      {
        name: "zyznmgyc",
        url: zyznmgyc,
      },
      {
        name: "yjhsyc",
        url: yjhsyc,
      },
      {
        name: "zyzsyc",
        url: zyzsyc,
      },
      {
        name: "yjhnmsyc",
        url: yjhnmsyc,
      },
      {
        name: "zyznmsyc",
        url: zyznmsyc,
      },
      {
        name: "qwc",
        url: qwc,
      },
    ])

    setTimeout(() => {
      // ship!.select('413363020')
    }, 2000)

    // getShipData(map, false)
    getGjShipData(map)

    map.on('moveend', () => {
      // getShipData(map, false);
      getGjShipData(map);
    });
  })
}


function getBounds(map: Map) {
  const { _ne: maxData, _sw: minData } = map.getBounds()!;
  const level = map.getZoom();
  return {
    maxLon: maxData.lng,
    minLon: minData.lng,
    maxLat: maxData.lat,
    minLat: minData.lat,
    level,
  };
}

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

function getGjShipData(map: Map) {
  // if (map.getZoom() < 12 && ship) {
  //   // ship.removeAll()
  //   return
  // }

  const list: Array<IAisShipOptions> = gjShipData.map((item: any) => {
    const option: IAisShipOptions = {
      type: "Ais",
      direction: item.hdg || 0,
      height: item.length,
      id: item.mmsi,
      icon: item.shipIcon,
      name: item.shipName,
      position: new LngLat(Number(item.lon), Number(item.lat)),
      speed: item.sog > 50 ? 0 : item.sog,
      hdg: item.hdg || 0,
      cog: item.cog,
      rot: item.rot,
      statusId: item.statusId,
      status: item.status,
      time: item.updateTime,
      width: item.width,
      top: item.toBow,
      bottom: item.toStern,
      right: item.toStarboard,
      left: item.toPort,
      tooltip: true,
    };

    return option
  });

  if (ship) {
    ship.load(list)
  }
}

function getShipData(map: Map, isStatic: boolean = false) {
  if (isStatic) {
    renderShip(map, staticShipData)
    return
  }

  axios
    .post('/ship/rest/ehhship/getShipDataList', getBounds(map), {
      headers: {
        Authorization: 'bearer 420e1725-cef0-4b33-93e7-608e83724d14',
      },
    })
    .then(({ data }) => {
      if (Object.values(data.data).length === 0 && ship) {
        ship.removeAll()
        return
      }
      renderShip(map, data.data)
    });
}

function renderShip(_map: Map, data: any) {
  if (_map.getZoom() < 12 && ship) {
    ship.removeAll()
    return
  }

  const { k, v } = data;
  let shipData = []
  if (k && v) {
     shipData  = kvToJson(k, v);
  } else {
     shipData  = data
  }

  Tooltip.DEBUG = false

  const list: Array<IAisShipOptions> = shipData.map((item: any) => {
    const [lat, lon] = item.location.split(',');

    const option: IAisShipOptions = {
      type: "Ais",
      direction: item.hdg || 0,
      height: item.length,
      id: item.mmsi,
      name: item.cnname || item.enname || item.mmsi,
      position: new LngLat(Number(lon), Number(lat)),
      speed: item.sog > 20 ? 0 : item.sog,
      hdg: item.hdg || 0,
      cog: item.cog,
      rot: item.rot,
      statusId: item.statusId,
      status: item.status,
      time: item.updateTime,
      width: item.width,
      top: item.toBow,
      bottom: item.toStern,
      right: item.toStarboard,
      left: item.toPort,
      tooltip: true,
    };

    return option
  });

  if (ship) {
    ship.load(list)
  }
}
