import assert from 'node:assert/strict'
import test from 'node:test'
import { createMap, load, plain } from '../tooltip/harness.mjs'

const { default: ResourceRegister } = load('src/core/ResourceRegister')
const { getSourceSnapshot } = load('src/core/ResourceRegister/snapshot')
const { StyleResources } = load('src/modules/CMap/StyleResources')
const feature = (id, geometry = { type: 'Point', coordinates: [100, 40] }) => ({
  type: 'Feature',
  id,
  properties: { id },
  geometry,
})

function fixture(initial = [], options = {}) {
  const frames = new Map(),
    sources = new Map(),
    layers = [],
    submissions = []
  let sequence = 0
  globalThis.requestAnimationFrame = (fn) => {
    frames.set(++sequence, fn)
    return sequence
  }
  globalThis.cancelAnimationFrame = (id) => frames.delete(id)
  const { map } = createMap()
  let styleReady = true
  map.isStyleLoaded = () => styleReady
  map.getSource = (id) => sources.get(id)
  map.addSource = (id, spec) => {
    let current = spec.data
    let ready = true
    const workers = new Map()
    const entries = (data) =>
      data?.type === 'FeatureCollection' ? data.features : data?.type === 'Feature' ? [data] : []
    const replace = (data) => {
      workers.clear()
      for (const item of entries(data)) workers.set(item.id, item)
    }
    replace(current)
    sources.set(id, {
      type: spec.type,
      loaded: () => ready,
      setReady(value) {
        ready = value
      },
      workerData: () => plain([...workers.values()]),
      serialize: () => ({ ...spec, data: current }),
      setData(data) {
        current = data
        replace(data)
        submissions.push({ id, method: 'setData', data: plain(data) })
        map.fire('sourcedataloading', { sourceId: id })
        return this
      },
      updateData(data) {
        assert.equal(spec.dynamic, true)
        current = data // Like Mapbox, serialization now returns only the last delta.
        for (const item of entries(data)) {
          if (item.geometry === null) {
            assert.ok(workers.has(item.id), 'dynamic worker cannot delete an unknown ID')
            workers.delete(item.id)
          } else workers.set(item.id, item)
        }
        submissions.push({ id, method: 'updateData', data: plain(data) })
        map.fire('sourcedataloading', { sourceId: id })
        return this
      },
    })
  }
  map.removeSource = (id) => {
    if (layers.some((layer) => layer.source === id)) {
      map.fire('error', { error: new Error('Source is in use') })
      return
    }
    sources.delete(id)
  }
  map.getLayer = (id) => layers.find((layer) => layer.id === id)
  map.addLayer = (layer, before) => {
    const index = before ? layers.findIndex((entry) => entry.id === before) : layers.length
    assert.notEqual(index, -1, 'before layer must exist')
    layers.splice(index, 0, layer)
  }
  map.removeLayer = (id) => {
    const index = layers.findIndex((layer) => layer.id === id)
    if (index !== -1) layers.splice(index, 1)
  }
  map.setFeatureState = () => {}
  map.getFeatureState = () => ({ selected: true })
  map.getStyle = () => {
    if (!styleReady) throw new Error('Style is not done loading')
    return {
      version: 8,
      sources: Object.fromEntries([...sources].map(([id, source]) => [id, source.serialize()])),
      layers: [...layers],
    }
  }
  map.setStyle = () => {
    sources.clear()
    layers.length = 0
    styleReady = false
  }
  map.completeStyle = () => {
    styleReady = true
    map.fire('styledata')
    map.fire('style.load')
  }
  const register = new ResourceRegister(map)
  register.addSource('ships', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: initial },
    ...options,
  })
  const frame = () => {
    const queue = [...frames.values()]
    frames.clear()
    queue.forEach((fn) => fn())
  }
  return { map, register, frames, sources, layers, submissions, frame }
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

test('initial features, including anonymous features, survive the first update', () => {
  const anonymous = { ...feature('anonymous'), id: undefined }
  const f = fixture([feature('A'), anonymous, feature(0)])
  assert.equal(f.register.findFeature('ships', 'A').id, 'A')
  f.register.setGeoJSONData('ships', [feature('B'), feature('0', null)])
  f.frame()
  assert.deepEqual(
    f.submissions[0].data.features.map((entry) => entry.id),
    ['A', undefined, 'B'],
  )
  f.register.destroy()
})

