import { trackData, bdTrackData } from './mock'
import { set } from "lodash-es";
import { Track } from "../../src/modules/Track";
import { LngLat, Map } from "mapbox-gl";
import { TrackItem } from "../../src/types/Track";
import { Tooltip } from "../../src";

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

export function registerTack(map: Map) {
  const list = bdTrackData.data
  const id = `${list[0].terminal}-312312-3131312`
  const track = new Track(map, { startLabel: '起点', endLabel: '终点' })

  Tooltip.DEBUG = false

  map.on('track-hover', e => {
    console.log(e, 'hover');
  })

  map.on('track-unhover', e => {
    console.log(e, 'unhover');
  })

  const options: TrackItem[] = list.map((item, index) => {
    return {
      id: id,
      pId: `${id}-point-${String(index)}`,
      index,
      position: new LngLat(item.longitude, item.latitude),
      time: new Date(item.positionDate),
      cog: item.direction,
      sog: item.speed,
      props: item
    }
  })

  track.load(options)
  track.render()

  // const { k, v } = trackData.result
  // const data = kvToJson(k, v)
  // console.log(data, 'data');
  // const id = '490126512-312312-3131312'
  //
  // const track = new Track(map, { startLabel: '起点', endLabel: '终点' })
  //
  // track.load(data.map((item: any, index: any) => {
  //   return {
  //     id: id,
  //     pId: `${id}-point-${String(index)}`,
  //     position: new LngLat(item.lon, item.lat),
  //     time: new Date(Number(item.time)),
  //     cog: item.cog,
  //     sog: item.sog,
  //     props: item
  //   }
  // }))
  //
  // track.render()
}
