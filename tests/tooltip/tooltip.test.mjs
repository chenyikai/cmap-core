import assert from 'node:assert/strict'
import test from 'node:test'
import mapbox from 'mapbox-gl'
import { createMap, load, plain } from './harness.mjs'

const { Tooltip } = load('src/core/Tooltip')
const { TextCache } = load('src/core/Tooltip/TextCache')
const { labelConnector, connectorsIntersect, connectorIntersectsBox } =
  load('src/core/Tooltip/layout')
const { LabelCollision } = load('src/core/Tooltip/LabelCollision')
const pos = [100, 50]
const text = (map, extra = {}) => new Tooltip(map, { position: pos, text: '浙渔 001', ...extra })
const dom = (fixture, extra = {}) => {
  const element = fixture.document.createElement('div')
  return {
    element,
    tooltip: new Tooltip(fixture.map, { position: pos, element, line: true, ...extra }),
  }
}
const overlay = (f) => f.container.children.find((node) => node.className === 'cmap-tooltip-canvas')
const lines = (f) => overlay(f).ctx.calls.filter(([method]) => method === 'lineTo')
const images = (f) => overlay(f).ctx.calls.filter(([method]) => method === 'drawImage')

test('new Tooltip with text automatically draws using one shared canvas, no Marker or Context', () => {
  const f = createMap()
  const a = text(f.map),
    b = text(f.map)
  assert.notEqual(a.id, b.id)
  assert.equal(f.counts.contextReads, 0)
  assert.equal(f.container.children.length, 1)
  assert.equal(f.map.listenerCount('move'), 1)
  assert.equal(f.map.listenerCount('beforeRemove'), 0)
  assert.equal(f.counts.paints, 1)
  f.settle()
  assert.equal(images(f).length, 2)
  assert.equal(a.visible, true)
  a.remove()
  b.remove()
  assert.equal(f.container.children.length, 0)
  assert.equal(f.map.listenerCount(), 0)
})

test('construction before style load defers drawing and survives cancellable beforeRemove', () => {
  const f = createMap({ loaded: false })
  const tooltip = text(f.map)
  f.frame()
  assert.equal(images(f).length, 0)
  assert.equal(f.counts.contextReads, 0)
  f.map.fire('beforeRemove')
  f.map.setReady()
  f.settle()
  assert.equal(tooltip.visible, true)
  assert.equal(images(f).length, 1)
  f.map.fire('remove')
  assert.equal(tooltip.visible, false)
  assert.equal(f.container.children.length, 0)
})

test('DOM compatibility uses the original element and updates position without losing handlers', () => {
  const f = createMap()
  const { tooltip, element } = dom(f, { offsetX: 5, offsetY: 10 })
  let clicks = 0
  element.addEventListener('click', () => clicks++)
  f.settle()
  assert.equal(element.parentNode.parentNode, f.container)
  tooltip.update({ position: [120, 30] })
  f.settle()
  assert.equal(tooltip.options.element, element)
  assert.equal(element.parentNode.style.transform, 'translate(75px, 0px)')
  element.dispatch('click')
  assert.equal(clicks, 1)
  assert.equal(lines(f).length, 1)
  tooltip.destroy()
})

test('labels also become ready after a style replacement without another map load event', () => {
  const f = createMap({ loaded: false })
  const tooltip = text(f.map)
  f.frame()
  assert.equal(tooltip.visible, false)
  f.map.isStyleLoaded = () => true
  f.frame()
  assert.equal(tooltip.visible, true)
  tooltip.remove()
})

test('viewport size uses the map canvas when its absolute-positioned container has no height', () => {
  const f = createMap({ ratio: 2 })
  f.container.clientHeight = 0
  f.map.getCanvas = () => ({ clientWidth: 800, clientHeight: 600 })
  const tooltip = text(f.map)
  f.settle()
  assert.equal(tooltip.visible, true)
  assert.equal(overlay(f).width, 1600)
  assert.equal(overlay(f).height, 1200)
  tooltip.remove()
})