test('existing and externally replaced data are rebased with pending updates', () => {
  const f = fixture()
  f.map.addSource('external', { type: 'geojson', data: feature('A') })
  f.register.addSource('external', { type: 'geojson', data: feature('ignored') })
  f.register.setGeoJSONData('external', feature('B'))
  f.map.getSource('external').setData({ type: 'FeatureCollection', features: [feature('C')] })
  f.frame()
  assert.deepEqual(
    f.submissions.at(-1).data.features.map((entry) => entry.id),
    ['C', 'B'],
  )
  assert.equal(f.register.findFeature('external', 'A'), undefined)
  f.register.destroy(true)
  assert.ok(f.map.getSource('external'), 'pre-existing source is not owned by the register')
})

test('registers sharing a source do not overwrite each other', () => {
  const f = fixture([feature('A')])
  const second = new ResourceRegister(f.map)
  f.register.setGeoJSONData('ships', feature('B'))
  second.setGeoJSONData('ships', feature('C'))
  f.frame()
  assert.deepEqual(
    f.submissions.at(-1).data.features.map((entry) => entry.id),
    ['A', 'B', 'C'],
  )
  assert.equal(f.register.findFeature('ships', 'C').id, 'C')
  second.destroy()
  f.register.destroy()
})

test('synchronous source events retain reentrant updates for the next frame', () => {
  const f = fixture()
  f.map.once('sourcedataloading', () => f.register.setGeoJSONData('ships', feature('B')))
  f.register.setGeoJSONData('ships', feature('A'))
  f.frame()
  assert.deepEqual(
    f.submissions[0].data.features.map((entry) => entry.id),
    ['A'],
  )
  assert.equal(f.frames.size, 1)
  f.frame()
  assert.deepEqual(
    f.submissions[1].data.features.map((entry) => entry.id),
    ['A', 'B'],
  )
  assert.equal(f.frames.size, 0)
  f.register.destroy()
})

test('a source missing during style replacement retains updates without spinning frames', () => {
  const f = fixture([feature('A')])
  f.register.setGeoJSONData('ships', feature('B'))
  f.sources.delete('ships')
  f.frame()
  assert.equal(f.frames.size, 0)
  assert.equal(f.submissions.length, 0)
  f.map.addSource('ships', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [feature('A')] },
  })
  f.map.fire('styledata')
  f.frame()
  assert.deepEqual(
    f.submissions[0].data.features.map((entry) => entry.id),
    ['A', 'B'],
  )
  f.register.destroy()
})

test('writes before addSource merge into its initial data, including pending deletes', () => {
  const f = fixture()
  f.register.setGeoJSONData('later', [feature('B'), feature('A', null)])
  f.frame()
  f.register.addSource('later', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [feature('A'), feature('C')] },
  })
  f.frame()
  assert.deepEqual(
    f.submissions[0].data.features.map((entry) => entry.id),
    ['C', 'B'],
  )
  f.register.destroy()
})

test('a failed submission retains both the batch and reentrant changes until a readiness event', () => {
  const f = fixture()
  const source = f.map.getSource('ships')
  const original = source.setData
  source.setData = () => {
    f.register.setGeoJSONData('ships', feature('B'))
    throw new Error('style not ready')
  }
  f.register.setGeoJSONData('ships', feature('A'))
  f.frame()
  source.setData = original
  f.map.fire('sourcedata', { sourceId: 'ships', sourceDataType: 'metadata' })
  f.frame()
  assert.deepEqual(
    f.submissions[0].data.features.map((entry) => entry.id),
    ['A', 'B'],
  )
  f.register.destroy()
})

test('permanent submission failure does not create a retry animation loop', () => {
  const f = fixture()
  f.map.getSource('ships').setData = () => {
    throw new Error('unavailable')
  }
  f.register.setGeoJSONData('ships', feature('A'))
  f.frame()
  assert.equal(f.frames.size, 0)
  assert.equal(f.register.findFeature('ships', 'A').id, 'A')
  f.register.destroy()
})

