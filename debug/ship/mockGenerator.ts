/** Synthetic AIS fixtures only. Coordinates approximate offshore test areas, not navigable routes. */
type Coordinate = readonly [number, number]

export const COASTAL_REGIONS = [
  { id: 'liaodong', name: '辽东湾', from: [121.25, 40.2], to: [121.65, 39.95], spread: 0.08 },
  { id: 'bohai', name: '渤海湾', from: [118.1, 38.7], to: [118.6, 38.3], spread: 0.08 },
  { id: 'qinhuangdao', name: '秦皇岛外海', from: [119.7, 39.65], to: [120.1, 39.35], spread: 0.06 },
  { id: 'dalian', name: '大连外海', from: [121.6, 38.7], to: [122.15, 38.65], spread: 0.06 },
  { id: 'yantai', name: '烟台外海', from: [120.7, 38.2], to: [121.5, 37.9], spread: 0.08 },
  { id: 'weihai', name: '威海外海', from: [122.65, 37.45], to: [122.75, 36.95], spread: 0.06 },
  { id: 'qingdao', name: '青岛外海', from: [120.65, 35.9], to: [121.05, 35.55], spread: 0.06 },
  { id: 'lianyungang', name: '日照—连云港', from: [119.9, 35.2], to: [120.1, 34.7], spread: 0.06 },
  { id: 'jiangsu', name: '江苏沿海', from: [121.25, 33.7], to: [121.6, 32.9], spread: 0.08 },
  {
    id: 'shanghai',
    name: '长江口—洋山外海',
    from: [122.25, 31.4],
    to: [122.5, 30.8],
    spread: 0.06,
  },
  {
    id: 'zhoushan',
    name: '宁波舟山外海',
    from: [122.55, 30.25],
    to: [122.65, 29.55],
    spread: 0.06,
  },
  { id: 'wenzhou', name: '台州—温州外海', from: [121.4, 28.1], to: [121.5, 27.8], spread: 0.05 },
  { id: 'fuzhou', name: '宁德—福州外海', from: [120.05, 26.6], to: [120.2, 25.95], spread: 0.05 },
  { id: 'quanzhou', name: '泉州外海', from: [119.15, 24.7], to: [119.25, 24.35], spread: 0.04 },
  { id: 'xiamen', name: '厦门外海', from: [118.25, 24.05], to: [118.4, 23.8], spread: 0.04 },
  { id: 'taiwan-strait', name: '台湾海峡', from: [119.2, 23.4], to: [119.7, 24.6], spread: 0.05 },
  {
    id: 'taiwan-east',
    name: '台湾东部外海',
    from: [122.25, 25.05],
    to: [122.15, 23.9],
    spread: 0.06,
  },
  { id: 'shantou', name: '汕头外海', from: [116.85, 23.0], to: [117.3, 22.95], spread: 0.06 },
  { id: 'pearl', name: '珠江口—香港外海', from: [113.75, 21.8], to: [114.5, 21.9], spread: 0.06 },
  { id: 'yangjiang', name: '阳江—茂名外海', from: [111.3, 20.7], to: [112.2, 21.25], spread: 0.06 },
  { id: 'beibu', name: '北部湾', from: [108.4, 21.2], to: [108.3, 20.6], spread: 0.08 },
  { id: 'qiongzhou', name: '琼州海峡', from: [110.2, 20.16], to: [110.65, 20.17], spread: 0.008 },
  {
    id: 'hainan-east',
    name: '海南东部外海',
    from: [111.1, 19.8],
    to: [110.65, 18.55],
    spread: 0.05,
  },
  { id: 'sanya', name: '三亚外海', from: [109.1, 18.08], to: [109.85, 17.95], spread: 0.04 },
] as const satisfies readonly {
  id: string
  name: string
  from: Coordinate
  to: Coordinate
  spread: number
}[]

export type CoastalRegionId = (typeof COASTAL_REGIONS)[number]['id']

