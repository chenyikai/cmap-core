import assert from 'node:assert/strict'
import test from 'node:test'
import { createMap, load, plain } from '../tooltip/harness.mjs'

const { default: ResourceRegister } = load('src/core/ResourceRegister')
const feature = (id, geometry = { type: 'Point', coordinates: [100, 40] }) => ({
  type: 'Feature',
  id,
  properties: { id },
  geometry,
})

function fixture() {
  const frames = new Map(),
    sources = new Map(),
    submissions = []
  let sequence = 0
  globalThis.requestAnimationFrame = (fn) => {
    frames.set(++sequence, fn)
    return sequence
  }
  globalThis.cancelAnimationFrame = (id) => frames.delete(id)
  const { map } = createMap()
  map.getSource = (id) => sources.get(id)
  map.addSource = (id) =>
    sources.set(id, {
      type: 'geojson',
      setData: (data) => submissions.push({ id, data: plain(data) }),
    })
  map.removeSource = (id) => sources.delete(id)
  const register = new ResourceRegister(map)
  register.addSource('ships', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  })
  const frame = () => {
    const queue = [...frames.values()]
    frames.clear()
    queue.forEach((fn) => fn())
  }
  return { map, register, frames, submissions, frame }
}

test('batch upserts/deletes preserve IDs and order, submitting once per frame', () => {
  const f = fixture()
  for (let i = 0; i < 1000; i++) f.register.setGeoJSONData('ships', feature(i))
  assert.equal(f.frames.size, 1)
  f.frame()
  assert.equal(f.submissions.length, 1)
  assert.equal(f.submissions[0].data.features.length, 1000)
  for (let i = 0; i < 1000; i += 2) f.register.setGeoJSONData('ships', feature(String(i), null))
  f.register.setGeoJSONData('ships', feature('1'))
  f.register.setGeoJSONData('ships', feature(1000))
  assert.equal(f.register.findFeature('ships', '0'), undefined)
  assert.equal(f.register.findFeature('ships', '1').id, '1')
  f.frame()
  assert.equal(f.submissions.length, 2)
  assert.equal(f.submissions[1].data.features.length, 501)
  assert.deepEqual(
    f.submissions[1].data.features.slice(0, 3).map((x) => x.id),
    ['1', 3, 5],
  )
  for (const item of f.submissions[1].data.features)
    f.register.setGeoJSONData('ships', feature(item.id, null))
  f.frame()
  assert.deepEqual(f.submissions[2].data.features, [])
  f.register.setGeoJSONData('ships', feature('missing', null))
  assert.equal(f.frames.size, 0)
  f.register.destroy()
})

test('source removal and actual map removal cancel pending work and ignore later writes', () => {
  const f = fixture()
  f.register.setGeoJSONData('ships', feature('s'))
  f.register.removeSource('ships')
  f.frame()
  assert.equal(f.submissions.length, 0)
  f.register.setGeoJSONData('ships', feature('s'))
  f.map.fire('remove')
  assert.equal(f.frames.size, 0)
  f.register.setGeoJSONData('ships', feature('late'))
  assert.equal(f.frames.size, 0)
  assert.equal(f.register.findFeature('ships', 's'), undefined)
})