test('URL-backed sources are not silently replaced by partial data', () => {
  const f = fixture([], { data: '/ships.geojson' })
  f.register.setGeoJSONData('ships', feature('B'))
  f.frame()
  assert.equal(f.submissions.length, 0)
  assert.equal(f.frames.size, 0)
  f.map.getSource('ships').setData({ type: 'FeatureCollection', features: [feature('A')] })
  f.map.fire('sourcedata', { sourceId: 'ships', sourceDataType: 'content' })
  f.frame()
  assert.deepEqual(
    f.submissions.at(-1).data.features.map((entry) => entry.id),
    ['A', 'B'],
  )
  f.register.destroy()
})

test('destroyed instances never read or mutate a removed map', () => {
  const f = fixture()
  f.register.setGeoJSONData('ships', feature('A'))
  f.map.fire('remove')
  for (const method of [
    'getSource',
    'getLayer',
    'addSource',
    'removeSource',
    'addLayer',
    'removeLayer',
    'setFeatureState',
    'getFeatureState',
  ]) {
    f.map[method] = () => {
      throw new Error('map already removed')
    }
  }
  f.register.addSource('late', { type: 'geojson', data: feature('B') })
  f.register.addLayer({ zIndex: 1, layer: { id: 'late', type: 'circle', source: 'late' } })
  f.register.removeSource('ships')
  f.register.removeLayer('late')
  f.register.setState('ships', 'A', { selected: true })
  assert.equal(f.register.getState('ships', 'A'), null)
  assert.equal(f.register.getSource('ships'), undefined)
  f.register.destroy(true)
  assert.equal(f.map.listenerCount(), 0)
  assert.equal(f.frames.size, 0)
})

test('failed source removal keeps its data and ownership until dependencies are removed', () => {
  const f = fixture([feature('A')])
  f.map.addLayer({ id: 'outside', type: 'circle', source: 'ships' })
  f.register.setGeoJSONData('ships', feature('B'))
  f.register.removeSource('ships')
  assert.ok(f.map.getSource('ships'))
  assert.ok(f.map.getLayer('outside'), 'do not remove external layers')
  assert.equal(f.register.findFeature('ships', 'A').id, 'A')
  f.frame()
  assert.deepEqual(
    f.submissions[0].data.features.map((entry) => entry.id),
    ['A', 'B'],
  )
  f.map.removeLayer('outside')
  f.register.destroy(true)
  assert.equal(f.map.getSource('ships'), undefined)
})

test('layer zIndex is shared by registers on the same map, with stable equal priorities', () => {
  const f = fixture()
  const focus = new ResourceRegister(f.map)
  const add = (owner, id, zIndex) =>
    owner.addLayer({ zIndex, layer: { id, type: 'circle', source: 'ships' } })
  add(focus, 'focus', 99999)
  add(f.register, 'ship', 300)
  add(f.register, 'ship-border', 300)
  add(f.register, 'plot', 10)
  assert.deepEqual(
    f.layers.map((layer) => layer.id),
    ['plot', 'ship', 'ship-border', 'focus'],
  )
  focus.destroy()
  add(f.register, 'track', 290)
  assert.deepEqual(
    f.layers.map((layer) => layer.id),
    ['plot', 'track', 'ship', 'ship-border', 'focus'],
  )
  f.register.destroy()
})

test('layer ordering ignores missing anchors and does not cross Mapbox slots', () => {
  const f = fixture()
  f.register.addLayer({ zIndex: 99999, layer: { id: 'focus', type: 'circle', source: 'ships' } })
  f.map.removeLayer('focus')
  f.register.addLayer({ zIndex: 300, layer: { id: 'ship', type: 'circle', source: 'ships' } })
  f.register.addLayer({
    zIndex: 10,
    layer: { id: 'top-slot', type: 'circle', source: 'ships', slot: 'top' },
  })
  assert.deepEqual(
    f.layers.map((layer) => layer.id),
    ['ship', 'top-slot'],
  )
  f.register.destroy()
})

