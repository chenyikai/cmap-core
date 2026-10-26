import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'
import * as turf from '@turf/turf'
import EventEmitter from 'eventemitter3'
import mapbox from 'mapbox-gl'
import RBush from 'rbush'
import dayjs from 'dayjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const cache = new Map()
const externals = {
  '@turf/turf': turf,
  eventemitter3: { default: EventEmitter },
  'mapbox-gl': mapbox,
  rbush: { default: RBush },
  dayjs: { default: dayjs },
}

export function load(relative) {
  let file = path.resolve(root, relative)
  if (!path.extname(file))
    file = fs.existsSync(file + '.ts') ? file + '.ts' : path.join(file, 'index.ts')
  if (cache.has(file)) return cache.get(file)
  const exports = {}
  cache.set(file, exports)
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      useDefineForClassFields: true,
    },
  }).outputText
  const require = (name) => {
    if (name === './Context.ts') return { getOrCreateContext: (map) => map.context }
    if (externals[name]) return externals[name]
    return load(
      name.startsWith('@/') ? 'src/' + name.slice(2) : path.resolve(path.dirname(file), name),
    )
  }
  vm.runInNewContext(
    code,
    {
      exports,
      require,
      console,
      performance: { now: () => 0 },
      requestAnimationFrame: (fn) => globalThis.requestAnimationFrame(fn),
      cancelAnimationFrame: (id) => globalThis.cancelAnimationFrame(id),
    },
    { filename: file },
  )
  return exports
}

function eventTarget() {
  const listeners = new Map()
  return {
    addEventListener(type, fn) {
      listeners.set(type, [...(listeners.get(type) ?? []), fn])
    },
    removeEventListener(type, fn) {
      listeners.set(
        type,
        (listeners.get(type) ?? []).filter((f) => f !== fn),
      )
    },
    dispatch(type) {
      for (const fn of listeners.get(type) ?? []) fn()
    },
    count(type) {
      return (listeners.get(type) ?? []).length
    },
  }
}

export function createMap({ loaded = true, ratio = 1 } = {}) {
  const events = new Map(),
    features = new Map(),
    canvases = []
  const counts = { projections: 0, measurements: 0, paints: 0, contextReads: 0 }
  const document = {
    fonts: eventTarget(),
    defaultView: { devicePixelRatio: ratio, getComputedStyle: () => ({}) },
    createElement(tag) {
      const node = {
        tagName: tag.toUpperCase(),
        ownerDocument: document,
        style: {},
        className: '',
        children: [],
        parentNode: null,
        width: 300,
        height: 150,
        textContent: '',
        ...eventTarget(),
        appendChild(child) {
          child.remove()
          child.parentNode = this
          this.children.push(child)
          return child
        },
        removeChild(child) {
          this.children = this.children.filter((x) => x !== child)
          child.parentNode = null
        },
        remove() {
          this.parentNode?.removeChild(this)
        },
        setAttribute(name, value) {
          this[name] = value
        },
        get firstElementChild() {
          return this.children[0]
        },
        get offsetWidth() {
          counts.measurements++
          return this.testWidth ?? this.children[0]?.offsetWidth ?? 40
        },
        get offsetHeight() {
          counts.measurements++
          return this.testHeight ?? this.children[0]?.offsetHeight ?? 20
        },
      }
      if (tag === 'canvas') {
        const calls = []
        const ctx = {
          calls,
          measureText(text) {
            return { width: text.length * 7, fontBoundingBoxAscent: 10, fontBoundingBoxDescent: 2 }
          },
        }
        for (const method of [
          'setTransform',
          'clearRect',
          'scale',
          'translate',
          'beginPath',
          'moveTo',
          'lineTo',
          'arcTo',
          'closePath',
          'fill',
          'stroke',
          'strokeRect',
          'drawImage',
          'fillText',
        ]) {
          ctx[method] = (...args) => {
            if (method === 'clearRect') calls.length = 0
            calls.push([method, ...args])
          }
        }
        node.getContext = () => ctx
        node.ctx = ctx
        canvases.push(node)
      }
      return node
    },
  }
  const container = document.createElement('div')
  container.clientWidth = 800
  container.clientHeight = 600
  let ready = loaded,
    zoom = 10,
    shift = 0
  const map = {
    repaintPending: false,
    on(type, layer, fn) {
      if (typeof layer === 'function') [fn, layer] = [layer, '']
      const key = type + ':' + layer
      events.set(key, [...(events.get(key) ?? []), fn])
      return this
    },
    off(type, layer, fn) {
      if (typeof layer === 'function') [fn, layer] = [layer, '']
      const key = type + ':' + layer
      events.set(
        key,
        (events.get(key) ?? []).filter((x) => x !== fn && x.original !== fn),
      )
      return this
    },
    once(type, fn) {
      const wrapped = (e) => {
        this.off(type, wrapped)
        fn(e)
      }
      wrapped.original = fn
      return this.on(type, wrapped)
    },
    fire(type, e = {}, layer = '') {
      for (const fn of [...(events.get(type + ':' + layer) ?? [])]) fn(e)
    },
    listenerCount(type) {
      return [...events]
        .filter(([key]) => !type || key.startsWith(type + ':'))
        .reduce((n, [, list]) => n + list.length, 0)
    },
    triggerRepaint() {
      this.repaintPending = true
      counts.paints++
    },
    isStyleLoaded: () => ready,
    setReady() {
      ready = true
      this.fire('load')
    },
    getProjection: () => ({ name: 'mercator' }),
    getRenderWorldCopies: () => false,
    getCenter: () => new mapbox.LngLat(100, 40),
    getZoom: () => zoom,
    setZoom(value) {
      zoom = value
      this.fire('move')
      this.fire('moveend')
    },
    setShift(value) {
      shift = value
      this.fire('move')
    },
    project(value) {
      counts.projections++
      const p = mapbox.LngLat.convert(value)
      return new mapbox.Point(p.lng + shift, p.lat)
    },
    unproject(value) {
      const p = mapbox.Point.convert(value)
      return new mapbox.LngLat(p.x - shift, p.y)
    },
    getCanvasContainer: () => container,
    getCanvas: () => ({ width: 800, height: 600 }),
    getBounds: () => ({ contains: () => true }),
    getFeatureState: () => ({}),
    setFeatureState() {},
    removeFeatureState() {},
    remove() {
      this.fire('beforeRemove')
      this.fire('remove')
    },
  }
  const context = {
    map,
    events: new EventEmitter(),
    register: {
      addSource() {},
      addLayer() {},
      setGeoJSONData(source, input) {
        for (const feature of Array.isArray(input) ? input : [input]) {
          if (feature.geometry) features.set(feature.id, feature)
          else features.delete(feature.id)
        }
      },
    },
    focus: { remove() {} },
    iconManage: { loadSvg() {}, getImage: () => ({ width: 20, height: 20 }) },
  }
  Object.defineProperty(map, 'context', {
    get() {
      counts.contextReads++
      return context
    },
  })
  function frame() {
    map.repaintPending = false
    map.fire('render')
  }
  function settle(limit = 100) {
    let n = 0
    while (map.repaintPending && n++ < limit) frame()
    return n
  }
  return { map, frame, settle, container, document, canvases, counts, features }
}

export const plain = (value) => JSON.parse(JSON.stringify(value))
