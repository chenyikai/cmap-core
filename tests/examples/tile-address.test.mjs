import assert from 'node:assert/strict'
import test from 'node:test'
import { parseTileAddress } from '../manual/tile-address.js'

const base = 'https://tiles.example.com'

test('a concrete XYZ image becomes a template centered on that tile', () => {
  const tile = parseTileAddress(`  ${base}/maps/2026/3/6/3.png  `)
  assert.equal(tile.template, `${base}/maps/2026/{z}/{x}/{y}.png`)
  assert.deepEqual([tile.z, tile.x, tile.y], [3, 6, 3])
  assert.equal(tile.lng, 112.5)
  assert.ok(Math.abs(tile.lat - 21.943045533438177) < 1e-10)
  assert.equal(tile.zoom, 2)
})

test('path order and TMS numbering independently control the geographic center', () => {
  const xyz = parseTileAddress(`${base}/3/6/3.png`)
  const swapped = parseTileAddress(`${base}/3/3/6.webp`, { order: 'zyx' })
  assert.equal(swapped.template, `${base}/{z}/{y}/{x}.webp`)
  assert.deepEqual([swapped.lng, swapped.lat], [xyz.lng, xyz.lat])
  const tms = parseTileAddress(`${base}/3/4/6.png`, { order: 'zyx', scheme: 'tms' })
  assert.deepEqual([tms.lng, tms.lat], [xyz.lng, xyz.lat])
  assert.deepEqual([tms.z, tms.x, tms.y], [3, 6, 4])
})

test('512 px tiles use their native zoom and world tiles stay within the map zoom range', () => {
  assert.equal(parseTileAddress(`${base}/3/6/3.png`, { tileSize: 512 }).zoom, 3)
  for (const tileSize of [256, 512]) {
    const world = parseTileAddress(`${base}/0/0/0.png`, { tileSize })
    assert.deepEqual([world.lng, world.lat, world.zoom], [0, 0, 0])
  }
})

test('image suffixes, retina suffixes and unrelated signed parameters are preserved verbatim', () => {
  for (const suffix of ['', '.jpg', '.JPEG', '.webp', '.avif', '@2x.png']) {
    const query = '?token=a%2Bb+c&token=other%20value&empty=&flag'
    const tile = parseTileAddress(`${base}/3/6/3${suffix}${query}`)
    assert.equal(tile.template, `${base}/{z}/{x}/{y}${suffix}${query}`)
  }
})

test('query coordinates are replaced without normalizing signatures, key casing or ordering', () => {
  const tile = parseTileAddress(
    `${base}/tiles?token=a%2Bb+c&Y=3&z=3&x=6&token=other%20value&flag`,
    { order: 'zyx' },
  )
  assert.equal(
    tile.template,
    `${base}/tiles?token=a%2Bb+c&Y={y}&z={z}&x={x}&token=other%20value&flag`,
  )
  assert.deepEqual([tile.z, tile.x, tile.y], [3, 6, 3])
  assert.equal(tile.lng, 112.5)
})

test('numeric WMTS and zoom/col/row query parameters are recognized by name', () => {
  for (const [z, x, y] of [
    ['TileMatrix', 'TileCol', 'TileRow'],
    ['zoom', 'col', 'row'],
    ['level', 'x', 'y'],
  ]) {
    const tile = parseTileAddress(`${base}/wmts?${z}=3&${x}=6&${y}=3&layer=base`)
    assert.equal(tile.template, `${base}/wmts?${z}={z}&${x}={x}&${y}={y}&layer=base`)
    assert.deepEqual([tile.z, tile.x, tile.y], [3, 6, 3])
  }
})

test('existing templates remain under manual control', () => {
  assert.equal(parseTileAddress(`${base}/{z}/{x}/{y}.png`), null)
  assert.equal(parseTileAddress(`${base}?TileRow={y}&TileCol={x}&TileMatrix={z}`), null)
  assert.throws(() => parseTileAddress(`${base}/{z}/6/3.png`), /同时包含/)
})

test('edge tiles at the highest supported level produce finite centers inside Mercator bounds', () => {
  const n = 2 ** 22
  for (const [x, y] of [
    [0, 0],
    [n - 1, n - 1],
  ]) {
    const tile = parseTileAddress(`${base}/22/${x}/${y}.png`)
    assert.ok(tile.lng > -180 && tile.lng < 180)
    assert.ok(tile.lat > -85.05112878 && tile.lat < 85.05112878)
    // Invert the projected center to ensure it still targets the original tile.
    assert.equal(Math.floor(((tile.lng + 180) / 360) * n), x)
    assert.equal(
      Math.floor(((1 - Math.asinh(Math.tan((tile.lat * Math.PI) / 180)) / Math.PI) / 2) * n),
      y,
    )
  }
})

test('ambiguous, missing and unsupported coordinates fail with useful errors', () => {
  for (const url of [
    `${base}/tile.png`,
    `${base}?z=3&x=6`,
    `${base}?z=3&zoom=3&x=6&y=3`,
    `${base}?z=3&x=6&y=3&x=5`,
    `${base}?TileMatrix=EPSG:3857:3&TileCol=6&TileRow=3`,
    `${base}/03/6/3.png`,
    `${base}?z=3&x=-1&y=3`,
    `${base}?z=3&x=1.5&y=3`,
    `${base}/23/0/0.png`,
    `${base}/3/8/0.png`,
    `${base}/3/0/8.png`,
    `${base}/3/9007199254740992/3.png`,
  ])
    assert.throws(() => parseTileAddress(url), Error, url)
})

test('unsupported URLs and parser settings are rejected before loading', () => {
  for (const url of [
    undefined,
    '',
    '/3/6/3.png',
    'file:///3/6/3.png',
    'https://user:pass@tiles.example.com/3/6/3.png',
    `${base}/3/6/3.png#fragment`,
    `${base}/3/6/3.png?key=a b`,
  ])
    assert.throws(() => parseTileAddress(url))
  for (const options of [{ scheme: 'other' }, { tileSize: 1024 }, { order: 'xyz' }])
    assert.throws(() => parseTileAddress(`${base}/3/6/3.png`, options))
})