test('mutating and reusing an external setData object invalidates the cached baseline', () => {
  const f = fixture([feature('A')])
  const source = f.map.getSource('ships')
  const data = source.serialize().data
  f.register.setGeoJSONData('ships', feature('B'))
  data.features.push(feature('C'))
  source.setData(data)
  f.frame()
  assert.deepEqual(
    f.submissions.at(-1).data.features.map((entry) => entry.id),
    ['A', 'C', 'B'],
  )
  f.register.destroy()
})

test('removing or destroying from synchronous source events cannot submit later sources', () => {
  for (const destroy of [false, true]) {
    const f = fixture()
    f.register.addSource('second', { type: 'geojson', data: feature('original') })
    f.register.setGeoJSONData('ships', feature('A'))
    f.register.setGeoJSONData('second', feature('B'))
    f.map.once('sourcedataloading', () => {
      if (destroy) f.register.destroy()
      else f.register.removeSource('second')
    })
    f.frame()
    assert.deepEqual(
      f.submissions.map((entry) => entry.id),
      ['ships'],
    )
    assert.equal(f.frames.size, 0)
    f.register.destroy()
  }
})

test('destroy(true) cleans independent resources even if one removal throws', () => {
  const f = fixture()
  f.register.addSource('second', { type: 'geojson', data: feature('B') })
  const remove = f.map.removeSource
  f.map.removeSource = (id) => {
    if (id === 'ships') throw new Error('source cannot be removed')
    remove(id)
  }
  f.register.destroy(true)
  assert.ok(f.map.getSource('ships'))
  assert.equal(f.map.getSource('second'), undefined)
  assert.equal(f.map.listenerCount(), 0)
  f.register.destroy(true)
})

test('registration errors do not claim ownership or leave invalid layer anchors', () => {
  const f = fixture()
  const addSource = f.map.addSource
  const addLayer = f.map.addLayer
  f.map.addSource = () => {}
  f.map.addLayer = () => {}
  f.register.addSource('invalid', { type: 'geojson', data: feature('A') })
  f.register.addLayer({ zIndex: 99999, layer: { id: 'invalid', type: 'circle', source: 'ships' } })
  f.map.addSource = addSource
  f.map.addLayer = addLayer
  addSource('invalid', { type: 'geojson', data: feature('outside') })
  addLayer({ id: 'invalid', type: 'circle', source: 'invalid' })
  f.register.destroy(true)
  assert.ok(f.map.getSource('invalid'))
  assert.ok(f.map.getLayer('invalid'))
})

test('ID, source options and input objects retain the existing public contract', () => {
  const initial = Object.freeze(feature('A'))
  const f = fixture([initial], { promoteId: 'customId', dynamic: true })
  const spec = f.map.getSource('ships').serialize()
  assert.equal(spec.promoteId, 'customId')
  assert.equal(spec.dynamic, true)
  f.register.setGeoJSONData('ships', [feature(undefined), feature(null), feature(NaN), feature({})])
  assert.equal(f.frames.size, 0)
  f.register.setGeoJSONData('ships', Object.freeze(feature(0)))
  f.frame()
  assert.deepEqual(
    f.map
      .getSource('ships')
      .workerData()
      .map((entry) => entry.id),
    ['A', 0],
  )
  assert.equal(initial.properties.id, 'A')
  f.register.destroy()
})

test('layer order and teardown are isolated between maps', () => {
  const first = fixture()
  first.register.addLayer({
    zIndex: 99999,
    layer: { id: 'focus', type: 'circle', source: 'ships' },
  })
  const second = fixture()
  second.register.addLayer({ zIndex: 300, layer: { id: 'ship', type: 'circle', source: 'ships' } })
  first.map.fire('remove')
  second.register.addLayer({ zIndex: 10, layer: { id: 'plot', type: 'circle', source: 'ships' } })
  assert.deepEqual(
    second.layers.map((layer) => layer.id),
    ['plot', 'ship'],
  )
  second.register.destroy(true)
})