test('show/hide/render are batched, idempotent, and no work is done on idle frames', () => {
  const f = createMap()
  const tooltip = text(f.map, { line: true })
  f.settle()
  tooltip.hide()
  tooltip.hide()
  f.settle()
  assert.equal(images(f).length, 0)
  assert.equal(lines(f).length, 0)
  tooltip.show()
  tooltip.show()
  tooltip.render()
  f.settle()
  assert.equal(images(f).length, 1)
  const count = f.counts.projections
  f.frame()
  assert.equal(f.counts.projections, count)
  assert.equal(f.map.listenerCount('move'), 1)
  tooltip.remove()
  tooltip.remove()
})

test('all nine anchors return the actual element bounds; measurement is cached', () => {
  const f = createMap()
  const { tooltip } = dom(f)
  const expected = {
    center: { minX: 80, minY: 40, maxX: 120, maxY: 60 },
    top: { minX: 80, minY: 50, maxX: 120, maxY: 70 },
    bottom: { minX: 80, minY: 30, maxX: 120, maxY: 50 },
    left: { minX: 100, minY: 40, maxX: 140, maxY: 60 },
    right: { minX: 60, minY: 40, maxX: 100, maxY: 60 },
    'top-left': { minX: 100, minY: 50, maxX: 140, maxY: 70 },
    'top-right': { minX: 60, minY: 50, maxX: 100, maxY: 70 },
    'bottom-left': { minX: 100, minY: 30, maxX: 140, maxY: 50 },
    'bottom-right': { minX: 60, minY: 30, maxX: 100, maxY: 50 },
  }
  assert.deepEqual(plain(tooltip.getAllBbox()), expected)
  const measured = f.counts.measurements
  tooltip.getAllBbox()
  assert.equal(f.counts.measurements, measured)
  tooltip.remove()
})

test('all nine anchors and signed offsets connect to the facing edge without crossing the label', () => {
  const f = createMap()
  const { tooltip } = dom(f)
  for (const anchor of [
    'center',
    'top',
    'bottom',
    'left',
    'right',
    'top-left',
    'top-right',
    'bottom-left',
    'bottom-right',
  ]) {
    for (const offsetX of [-5, 0, 5])
      for (const offsetY of [-10, 0, 10]) {
        tooltip.update({ anchor, offsetX, offsetY })
        f.settle()
        const box = tooltip.bbox
        const end = tooltip.connectPoint()?.toArray()
        if (pos[0] >= box.minX && pos[0] <= box.maxX && pos[1] >= box.minY && pos[1] <= box.maxY) {
          assert.equal(end, undefined, 'covered targets should not draw through the label')
          assert.equal(lines(f).length, 0)
          continue
        }
        assert.ok(end)
        assert.deepEqual(lines(f)[0].slice(1), end, 'API and rendered endpoint agree')
        assert.ok(
          Math.min(
            Math.abs(end[0] - box.minX),
            Math.abs(end[0] - box.maxX),
            Math.abs(end[1] - box.minY),
            Math.abs(end[1] - box.maxY),
          ) < 1e-6,
        )
        for (let i = 1; i < 100; i++) {
          const x = pos[0] + ((end[0] - pos[0]) * i) / 100
          const y = pos[1] + ((end[1] - pos[1]) * i) / 100
          assert.ok(
            !(x > box.minX && x < box.maxX && y > box.minY && y < box.maxY),
            `${anchor} line enters its label`,
          )
        }
      }
  }
  tooltip.remove()
})

test('rounded corners meet the outline and connectors start at the actual target', () => {
  const box = { minX: 10, minY: 10, maxX: 50, maxY: 50 }
  const line = labelConnector(new mapbox.Point(0, 0), box, 6)
  assert.ok(Math.abs(line.end.x - (16 - 6 / Math.sqrt(2))) < 1e-6)
  assert.ok(Math.abs(line.end.y - line.end.x) < 1e-6)
  assert.equal(line.start.dist(new mapbox.Point(0, 0)), 0)
  assert.equal(labelConnector(new mapbox.Point(30, 30), box, 6), null)
})

