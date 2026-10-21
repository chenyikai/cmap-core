import assert from 'node:assert/strict'
import test from 'node:test'
import mapbox from 'mapbox-gl'
import { rhumbBearing, rhumbDistance, point } from '@turf/turf'
import { createMap, load, plain } from '../tooltip/harness.mjs'

const { default: Ship } = load('src/modules/Ship')
const { AisShip } = load('src/modules/Ship/plugins/AisShip')
const { ResidentEvent } = load('src/modules/Ship/Events/ResidentEvent')
const { pixelsToMeters } = load('src/utils/util')
const data = (id, extra = {}) => ({
  id,
  type: AisShip.NAME,
  name: String(id),
  position: new mapbox.LngLat(100, 40),
  time: new Date(),
  speed: 0,
  rot: 0,
  cog: 90,
  hdg: 90,
  direction: 90,
  tooltip: false,
  ...extra,
})

function fixture() {
  const f = createMap()
  const states = new Map(),
    focus = new Map(),
    writes = []
  f.map.getFeatureState = ({ id }) => states.get(String(id)) ?? {}
  f.map.setFeatureState = ({ id }, value) =>
    states.set(String(id), { ...states.get(String(id)), ...value })
  f.map.removeFeatureState = ({ id }) => states.delete(String(id))
  f.map.flyTo = () => f.map
  f.map.stop = () => f.map
  f.map.isMoving = () => true
  f.map.context.focus.set = (feature) => focus.set(String(feature.id), feature)
  f.map.context.focus.remove = (id) => focus.delete(String(id))
  const submit = f.map.context.register.setGeoJSONData.bind(f.map.context.register)
  f.map.context.register.setGeoJSONData = (source, features) => {
    writes.push(features)
    submit(source, features)
  }
  const manager = new Ship(f.map, { plugins: [AisShip] })
  return { ...f, states, focus, writes, manager }
}

test('add renders immediately; duplicate numeric/string IDs update one shared instance', () => {
  const f = fixture()
  const first = f.manager.add(data(123, { tooltip: true, name: 'old' }))
  const label = first.tooltip
  assert.equal(f.features.size, 1)
  const second = f.manager.add(data('123', { tooltip: true, name: 'new' }))
  assert.equal(second, first)
  assert.equal(f.manager.ships.length, 1)
  assert.equal(f.manager.get('123'), first)
  assert.equal(f.manager.event.findShip(123), first)
  assert.equal(first.options.name, 'new')
  assert.equal(first.tooltip, label)
  assert.equal(label.options.text, 'new')
  assert.equal(first.isSelf({ features: [{ id: '123' }] }), true)
  f.manager.remove('123')
  assert.equal(f.features.size, 0)
  assert.equal(f.manager.ships.length, 0)
  assert.equal(f.manager.event.findShip(123), undefined)
  f.manager.destroy()
})

test('load deduplicates IDs (last data wins), reuses objects and replaces plugin types', () => {
  class Other extends AisShip {
    static NAME = 'Other'
  }
  const f = fixture()
  f.manager.destroy()
  const manager = new Ship(f.map, { plugins: [AisShip, Other] })
  const result = manager.load([data(1), data('1', { name: 'last' }), data(2)])
  assert.equal(result.length, 2)
  assert.equal(manager.ships.length, 2)
  assert.equal(manager.get(1).options.name, 'last')
  const previous = manager.get(1)
  manager.focus(1)
  manager.load([data(1, { type: Other.NAME })])
  assert.notEqual(manager.get(1), previous)
  assert.equal(manager.event.findShip('1'), manager.get(1))
  assert.equal(manager.get(2), undefined)
  assert.equal(f.features.size, 1)
  assert.equal(manager.get(1).isFocus, true)
  manager.destroy()
})

test('select then remove cannot resurrect a ship at moveend; remove is idempotent', () => {
  const f = fixture()
  const ship = f.manager.add(data('s'))
  f.manager.select('s')
  f.manager.remove('s')
  f.map.fire('moveend')
  ship.render()
  ship.focus()
  ship.update(data('s'))
  ship.remove()
  assert.equal(f.features.size, 0)
  assert.equal(f.focus.size, 0)
  assert.equal(f.states.size, 0)
  assert.equal(f.map.listenerCount('moveend'), 0)
  f.manager.destroy()
})