test('recreated equal-priority layers use their new insertion order as anchors', () => {
  const f = fixture()
  const add = (id, zIndex) =>
    f.register.addLayer({ zIndex, layer: { id, type: 'circle', source: 'ships' } })
  add('first', 100)
  add('second', 100)
  f.layers.length = 0
  add('second', 100)
  add('first', 100)
  add('lower', 50)
  assert.deepEqual(
    f.layers.map((layer) => layer.id),
    ['lower', 'second', 'first'],
  )
  f.register.destroy()
})

test('map removal during a cleanup event stops all further map access', () => {
  for (const destroy of [false, true]) {
    const f = fixture()
    f.register.addLayer({ zIndex: 1, layer: { id: 'owned', type: 'circle', source: 'ships' } })
    f.map.removeLayer = () => {
      f.map.fire('remove')
      f.map.getSource = f.map.getLayer = () => {
        throw new Error('removed map accessed')
      }
    }
    if (destroy) f.register.destroy(true)
    else f.register.removeLayer('owned')
    assert.equal(f.map.listenerCount(), 0)
  }
})

test('dynamic sources send only changed features, with a complete independent snapshot', () => {
  const f = fixture(
    Array.from({ length: 1000 }, (_, id) => feature(id)),
    { dynamic: true },
  )
  for (let i = 0; i < 10; i++)
    f.register.setGeoJSONData('ships', { ...feature(5), properties: { id: 5, value: i } })
  f.frame()
  assert.equal(f.submissions.length, 1)
  assert.equal(f.submissions[0].method, 'updateData')
  assert.equal(f.submissions[0].data.features.length, 1)
  assert.equal(f.submissions[0].data.features[0].properties.value, 9)
  assert.equal(f.map.getSource('ships').serialize().data.features.length, 1)
  assert.equal(getSourceSnapshot(f.map, 'ships').features.length, 1000)
  assert.equal(f.map.getSource('ships').workerData().length, 1000)
  f.register.setGeoJSONData('ships', feature(6))
  f.frame()
  assert.equal(f.submissions[1].data.features.length, 1)
  assert.equal(f.register.findFeature('ships', '999').id, 999)
  f.register.destroy()
  assert.equal(
    getSourceSnapshot(f.map, 'ships').features.length,
    1000,
    'snapshot survives register disposal',
  )
})

test('incremental updates preserve string/number ID aliases and delete the last feature', () => {
  const f = fixture([feature(0), feature(1)], { dynamic: true })
  f.register.setGeoJSONData('ships', feature('0'))
  f.frame()
  assert.deepEqual(
    f.submissions[0].data.features.map((x) => [x.id, x.geometry === null]),
    [
      [0, true],
      ['0', false],
    ],
  )
  assert.deepEqual(
    f.map
      .getSource('ships')
      .workerData()
      .map((x) => x.id),
    [1, '0'],
  )
  f.register.setGeoJSONData('ships', [feature(0, null), feature('1', null)])
  f.frame()
  assert.equal(f.submissions[1].method, 'updateData')
  assert.deepEqual(f.map.getSource('ships').workerData(), [])
  assert.deepEqual(plain(getSourceSnapshot(f.map, 'ships').features), [])
  f.register.destroy()
})

test('insert followed by delete before submission cancels out without deleting an unknown worker ID', () => {
  const f = fixture([feature('A')], { dynamic: true })
  f.register.setGeoJSONData('ships', feature('temporary'))
  f.register.setGeoJSONData('ships', feature('temporary', null))
  f.frame()
  assert.equal(f.submissions.length, 0)
  assert.equal(f.frames.size, 0)
  assert.equal(f.map.getSource('ships').workerData().length, 1)
  f.register.destroy()
})

test('dynamic initial load and in-flight updates provide backpressure without idle frame loops', () => {
  const f = fixture([feature('initial')], { dynamic: true })
  const source = f.map.getSource('ships')
  source.setReady(false)
  f.register.setGeoJSONData('ships', feature('A'))
  f.frame()
  assert.equal(f.submissions.length, 0)
  assert.equal(f.frames.size, 0)
  f.register.setGeoJSONData('ships', feature('B'))
  f.frame()
  source.setReady(true)
  f.map.fire('sourcedata', { sourceId: 'ships', sourceDataType: 'metadata' })
  f.frame()
  assert.deepEqual(
    f.submissions[0].data.features.map((x) => x.id),
    ['A', 'B'],
  )
  assert.equal(f.map.getSource('ships').workerData().length, 3)
  f.register.destroy()
})