test('target protection never leaves a source gap and subpixel boxes match the rendered bitmap', () => {
  for (const ratio of [1, 1.25, 1.5, 2, 3]) {
    const f = createMap({ ratio })
    const position = [100.37, 40.23]
    const tip = text(f.map, {
      position,
      anchor: 'top-left',
      offsetX: 5.17,
      offsetY: 15.19,
      targetRadius: 12,
      line: true,
    })
    f.settle()
    assert.deepEqual(
      overlay(f)
        .ctx.calls.find(([method]) => method === 'moveTo')
        .slice(1),
      position,
    )
    const end = tip.connectPoint().toArray()
    assert.deepEqual(lines(f)[0].slice(1), end)
    const box = tip.bbox
    assert.ok(Math.abs(box.minX * ratio - Math.round(box.minX * ratio)) < 1e-6)
    assert.ok(Math.abs(box.minY * ratio - Math.round(box.minY * ratio)) < 1e-6)
    const draw = images(f)[0]
    // Default shadow bitmap inset is 33 CSS pixels (14*2 + 3 + 2).
    assert.ok(Math.abs(draw[2] + 33 - box.minX) < 1e-6)
    assert.ok(Math.abs(draw[3] + 33 - box.minY) < 1e-6)
    tip.remove()
  }
})

test('automatic placement below the target uses the top edge, not the bottom edge', () => {
  const f = createMap()
  const fixed = text(f.map, {
    text: '阻挡',
    collision: true,
    anchors: ['bottom-right'],
    offsetX: 5,
    offsetY: 10,
    line: true,
  })
  const next = text(f.map, {
    text: '下方标签',
    collision: true,
    offsetX: 5,
    offsetY: 10,
    line: true,
  })
  f.settle()
  assert.equal(next.visible, true)
  assert.ok(next.bbox.minY > pos[1])
  assert.ok(
    next.connectPoint().lat <= next.bbox.minY + 6,
    'endpoint is on the facing top edge/corner',
  )
  fixed.remove()
  next.remove()
})

test('collision indexes reject crossed connectors, label/line overlaps in both orders, and target icons', () => {
  const collisions = new LabelCollision()
  const target = { owner: {}, point: new mapbox.Point(0, 0), radius: 0 }
  const box = { minX: 100, minY: 100, maxX: 130, maxY: 120 }
  const diagonal = { start: new mapbox.Point(0, 0), end: new mapbox.Point(100, 100) }
  collisions.reset()
  collisions.add(box, diagonal)
  assert.equal(collisions.accepts(target, { minX: 45, minY: 45, maxX: 55, maxY: 55 }, null), false)
  assert.equal(
    collisions.accepts(target, { minX: 0, minY: 80, maxX: 20, maxY: 95 }, null),
    true,
    'diagonal bounding box alone is not a collision',
  )
  const crossing = { start: new mapbox.Point(100, 0), end: new mapbox.Point(0, 100) }
  assert.equal(
    collisions.accepts(target, { minX: 0, minY: 100, maxX: 20, maxY: 120 }, crossing),
    false,
  )
  collisions.reset()
  collisions.add({ minX: 45, minY: 45, maxX: 55, maxY: 55 }, null)
  assert.equal(collisions.accepts(target, box, diagonal), false)
  collisions.reset([{ owner: {}, point: new mapbox.Point(50, 50), radius: 8 }])
  assert.equal(collisions.accepts(target, box, diagonal), false)
  assert.equal(collisions.accepts(target, { minX: 55, minY: 45, maxX: 75, maxY: 60 }, null), false)
  assert.equal(
    connectorsIntersect(diagonal, { start: diagonal.start, end: new mapbox.Point(100, 0) }),
    false,
    'shared origin is allowed',
  )
  assert.equal(
    connectorsIntersect(diagonal, {
      start: new mapbox.Point(20, 20),
      end: new mapbox.Point(80, 80),
    }),
    true,
    'collinear overlap is rejected',
  )
})

test('fixed labels block an automatic connector and removing the obstacle restores visibility', () => {
  const f = createMap()
  const fixed = dom(f, { position: [85, 45], anchor: 'center', line: false }).tooltip
  const tip = text(f.map, {
    position: [50, 50],
    anchor: 'left',
    anchors: ['left'],
    offsetX: 100,
    collision: true,
    line: true,
  })
  f.settle()
  assert.equal(tip.visible, false)
  assert.equal(tip.options.visible, true)
  fixed.hide()
  f.settle()
  assert.equal(tip.visible, true)
  tip.remove()
  fixed.remove()
})

test('position updates refresh the connector in the next frame and disabling it clears the line', () => {
  const f = createMap()
  const tooltip = text(f.map, { line: true })
  f.settle()
  tooltip.setLngLat({ lng: 120, lat: 30 })
  f.settle()
  const starts = overlay(f).ctx.calls.filter(([method]) => method === 'moveTo')
  assert.deepEqual(starts[0].slice(1), [120, 30])
  tooltip.update({ line: false })
  f.settle()
  assert.equal(lines(f).length, 0)
  tooltip.remove()
})

