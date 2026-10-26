import { LngLat } from 'mapbox-gl'
import type { IAisShipOptions } from '@/types/Ship/AisShip'
import type { ShipMockRecord } from './mockGenerator'

/** Keep Ship.load unchanged; normalize the existing raw AIS-shaped fixtures at the demo boundary. */
export function toShipOptions(item: ShipMockRecord, tooltip = true): IAisShipOptions {
  const [lat, lng] = item.location.split(',').map(Number)
  return {
    type: 'Ais',
    direction: item.hdg ?? 0,
    height: item.length ?? undefined,
    width: item.width ?? undefined,
    id: item.mmsi,
    name: item.cnname?.trim() || item.enname?.trim() || item.mmsi,
    position: new LngLat(lng, lat),
    speed: item.sog,
    hdg: item.hdg ?? 0,
    cog: item.cog,
    rot: item.rot,
    statusId: item.statusId,
    status: item.status,
    time: new Date(Number(item.updateTime)),
    tooltip,
    props: {
      typeId: item.typeId,
      draft: item.draft,
      mock: item.mock,
    },
  }
}