test('static, filtered, clustered, generated-ID and lineMetrics sources retain full submissions', () => {
  for (const options of [
    {},
    { dynamic: false },
    { dynamic: true, cluster: true },
    { dynamic: true, filter: ['has', 'id'] },
    { dynamic: true, generateId: true },
    { dynamic: true, lineMetrics: true },
  ]) {
    const f = fixture([feature('A')], options)
    f.register.setGeoJSONData('ships', feature('B'))
    f.frame()
    assert.equal(f.submissions[0].method, 'setData')
    assert.equal(f.submissions[0].data.features.length, 2)
    f.register.destroy()
  }
})

test('incremental failure falls back once to a complete replacement including deletions', () => {
  const f = fixture([feature('A'), feature('B')], { dynamic: true })
  f.map.getSource('ships').updateData = () => {
    throw new Error('incremental unsupported')
  }
  f.register.setGeoJSONData('ships', [feature('A', null), feature('C')])
  f.frame()
  assert.equal(f.frames.size, 1)
  f.frame()
  assert.equal(f.submissions[0].method, 'setData')
  assert.deepEqual(
    f.map
      .getSource('ships')
      .workerData()
      .map((x) => x.id),
    ['B', 'C'],
  )
  assert.equal(f.frames.size, 0)
  f.register.destroy()
})

test('asynchronous incremental errors recover with a full snapshot, without retrying permanent full errors', () => {
  const f = fixture([feature('A')], { dynamic: true })
  f.register.setGeoJSONData('ships', feature('B'))
  f.frame()
  f.map.fire('error', { sourceId: 'ships', error: new Error('worker append failed') })
  f.frame()
  assert.equal(f.submissions[1].method, 'setData')
  assert.equal(f.submissions[1].data.features.length, 2)
  f.map.fire('error', { sourceId: 'ships', error: new Error('worker full failed') })
  assert.equal(f.frames.size, 0)
  f.register.destroy()
})

test('external full replacements and multiple registers remain consistent after incremental updates', () => {
  const f = fixture([feature('A')], { dynamic: true })
  const second = new ResourceRegister(f.map)
  f.register.setGeoJSONData('ships', feature('B'))
  second.setGeoJSONData('ships', feature('C'))
  f.frame()
  assert.equal(f.map.getSource('ships').workerData().length, 3)
  f.map
    .getSource('ships')
    .setData({ type: 'FeatureCollection', features: [feature('replacement')] })
  f.register.setGeoJSONData('ships', feature('D'))
  f.frame()
  assert.deepEqual(
    f.map
      .getSource('ships')
      .workerData()
      .map((x) => x.id),
    ['replacement', 'D'],
  )
  assert.equal(second.findFeature('ships', 'B'), undefined)
  f.register.destroy()
  second.destroy()
})

test('an external full replacement during an in-flight append gets a settled full replay', () => {
  const f = fixture([feature('A')], { dynamic: true })
  f.register.setGeoJSONData('ships', feature('B'))
  f.frame()
  const source = f.map.getSource('ships')
  source.setReady(false)
  source.setData({ type: 'FeatureCollection', features: [feature('replacement')] })
  source.setReady(true)
  f.map.fire('sourcedata', { sourceId: 'ships', sourceDataType: 'content' })
  f.frame()
  assert.equal(f.submissions.length, 3)
  assert.equal(f.submissions[2].method, 'setData')
  assert.deepEqual(
    f.submissions[2].data.features.map((x) => x.id),
    ['replacement'],
  )
  f.register.destroy()
})

test('sources without updateData keep using full submissions', () => {
  const f = fixture([feature('A')], { dynamic: true })
  f.map.getSource('ships').updateData = undefined
  f.register.setGeoJSONData('ships', feature('B'))
  f.frame()
  assert.equal(f.submissions[0].method, 'setData')
  assert.equal(f.submissions[0].data.features.length, 2)
  f.register.destroy()
})