test('offscreen labels reappear on pan without resetting requested visibility', () => {
  const f = createMap()
  const tooltip = text(f.map)
  f.map.setShift(-1000)
  f.frame()
  assert.equal(tooltip.visible, false)
  assert.equal(tooltip.options.visible, true)
  f.map.setShift(0)
  f.frame()
  assert.equal(tooltip.visible, true)
  tooltip.hide()
  f.settle()
  f.map.setShift(10)
  f.frame()
  assert.equal(tooltip.visible, false)
  tooltip.remove()
})

test('text styles/bitmap caches survive pan, fonts and DPR changes invalidate correctly', () => {
  const f = createMap()
  const a = text(f.map),
    b = text(f.map)
  f.settle()
  assert.equal(images(f)[0][1], images(f)[1][1])
  const first = images(f)[0][1]
  f.map.setShift(10)
  f.frame()
  assert.equal(images(f)[0][1], first)
  a.update({ text: '长一点的船名', style: { color: 'red', paddingX: 9 } })
  f.settle()
  assert.notEqual(images(f)[0][1], first)
  const width = overlay(f).width
  f.document.defaultView.devicePixelRatio = 2
  f.frame()
  assert.equal(overlay(f).width, width * 2)
  f.document.fonts.dispatch('loadingdone')
  f.settle()
  a.remove()
  b.remove()
  assert.equal(f.document.fonts.count('loadingdone'), 0)
})

test('collision hiding is reversible and does not change explicit visibility', () => {
  const f = createMap()
  const a = text(f.map, { collision: true, anchors: ['bottom-right'], priority: 10 })
  const b = text(f.map, { collision: true, anchors: ['bottom-right'] })
  f.settle()
  assert.equal(a.visible, true)
  assert.equal(b.visible, false)
  assert.equal(b.options.visible, true)
  a.hide()
  f.settle()
  assert.equal(b.visible, true)
  b.hide()
  a.show()
  f.settle()
  a.hide()
  f.settle()
  assert.equal(b.visible, false)
  a.remove()
  b.remove()
})

test('partial updates retain identity and can switch between text and DOM', () => {
  const f = createMap()
  const tooltip = text(f.map)
  const id = tooltip.id
  const element = f.document.createElement('button')
  tooltip.update({ element })
  f.settle()
  assert.equal(tooltip.renderer, 'dom')
  assert.equal(element.parentNode.parentNode, f.container)
  tooltip.update({ text: '恢复文本' })
  f.settle()
  assert.equal(tooltip.renderer, 'canvas')
  assert.equal(element.parentNode.parentNode, null)
  assert.equal(tooltip.id, id)
  assert.throws(() => tooltip.update({ id: 'different' }), /id cannot/)
  tooltip.remove()
})

test('last removal releases canvas/listeners and a later Tooltip gets a fresh manager', () => {
  const f = createMap()
  const first = text(f.map)
  first.remove()
  const second = text(f.map)
  f.settle()
  assert.equal(second.visible, true)
  f.map.remove()
  assert.equal(f.map.listenerCount(), 0)
  assert.equal(f.container.children.length, 0)
  second.show()
  assert.equal(f.container.children.length, 0)
})

test('bulk construction has constant live DOM and listeners; cold work is spread across frames', () => {
  const f = createMap()
  const items = Array.from({ length: 300 }, (_, i) => text(f.map, { text: 'ship-' + i }))
  assert.equal(f.container.children.length, 1)
  assert.equal(f.counts.paints, 1)
  f.frame()
  assert.ok(images(f).length <= 64)
  const frames = f.settle(100)
  assert.ok(frames < 100, 'initial rendering must eventually settle')
  assert.equal(images(f).length, 300)
  assert.equal(f.container.children.length, 1)
  assert.equal(f.map.listenerCount('render'), 1)
  items.forEach((item) => item.remove())
})

test('bitmap cache is byte bounded even with unique labels', () => {
  const f = createMap()
  const cache = new TextCache(f.container, 150000)
  for (let i = 0; i < 50; i++) {
    const metrics = cache.measure({ text: 'unique-' + i })
    cache.create(metrics, 1)
    assert.ok(cache.bytes <= 150000)
  }
  cache.clear()
  assert.equal(cache.bytes, 0)
})

