import assert from 'node:assert/strict'
import test from 'node:test'
import { load, plain } from '../tooltip/harness.mjs'

const { COASTAL_REGIONS, SHIP_PROFILES, createShipMockData } = load('debug/ship/mockGenerator')
const { toShipOptions } = load('debug/ship/mockAdapter')
const { staticShipData } = load('debug/ship/mock')
const now = Date.UTC(2026, 9, 14, 8)
const all = createShipMockData({ now })

test('coastal default creates 6000 unique fixtures covering every offshore region', () => {
  assert.equal(all.length, 6000)
  assert.equal(new Set(all.map((item) => item.mmsi)).size, all.length)
  assert.equal(new Set(all.map((item) => item.mock.region)).size, 24)
  for (const area of COASTAL_REGIONS) {
    const local = all.filter((item) => item.mock.region === area.id)
    assert.equal(local.length, 250)
    for (const item of local) {
      const [lat, lng] = item.location.split(',').map(Number)
      assert.match(item.mmsi, /^99\d{7}$/)
      assert.equal(item.mock.synthetic, true)
      assert.ok(lng >= Math.min(area.from[0], area.to[0]) - area.spread - 1e-6)
      assert.ok(lng <= Math.max(area.from[0], area.to[0]) + area.spread + 1e-6)
      assert.ok(lat >= Math.min(area.from[1], area.to[1]) - area.spread - 1e-6)
      assert.ok(lat <= Math.max(area.from[1], area.to[1]) + area.spread + 1e-6)
    }
  }
  const coordinates = all.map((item) => item.location.split(',').map(Number))
  assert.ok(Math.min(...coordinates.map(([lat]) => lat)) < 18)
  assert.ok(Math.max(...coordinates.map(([lat]) => lat)) > 40)
  assert.ok(Math.min(...coordinates.map(([, lng]) => lng)) < 109)
  assert.ok(Math.max(...coordinates.map(([, lng]) => lng)) > 122)
})

test('each region includes all vessel profiles, boundary cases, layouts and freshness states', () => {
  for (const area of COASTAL_REGIONS) {
    const local = all.filter((item) => item.mock.region === area.id)
    assert.equal(new Set(local.map((item) => item.mock.vesselType)).size, SHIP_PROFILES.length)
    assert.equal(new Set(local.map((item) => item.mock.scenario)).size, 25)
    assert.equal(new Set(local.map((item) => item.mock.distribution)).size, 3)
    assert.equal(new Set(local.map((item) => item.mock.freshness)).size, 3)
  }
  for (const heading of [0, 359.9, 511]) assert.ok(all.some((item) => item.hdg === heading))
  for (const speed of [0, 0.49, 0.5, 0.51]) assert.ok(all.some((item) => item.sog === speed))
  for (const rot of [-128, -25, 0, 25]) assert.ok(all.some((item) => item.rot === rot))
  for (const status of [0, 1, 2, 3, 4, 5, 6, 7, 8, 15])
    assert.ok(all.some((item) => item.statusId === status))
  assert.ok(all.some((item) => item.length === null && item.width === null))
  assert.ok(all.some((item) => item.length === 0 && item.width === 0))
  assert.ok(all.some((item) => item.length >= 380))
  assert.ok(all.some((item) => item.length <= 10 && item.length > 0))
})

test('timestamps match actual AisShip online/delay/offline thresholds and refresh on each load', () => {
  for (const item of all) {
    const age = now - Number(item.updateTime)
    const expected = age <= 1800000 ? 'online' : age <= 7200000 ? 'delay' : 'offline'
    assert.equal(item.mock.freshness, expected)
  }
  const later = createShipMockData({ now: now + 86400000 })
  for (let i = 0; i < all.length; i++) {
    assert.equal(Number(later[i].updateTime) - Number(all[i].updateTime), 86400000)
    assert.equal(later[i].location, all[i].location)
    assert.equal(later[i].mmsi, all[i].mmsi)
  }
})

test('seeded generation is repeatable, stable when expanding, and returns independent objects', () => {
  const options = { count: 100, seed: 42, now }
  const first = createShipMockData(options)
  const second = createShipMockData(options)
  assert.deepEqual(plain(first), plain(second))
  assert.deepEqual(
    plain(first),
    plain(createShipMockData({ ...options, count: 1000 }).slice(0, 100)),
  )
  first[0].mock.scenario = 'changed'
  assert.notEqual(first[0].mock.scenario, second[0].mock.scenario)
  assert.notEqual(first[0].location, createShipMockData({ ...options, seed: 43 })[0].location)
})

test('regional and 20000-vessel stress presets have exact counts and collision-free IDs', () => {
  const regional = createShipMockData({ count: 1000, region: 'zhoushan', now })
  assert.equal(regional.length, 1000)
  assert.ok(regional.every((item) => item.mock.region === 'zhoushan'))
  for (const distribution of ['dense', 'corridor', 'offshore']) {
    assert.equal(
      new Set(
        regional
          .filter((item) => item.mock.distribution === distribution)
          .map((item) => item.mock.freshness),
      ).size,
      3,
    )
  }
  const stress = createShipMockData({ count: 20000, now })
  assert.equal(stress.length, 20000)
  assert.equal(new Set(stress.map((item) => item.mmsi)).size, 20000)
  assert.equal(createShipMockData({ count: 0, now }).length, 0)
})

test('adapter preserves names, AIS sentinels, dimensions, coordinates and metadata', () => {
  for (const item of all) {
    const options = toShipOptions(item)
    const [lat, lng] = item.location.split(',').map(Number)
    assert.equal(options.position.lng, lng)
    assert.equal(options.position.lat, lat)
    assert.equal(options.name, item.cnname?.trim() || item.enname?.trim() || item.mmsi)
    assert.equal(options.time.valueOf(), Number(item.updateTime))
    assert.equal(options.hdg, item.hdg)
    assert.equal(options.cog, item.cog)
    assert.equal(options.statusId, item.statusId)
    assert.equal(options.height, item.length ?? undefined)
    assert.equal(options.type, 'Ais')
    assert.equal(options.props.mock.synthetic, true)
  }
  assert.equal(toShipOptions(all[0], false).tooltip, false)
})

test('legacy Zhoushan fixtures remain unchanged and load through the same adapter', () => {
  assert.equal(staticShipData.length, 198)
  const before = JSON.stringify(staticShipData)
  for (const item of staticShipData) {
    const options = toShipOptions(item)
    assert.ok(Number.isFinite(options.time.valueOf()))
    assert.ok(Number.isFinite(options.position.lng))
    assert.ok(options.name.length > 0)
  }
  assert.equal(JSON.stringify(staticShipData), before)
})

test('invalid generation settings fail explicitly instead of allocating unbounded fixtures', () => {
  for (const count of [-1, 1.5, Infinity, NaN, 50001])
    assert.throws(() => createShipMockData({ count }), /Mock count/)
  assert.throws(() => createShipMockData({ region: 'missing' }), /Unknown mock region/)
  assert.throws(() => createShipMockData({ seed: NaN }), /finite/)
  assert.throws(() => createShipMockData({ now: Infinity }), /finite/)
})