test('unselect and switching selection cancel pending focus, including synchronous flyTo', () => {
  const f = fixture()
  f.manager.load([data('a'), data('b')])
  f.manager.select('a')
  f.manager.unselect('a')
  f.map.fire('moveend')
  assert.equal(f.manager.get('a').isFocus, false)
  f.manager.select('a')
  f.manager.select('b')
  f.map.fire('moveend')
  assert.equal(f.manager.get('a').isFocus, false)
  assert.equal(f.manager.get('b').isFocus, true)
  f.map.flyTo = () => {
    f.map.fire('moveend')
    return f.map
  }
  f.manager.select('a')
  assert.equal(f.manager.get('a').isFocus, true)
  f.manager.destroy()
})

test('zero IDs support events; clearing ships clears hover/cursor/state/focus', () => {
  const f = fixture()
  let clicks = 0,
    hovers = 0
  f.map.context.events.on('click', () => clicks++)
  f.map.context.events.on('hover', () => hovers++)
  f.manager.add(data(0))
  f.manager.event.onClick({ features: [{ id: 0 }] })
  f.manager.event.onMove({ features: [{ id: 0 }] })
  assert.equal(clicks, 1)
  assert.equal(hovers, 1)
  assert.equal(f.manager.get(0).isHover, true)
  f.manager.focus(0)
  f.manager.removeAll()
  assert.equal(f.container.style.cursor, '')
  assert.equal(f.states.size, 0)
  assert.equal(f.focus.size, 0)
  f.manager.load([data(0)])
  f.manager.event.onMove({ features: [{ id: 0 }] })
  assert.equal(hovers, 2)
  assert.equal(f.manager.get(0).isFocus, false)
  f.manager.destroy()
})

test('cancelled beforeRemove retains ships; actual removal releases listeners without touching removed map resources', () => {
  const f = fixture()
  f.manager.add(data('s', { tooltip: true }))
  f.manager.select('s')
  f.map.fire('beforeRemove', { cancel() {} })
  assert.equal(f.manager.ships.length, 1)
  const fail = () => {
    throw new Error('Map resources already removed')
  }
  f.map.getCanvasContainer = fail
  f.map.getFeatureState = fail
  f.map.setFeatureState = fail
  f.map.removeFeatureState = fail
  f.map.context.focus.remove = fail
  f.map.context.register.setGeoJSONData = fail
  f.map.fire('remove')
  assert.equal(f.manager.ships.length, 0)
  assert.equal(f.map.listenerCount(), 0)
  assert.equal(f.container.children.length, 0)
  f.manager.destroy()
})

test('standalone ResidentEvent constructor and methods remain usable', () => {
  const f = fixture()
  const ship = f.manager.add(data(7))
  const events = new ResidentEvent(f.map, [ship])
  assert.equal(events.findShip('7'), ship)
  events.add(ship)
  events.remove('7')
  assert.equal(events.findShip(7), undefined)
  events.add(ship)
  events.destroy()
  f.manager.destroy()
})

function geographicMap(map) {
  map.setZoom(16)
  const center = mapbox.MercatorCoordinate.fromLngLat([100, 40])
  let bearing = 0,
    pitchScale = 1
  map.project = (value) => {
    const p = mapbox.MercatorCoordinate.fromLngLat(value)
    const scale = 512 * 2 ** map.getZoom()
    const dx = (p.x - center.x) * scale,
      dy = (p.y - center.y) * scale
    return new mapbox.Point(
      400 + dx * Math.cos(bearing) + dy * Math.sin(bearing),
      300 + (-dx * Math.sin(bearing) + dy * Math.cos(bearing)) * pitchScale,
    )
  }
  map.unproject = (value) => {
    const p = mapbox.Point.convert(value),
      x = p.x - 400,
      y = (p.y - 300) / pitchScale
    const scale = 512 * 2 ** map.getZoom()
    return new mapbox.MercatorCoordinate(
      center.x + (x * Math.cos(bearing) - y * Math.sin(bearing)) / scale,
      center.y + (x * Math.sin(bearing) + y * Math.cos(bearing)) / scale,
    ).toLngLat()
  }
  return (degrees, pitch) => {
    bearing = (degrees * Math.PI) / 180
    pitchScale = Math.cos((pitch * Math.PI) / 180)
  }
}