// Test profiles, not a complete AIS classification catalogue.
export const SHIP_PROFILES = [
  { name: '集装箱船', typeId: 70, length: [180, 400], width: [28, 61], speed: [12, 23] },
  { name: '散货船', typeId: 70, length: [120, 300], width: [20, 50], speed: [8, 16] },
  { name: '油轮', typeId: 80, length: [160, 330], width: [25, 60], speed: [9, 16] },
  { name: 'LNG运输船', typeId: 80, length: [230, 345], width: [36, 54], speed: [12, 20] },
  { name: '客轮', typeId: 60, length: [90, 330], width: [16, 43], speed: [12, 24] },
  { name: '高速客船', typeId: 40, length: [24, 70], width: [7, 18], speed: [25, 38] },
  { name: '滚装船', typeId: 70, length: [120, 220], width: [20, 35], speed: [10, 20] },
  { name: '渔船', typeId: 30, length: [12, 65], width: [3, 12], speed: [2, 11] },
  { name: '拖轮', typeId: 52, length: [18, 45], width: [6, 14], speed: [2, 12] },
  { name: '引航艇', typeId: 50, length: [12, 30], width: [4, 8], speed: [8, 20] },
  { name: '搜救船', typeId: 51, length: [25, 110], width: [6, 20], speed: [12, 28] },
  { name: '巡逻船', typeId: 55, length: [30, 140], width: [7, 22], speed: [12, 25] },
  { name: '工程船', typeId: 33, length: [45, 160], width: [12, 35], speed: [1, 8] },
  { name: '帆船', typeId: 36, length: [8, 25], width: [2, 7], speed: [2, 8] },
  { name: '游艇', typeId: 37, length: [8, 55], width: [2, 10], speed: [6, 25] },
  { name: '未知船型', typeId: null, length: [15, 80], width: [4, 14], speed: [3, 12] },
] as const

export interface ShipMockRecord {
  mmsi: string
  hdg: number | null
  cog: number
  rot: number
  updateTime: string
  sog: number
  /** Preserve the existing raw-data convention: latitude,longitude. */
  location: string
  cnname: string | null
  enname: string | null
  typeId: number | null
  length: number | null
  width: number | null
  statusId: number
  status: string
  draft?: number | null
  toBow?: number | null
  toStern?: number | null
  toStarboard?: number | null
  toPort?: number | null
  mock?: {
    synthetic: true
    region: CoastalRegionId
    regionName: string
    vesselType: string
    freshness: 'online' | 'delay' | 'offline'
    scenario: string
    distribution: 'corridor' | 'offshore' | 'dense'
  }
}

export interface ShipMockOptions {
  count?: number
  region?: CoastalRegionId | 'all'
  seed?: number
  now?: number
}

const scenarios = [
  '正常航行',
  '左转',
  '右转',
  '靠泊',
  '锚泊',
  '失控',
  '操纵受限',
  '吃水受限',
  '搁浅',
  '捕捞',
  '帆航',
  '状态未知',
  '北向零度',
  '接近360度',
  '艏向无效',
  '艏向航向均无效',
  '转向率未知',
  '速度0.49',
  '速度0.50',
  '速度0.51',
  '缺少尺寸',
  '零尺寸',
  '超长船名',
  '英文船名',
  '空船名',
] as const