test('style restoration backs up all features after a delta, including unflushed updates and deletes', () => {
  const f = fixture([feature('A'), feature('B')], { dynamic: true })
  const styles = new StyleResources(f.map)
  f.register.addLayer({ zIndex: 1, layer: { id: 'ship-layer', type: 'circle', source: 'ships' } })
  f.register.setGeoJSONData('ships', feature('C'))
  f.frame()
  f.register.setGeoJSONData('ships', [feature('A', null), feature('D')])
  styles.change({ version: 8, sources: {}, layers: [] })
  f.frame()
  f.register.setGeoJSONData('ships', feature('E'))
  f.map.completeStyle()
  f.frame()
  assert.deepEqual(
    f.map
      .getSource('ships')
      .workerData()
      .map((x) => x.id),
    ['B', 'C', 'D', 'E'],
  )
  assert.ok(f.map.getLayer('ship-layer'))
  assert.equal(f.map.getSource('ships').serialize().dynamic, true)
  f.map.fire('remove')
  assert.equal(f.map.listenerCount(), 0)
})

test('rapid repeated basemap changes retain the earlier backup and latest queued edits', () => {
  const f = fixture([feature('A')], { dynamic: true })
  const styles = new StyleResources(f.map)
  const style = { version: 8, sources: {}, layers: [] }
  f.register.addLayer({ zIndex: 1, layer: { id: 'ship-layer', type: 'circle', source: 'ships' } })
  f.register.setGeoJSONData('ships', feature('B'))
  f.frame()
  styles.change(style)
  f.register.setGeoJSONData('ships', feature('C'))
  styles.change(style)
  f.register.setGeoJSONData('ships', feature('A', null))
  styles.change(style)
  f.map.completeStyle()
  f.frame()
  assert.deepEqual(
    f.map
      .getSource('ships')
      .workerData()
      .map((x) => x.id),
    ['B', 'C'],
  )
  assert.deepEqual(
    f.layers.map((x) => x.id),
    ['ship-layer'],
  )
  f.map.fire('remove')
})

test('snapshot merges overlapping unflushed writers in actual call order', () => {
  const f = fixture([feature('A')], { dynamic: true })
  const second = new ResourceRegister(f.map)
  f.register.setGeoJSONData('ships', { ...feature('A'), properties: { version: 1 } })
  second.setGeoJSONData('ships', { ...feature('A'), properties: { version: 2 } })
  f.register.setGeoJSONData('ships', { ...feature('A'), properties: { version: 3 } })
  assert.equal(getSourceSnapshot(f.map, 'ships').features[0].properties.version, 3)
  const styles = new StyleResources(f.map)
  styles.change({ version: 8, sources: {}, layers: [] })
  f.map.completeStyle()
  f.frame()
  assert.equal(f.map.getSource('ships').workerData()[0].properties.version, 3)
  f.map.fire('remove')
})

test('writes emitted synchronously while restoring a source are not acknowledged early', () => {
  const f = fixture([feature('A')], { dynamic: true })
  const styles = new StyleResources(f.map)
  f.register.setGeoJSONData('ships', feature('B'))
  styles.change({ version: 8, sources: {}, layers: [] })
  const add = f.map.addSource
  f.map.addSource = (id, spec) => {
    add(id, spec)
    f.register.setGeoJSONData(id, feature('C'))
  }
  f.map.completeStyle()
  f.frame()
  f.frame() // The reentrant edit is submitted after the deferred restore.
  assert.deepEqual(
    f.map
      .getSource('ships')
      .workerData()
      .map((x) => x.id),
    ['A', 'B', 'C'],
  )
  f.map.fire('remove')
})

test('synchronous style completion restores once, and removal cancels pending restore listeners', () => {
  const f = fixture([feature('A')], { dynamic: true })
  const styles = new StyleResources(f.map)
  const setStyle = f.map.setStyle
  f.map.setStyle = () => {
    setStyle()
    f.map.completeStyle()
  }
  styles.change({ version: 8, sources: {}, layers: [] })
  f.frame()
  assert.equal(f.map.getSource('ships').workerData().length, 1)
  f.map.setStyle = setStyle
  styles.change({ version: 8, sources: {}, layers: [] })
  f.map.fire('remove')
  assert.equal(f.map.listenerCount(), 0)
  assert.equal(f.frames.size, 0)
})