test('real hull remains geographically stable across bearing, pitch, zoom and map-center latitude', () => {
  const f = fixture(),
    camera = geographicMap(f.map)
  const ship = f.manager.add(data('hull', { width: 20, height: 100, hdg: 0, cog: 0 }))
  const before = plain(ship.real().geometry)
  camera(90, 45)
  assert.deepEqual(plain(ship.real().geometry), before)
  f.map.setZoom(18)
  f.map.getCenter = () => new mapbox.LngLat(100, 60)
  assert.deepEqual(plain(ship.real().geometry), before)
  const bearing = rhumbBearing(point(ship.position().toArray()), point(before.coordinates[0][0]))
  assert.ok(Math.abs(bearing) < 0.001)
  assert.equal(ship.getShape().head instanceof mapbox.Point, true)
  f.manager.destroy()
})

test('moving real hulls contain only the closed hull, independent of speed, turn and camera', () => {
  const f = fixture(),
    camera = geographicMap(f.map)
  const ship = f.manager.add(data('hull', { width: 20, height: 100 }))
  const hull = plain(ship.real().geometry)
  assert.equal(hull.type, 'Polygon')
  assert.equal(hull.coordinates[0].length, 8)
  assert.deepEqual(hull.coordinates[0][0], hull.coordinates[0].at(-1))
  for (const speed of [0.5, 10, 30]) {
    for (const rot of [0, -128, -25, 25]) {
      ship.update({ ...ship.options, speed, rot })
      camera(75, 45)
      f.map.setZoom(18)
      f.map.fire('zoomend')
      assert.deepEqual(plain(ship.real().geometry), hull)
      assert.deepEqual(plain(f.features.get('hull').geometry), hull)
      assert.equal(f.features.size, 2)
      camera(0, 0)
      f.map.setZoom(16)
    }
  }
  // Keep the public shape contract even though its legacy decoration is not rendered.
  for (const key of ['head', 'leftDirection', 'rightDirection', 'turn']) {
    assert.ok(ship.getShape()[key] instanceof mapbox.Point)
  }
  f.manager.destroy()
})

function assertHeadingLine(ship, turnLength, expectedPoints = 3) {
  const feature = ship.headingLine()
  assert.equal(feature.id, `${ship.id}-direction-line`)
  assert.equal(feature.properties.meta, 'directionLine')
  const path = plain(feature.geometry.coordinates)
  assert.equal(path.length, expectedPoints)
  assert.deepEqual(path[0], ship.position().toArray())
  const length = rhumbDistance(path[0], path[1], { units: 'meters' })
  assert.ok(Math.abs(length - ship.options.speed * 92.52) < 0.00001)
  const angleError = (actual, expected) => Math.abs(((actual - expected + 540) % 360) - 180)
  assert.ok(angleError(rhumbBearing(path[0], path[1]), ship.direction) < 0.00001)
  if (expectedPoints === 3) {
    const length = rhumbDistance(path[1], path[2], { units: 'meters' })
    assert.ok(Math.abs(length - turnLength) < 0.00001, `${length} != ${turnLength}`)
    const turnBearing = ship.direction + (ship.options.rot < 0 ? -90 : 90)
    assert.ok(angleError(rhumbBearing(path[1], path[2]), turnBearing) < 0.00001)
  }
  return path
}

test('real heading-line turns use half the ship width without changing the speed vector', () => {
  const f = fixture()
  const ship = f.manager.add(data('turn', { width: 20, height: 100, speed: 10, rot: -25 }))
  for (const width of [20, 48]) {
    for (const hdg of [45, 90, 270]) {
      for (const rot of [-25, 25]) {
        ship.update({ ...ship.options, width, hdg, rot })
        f.map.setZoom(15)
        const iconPath = assertHeadingLine(ship, pixelsToMeters(f.map, ship.position().lat, 10))
        for (const zoom of [16, 18]) {
          f.map.setZoom(zoom)
          f.map.fire('zoomend')
          assert.equal(ship.getFeature().geometry.type, 'Polygon')
          const realPath = assertHeadingLine(ship, width / 2)
          assert.deepEqual(realPath.slice(0, 2), iconPath.slice(0, 2))
          assert.deepEqual(
            plain(f.features.get('turn-direction-line').geometry.coordinates),
            realPath,
          )
          assert.equal(f.features.size, 2)
        }
      }
    }
  }
  f.manager.destroy()
})