function randomGenerator(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

/** Same seed produces stable IDs/positions; now is captured per load so status colours stay useful. */
export function createShipMockData(options: ShipMockOptions = {}): ShipMockRecord[] {
  const { count = 6000, region = 'all', seed = 20261014, now = Date.now() } = options
  if (!Number.isInteger(count) || count < 0 || count > 50000)
    throw new RangeError('Mock count must be an integer between 0 and 50000')
  if (!Number.isFinite(seed) || !Number.isFinite(now))
    throw new RangeError('Mock seed and now must be finite numbers')
  const regions = COASTAL_REGIONS.filter((item) => region === 'all' || item.id === region)
  if (!regions.length) throw new RangeError(`Unknown mock region: ${region}`)
  const random = randomGenerator(seed)
  const between = (min: number, max: number): number => min + random() * (max - min)
  const round = (value: number): number => Math.round(value * 10) / 10

  return Array.from({ length: count }, (_, i) => {
    const area = regions[i % regions.length]
    const regionIndex = COASTAL_REGIONS.findIndex((item) => item.id === area.id)
    const localIndex = Math.floor(i / regions.length)
    const scenario = scenarios[(localIndex * 7 + regionIndex) % scenarios.length]
    const profile =
      SHIP_PROFILES[
        scenario === '捕捞'
          ? 7
          : scenario === '帆航'
            ? 13
            : (localIndex + regionIndex) % SHIP_PROFILES.length
      ]
    const distribution =
      localIndex % 10 < 6 ? 'corridor' : localIndex % 10 < 8 ? 'offshore' : 'dense'
    const t = distribution === 'dense' ? 0.2 : random()
    const spread =
      area.spread * (distribution === 'dense' ? 0.025 : distribution === 'corridor' ? 0.15 : 1)
    const angle = random() * Math.PI * 2
    const radius = Math.sqrt(random()) * spread
    const lat = area.from[1] + (area.to[1] - area.from[1]) * t + Math.sin(angle) * radius
    const lng = area.from[0] + (area.to[0] - area.from[0]) * t + Math.cos(angle) * radius
    const bearing =
      (Math.atan2(
        (area.to[0] - area.from[0]) * Math.cos((lat * Math.PI) / 180),
        area.to[1] - area.from[1],
      ) *
        180) /
      Math.PI
    let cog = round((bearing + (localIndex % 2 ? 180 : 0) + 360) % 360)
    let hdg = cog
    let rot = 0
    let sog = round(between(profile.speed[0], profile.speed[1]))
    let statusId = 0
    let status = '在航（主机推动）'
    let length: number | null = Math.round(between(profile.length[0], profile.length[1]))
    let width: number | null = Math.round(between(profile.width[0], profile.width[1]))
    width = Math.min(width, Math.max(2, Math.round(length * 0.42)))
    // Region-based reserved fixture IDs: unique across regions, stable across count changes.
    const mmsi = String(990000000 + regionIndex * 100000 + localIndex + 1)
    let cnname: string | null = `模拟·${area.name}${profile.name}${localIndex + 1}`
    let enname: string | null = `MOCK ${area.id.toUpperCase()} ${localIndex + 1}`
    switch (scenario) {
      case '左转':
        rot = -25
        break
      case '右转':
        rot = 25
        break
      case '靠泊':
        statusId = 5
        status = '靠泊'
        sog = 0
        break
      case '锚泊':
        statusId = 1
        status = '锚泊'
        sog = 0.2
        break
      case '失控':
        statusId = 2
        status = '失控'
        sog = 0.8
        break
      case '操纵受限':
        statusId = 3
        status = '操纵受限'
        sog = 2
        break
      case '吃水受限':
        statusId = 4
        status = '吃水受限'
        sog = 5
        break
      case '搁浅':
        statusId = 6
        status = '搁浅'
        sog = 0
        break
      case '捕捞':
        statusId = 7
        status = '捕捞作业'
        sog = 3
        break
      case '帆航':
        statusId = 8
        status = '在航（帆航）'
        break
      case '状态未知':
        statusId = 15
        status = '未规定'
        break
      case '北向零度':
        hdg = cog = 0
        break
      case '接近360度':
        hdg = cog = 359.9
        break
      case '艏向无效':
        hdg = 511
        break
      case '艏向航向均无效':
        hdg = 511
        cog = 360
        break
      case '转向率未知':
        rot = -128
        break
      case '速度0.49':
        sog = 0.49
        break
      case '速度0.50':
        sog = 0.5
        break
      case '速度0.51':
        sog = 0.51
        break
      case '缺少尺寸':
        length = width = null
        break
      case '零尺寸':
        length = width = 0
        break
      case '超长船名':
        cnname = `模拟·${area.name}大型海上综合作业与应急保障测试船-${localIndex + 1}`
        break
      case '英文船名':
        cnname = null
        break
      case '空船名':
        cnname = ''
        enname = null
        break
    }
    // Rotate each block so dense groups are not accidentally all offline.
    const freshnessBucket = (i + Math.floor(i / 10) * 3) % 10
    const freshness = freshnessBucket < 6 ? 'online' : freshnessBucket < 8 ? 'delay' : 'offline'
    const age =
      freshness === 'online'
        ? between(5, 1200)
        : freshness === 'delay'
          ? between(2400, 6600)
          : between(9000, 86400)
    const toBow = length ? Math.round(length * 0.65) : null
    const toPort = width ? Math.floor(width / 2) : null
    return {
      mmsi,
      hdg,
      cog,
      rot,
      sog,
      length,
      width,
      cnname,
      enname,
      statusId,
      status,
      updateTime: String(Math.floor(now - age * 1000)),
      location: `${lat.toFixed(6)},${lng.toFixed(6)}`,
      typeId: profile.typeId,
      draft: length && width ? round(Math.min(width * 0.25, 22)) : null,
      toBow,
      toStern: length && toBow !== null ? length - toBow : null,
      toPort,
      toStarboard: width && toPort !== null ? width - toPort : null,
      mock: {
        synthetic: true,
        region: area.id,
        regionName: area.name,
        vesselType: profile.name,
        freshness,
        scenario,
        distribution,
      },
    }
  })
}