test('old-style data events during setStyle cannot consume the restore backup', () => {
  const f = fixture([feature('A')], { dynamic: true })
  const styles = new StyleResources(f.map)
  const setStyle = f.map.setStyle
  f.map.setStyle = () => {
    f.map.fire('styledata')
    setStyle()
  }
  styles.change({ version: 8, sources: {}, layers: [] })
  f.map.completeStyle()
  f.frame()
  assert.equal(f.map.getSource('ships').workerData().length, 1)
  f.map.fire('remove')
})

test('style events defer symbol restoration until outside the active Mapbox render stack', () => {
  const f = fixture([feature('A')], { dynamic: true })
  const styles = new StyleResources(f.map)
  f.register.addLayer({ zIndex: 1, layer: { id: 'symbol', type: 'symbol', source: 'ships' } })
  styles.change({ version: 8, sources: {}, layers: [] })
  // Mapbox emits styledata after recalculating layout, before continuePlacement.
  // A symbol added in this event still has an undefined evaluated layout this frame.
  f.map.completeStyle()
  f.map.fire('styledata')
  assert.equal(f.map.getLayer('symbol'), undefined, 'must not add a symbol during styledata')
  assert.equal(f.frames.size, 1, 'repeated events coalesce into one restore')
  f.register.setGeoJSONData('ships', feature('between-event-and-frame'))
  f.frame()
  assert.ok(f.map.getLayer('symbol'))
  assert.deepEqual(
    f.map
      .getSource('ships')
      .workerData()
      .map((item) => item.id),
    ['A', 'between-event-and-frame'],
  )
  f.map.fire('remove')
})

test('a newer switch cancels a queued restore without losing the snapshot', () => {
  const f = fixture([feature('A')], { dynamic: true })
  const styles = new StyleResources(f.map)
  const style = { version: 8, sources: {}, layers: [] }
  styles.change(style)
  f.map.completeStyle()
  assert.equal(f.frames.size, 1)
  styles.change(style)
  assert.equal(f.frames.size, 0, 'the old generation must not restore into a loading style')
  f.frame()
  assert.equal(f.map.getSource('ships'), undefined)
  f.map.completeStyle()
  f.frame()
  assert.equal(f.map.getSource('ships').workerData()[0].id, 'A')
  f.map.fire('remove')
})

test('raster tiles starting to load after styledata do not strand a queued restore', () => {
  const f = fixture([feature('A')])
  const styles = new StyleResources(f.map)
  styles.change({ version: 8, sources: {}, layers: [] })
  // A successful style diff emits styledata, but not necessarily style.load.
  f.map.isStyleLoaded = () => true
  f.map.fire('styledata')
  assert.equal(f.frames.size, 1)
  f.map.isStyleLoaded = () => false // Tile requests start later in that same render.
  f.frame()
  assert.equal(f.map.getSource('ships').workerData()[0].id, 'A')
  f.map.fire('remove')
})

test('a completed style diff restores while raster tiles are loading without style.load', () => {
  const f = fixture([feature('A')])
  const styles = new StyleResources(f.map)
  f.map.setStyle = () => {
    f.sources.clear()
    f.layers.length = 0
    // getStyle still succeeds: diff keeps the initialized Style instance.
    f.map.isStyleLoaded = () => false
  }
  styles.change({ version: 8, sources: {}, layers: [] })
  assert.equal(f.frames.size, 1)
  f.frame()
  assert.equal(f.map.getSource('ships').workerData()[0].id, 'A')
  f.map.fire('remove')
})

test('map removal cancels a queued restore before touching destroyed style resources', () => {
  const f = fixture([feature('A')])
  const styles = new StyleResources(f.map)
  styles.change({ version: 8, sources: {}, layers: [] })
  f.map.completeStyle()
  assert.equal(f.frames.size, 1)
  f.map.fire('remove')
  assert.equal(f.frames.size, 0)
  assert.equal(f.map.listenerCount(), 0)
  f.map.addSource = () => assert.fail('must not restore into a removed map')
  f.frame()
})
