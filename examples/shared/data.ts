import { AisShip, type IAisShipOptions, type TrackItem } from 'cmap-core'
import { at } from './demo'

export function ships(count = 9): IAisShipOptions[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `demo-ship-${i}`,
    type: AisShip.NAME,
    name: ['货轮', '渔船', '拖轮'][i % 3] + String(i + 1).padStart(2, '0'),
    position: at(((i % 3) - 1) * 0.0018, (Math.floor(i / 3) - 1) * 0.0017),
    direction: i * 40,
    hdg: (i * 40) % 360,
    cog: (i * 40) % 360,
    speed: i % 3 === 0 ? 0 : 1.5,
    rot: [0, -25, 25][i % 3],
    width: [20, 32, 12][i % 3],
    height: [90, 120, 45][i % 3],
    time: new Date(Date.now() - (i % 3) * 3700000),
    tooltip: true,
  }))
}

export function route(id = 'route-1', shift = 0): TrackItem[] {
  return [
    [-0.014, -0.009],
    [-0.008, -0.004],
    [-0.003, 0.002],
    [0.004, 0.003],
    [0.011, 0.01],
  ].map(([x, y], i) => ({
    id,
    pId: `${id}-point-${i}`,
    index: i,
    position: at(x, y + shift),
    time: new Date(Date.now() + i * 600000),
    sog: 8,
  }))
}

export const beaconSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="48" viewBox="0 0 40 48"><path d="M20 46C12 33 3 25 3 17a17 17 0 1 1 34 0c0 8-9 16-17 29Z" fill="#087f8c" stroke="white" stroke-width="2"/><circle cx="20" cy="17" r="6" fill="white"/></svg>'