test('more visible text than the bitmap budget still settles without hiding labels or an endless redraw loop', () => {
  const f = createMap({ ratio: 2 })
  const items = Array.from({ length: 1500 }, (_, i) => text(f.map, { text: 'unique-label-' + i }))
  assert.ok(f.settle(100) < 100)
  assert.equal(f.map.repaintPending, false)
  assert.equal(items.filter((x) => x.visible).length, 1500)
  assert.equal(images(f).length, 1500)
  f.map.setShift(1)
  f.frame()
  assert.equal(f.map.repaintPending, false)
  items.forEach((x) => x.remove())
})

test('Ship refreshes reuse text labels, preserve custom DOM tooltips, and release lifecycle listeners', () => {
  const f = createMap()
  const { default: Ship } = load('src/modules/Ship')
  const { AisShip } = load('src/modules/Ship/plugins/AisShip')
  const ship = new Ship(f.map, { plugins: [AisShip] })
  // All ships must be submitted even when loaded outside the initial viewport.
  f.map.getBounds = () => ({ contains: () => false })
  const data = {
    id: 'ship-1',
    type: AisShip.NAME,
    name: 'first',
    position: new mapbox.LngLat(100, 50),
    time: new Date(),
    speed: 0,
    rot: 0,
    cog: 90,
    hdg: 90,
    direction: 90,
    tooltip: true,
  }
  ship.load([data])
  f.settle()
  assert.equal(f.features.has('ship-1'), true, 'panning must not expose labels without ships')
  const first = ship.get('ship-1').tooltip
  ship.load([{ ...data, name: 'renamed' }])
  f.settle()
  assert.equal(ship.get('ship-1').tooltip, first)
  assert.equal(first.options.text, 'renamed')
  ship.load([{ ...data, tooltip: false }])
  f.settle()
  assert.equal(ship.get('ship-1').tooltip, null)
  assert.equal(first.visible, false)
  ship.load([data])
  f.settle()
  assert.equal(ship.get('ship-1').tooltip.options.text, 'first')
  assert.equal(ship.get('ship-1').tooltip.visible, true)
  const custom = dom(f).tooltip
  ship.get('ship-1').setTooltip(custom)
  ship.load([{ ...data, tooltip: false }])
  f.settle()
  assert.equal(custom.renderer, 'dom')
  assert.equal(ship.get('ship-1').tooltip, custom)
  ship.removeAll()
  ship.destroy()
  assert.equal(f.map.listenerCount(), 0)
  assert.equal(f.container.children.length, 0)
})

test('Track refreshes reuse text labels and map pans do not rebuild labels or GeoJSON', () => {
  const f = createMap()
  const { Track } = load('src/modules/Track')
  const track = new Track(f.map, { startLabel: '起', endLabel: '终' })
  const items = [0, 1, 2].map((i) => ({
    id: 'track-1',
    pId: 'p' + i,
    index: i,
    position: new mapbox.LngLat(100 + i, 50),
    time: new Date(i * 1000),
    cog: 90,
    sog: 1,
  }))
  track.load(items)
  track.render()
  f.settle()
  const first = track.tooltips.get('p0')
  track.render()
  f.settle()
  assert.equal(track.tooltips.get('p0'), first)
  const geometry = f.features.get('track-1')
  f.map.setShift(1)
  f.map.fire('moveend')
  f.settle()
  assert.equal(f.features.get('track-1'), geometry)
  track.load(items.slice(0, 2))
  track.render()
  f.settle()
  assert.equal(track.tooltips.has('p2'), false)
  track.destroy()
  assert.equal(f.map.listenerCount(), 0)
  assert.equal(f.container.children.length, 0)
})

test('invalid inputs fail before registering any map resources', () => {
  const f = createMap()
  for (const opts of [
    { position: pos },
    { position: pos, text: 'a', element: {} },
    { position: pos, text: 'a', renderer: 'dom' },
    { position: pos, text: 'a', offsetX: NaN },
  ]) {
    assert.throws(() => new Tooltip(f.map, opts))
  }
  assert.equal(f.container.children.length, 0)
  assert.equal(f.map.listenerCount(), 0)
})