test('heading-line turn sizing follows custom realZoom and actual icon fallback', () => {
  const f = fixture()
  const ship = f.manager.add(
    data('turn', {
      width: 36,
      height: 120,
      speed: 10,
      rot: 25,
      realZoom: 18,
    }),
  )
  for (const zoom of [16, 18, 17, 18]) {
    f.map.setZoom(zoom)
    assert.equal(ship.getFeature().geometry.type, zoom >= 18 ? 'Polygon' : 'Point')
    assertHeadingLine(ship, zoom >= 18 ? 18 : pixelsToMeters(f.map, ship.position().lat, 10))
  }
  for (const dimensions of [
    { width: 36, height: undefined },
    { width: undefined, height: 120 },
    { width: 0, height: 120 },
    { width: 36, height: 0 },
  ]) {
    ship.update({ ...ship.options, ...dimensions })
    assert.equal(ship.getFeature().geometry.type, 'Point')
    assertHeadingLine(ship, pixelsToMeters(f.map, ship.position().lat, 10))
  }
  f.manager.destroy()
})

test('turning, straight and stopped real ships retain only one heading-line feature', () => {
  const f = fixture()
  f.map.setZoom(16)
  const ship = f.manager.add(data('turn', { width: 20, height: 100, speed: 10, rot: -25 }))
  for (const rot of [-25, 25, 0, -128]) {
    ship.update({ ...ship.options, rot })
    assertHeadingLine(ship, 10, rot === 0 || rot === -128 ? 2 : 3)
    assert.equal(f.features.get('turn').geometry.coordinates[0].length, 8)
    assert.equal(f.features.size, 2)
  }
  ship.update({ ...ship.options, speed: 0.49, rot: 25 })
  assert.equal(ship.headingLine().geometry, null)
  assert.equal(f.features.has('turn-direction-line'), false)
  assert.equal(f.features.size, 1)
  ship.update({ ...ship.options, speed: 0.5 })
  assertHeadingLine(ship, 10)
  assert.equal(f.features.size, 2)
  f.manager.destroy()
})

test('refresh renders each ship at most once and unchanged data skips geometry/Tooltip work', () => {
  const f = fixture()
  const entries = Array.from({ length: 100 }, (_, i) => data(i, { tooltip: true }))
  f.manager.load(entries)
  let renders = 0,
    geometries = 0,
    labels = 0
  for (const ship of f.manager.ships) {
    const render = ship.render.bind(ship),
      geometry = ship.getFeature.bind(ship),
      update = ship.tooltip.update.bind(ship.tooltip)
    ship.render = () => {
      renders++
      render()
    }
    ship.getFeature = () => {
      geometries++
      return geometry()
    }
    ship.tooltip.update = (options) => {
      labels++
      update(options)
    }
  }
  const writes = f.writes.length
  f.manager.load(
    entries.map((item) => ({
      ...item,
      position: new mapbox.LngLat(100, 40),
      time: new Date(item.time),
    })),
  )
  assert.ok(renders <= 100)
  assert.equal(geometries, 0)
  assert.equal(labels, 0)
  assert.equal(f.writes.length, writes)
  f.manager.load(entries.map((item, i) => (i === 3 ? { ...item, name: 'changed' } : item)))
  assert.equal(geometries, 1)
  assert.equal(labels, 1)
  assert.equal(f.writes.length, writes + 1)
  f.manager.destroy()
})

test('zoom and hover still update rendering; focus reuses the generated feature', () => {
  const f = fixture()
  const ship = f.manager.add(data('s'))
  let geometries = 0
  const geometry = ship.getFeature.bind(ship)
  ship.getFeature = () => {
    geometries++
    return geometry()
  }
  f.manager.focus('s')
  assert.equal(geometries, 1)
  f.map.setZoom(12)
  f.map.fire('zoomend')
  assert.equal(geometries, 2)
  f.manager.event.onMove({ features: [{ id: 's' }] })
  assert.equal(geometries, 3)
  f.manager.destroy()
})

test('manual render remains a forced refresh, and load return arrays do not mutate managed ships', () => {
  const f = fixture()
  const result = f.manager.load([data('s')])
  result.pop()
  assert.equal(f.manager.ships.length, 1)
  const writes = f.writes.length
  f.manager.render()
  assert.equal(f.writes.length, writes + 1)
  f.manager.destroy()
})
