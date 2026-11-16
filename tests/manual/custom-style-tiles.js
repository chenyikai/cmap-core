import { CMap } from 'cmap-core'
import { NavigationControl } from 'mapbox-gl'
import 'cmap-core/style.css'

const element = (id) => document.getElementById(id)
const defaults = {
  url: '',
  scheme: 'xyz',
  tileSize: 256,
  minzoom: 0,
  maxzoom: 22,
  lng: 105,
  lat: 35,
  zoom: 4,
}
const form = element('tile-form')
let map
let activeConfig
let activeStyle
let controlMode = false
let probeController
let generation = 0

const canvas = document.createElement('canvas')
canvas.width = canvas.height = 256
const context = canvas.getContext('2d')
context.fillStyle = '#c2e7e8'
context.fillRect(0, 0, 256, 256)
context.fillStyle = '#e5eed4'
context.fillRect(0, 0, 128, 128)
context.fillRect(128, 128, 128, 128)
context.strokeStyle = '#42787b'
context.strokeRect(1, 1, 254, 254)
context.fillStyle = '#23474e'
context.font = 'bold 18px sans-serif'
context.fillText('CMap raster OK', 45, 120)
context.font = '14px sans-serif'
context.fillText('LOCAL CONTROL / 256 px', 34, 147)
const controlTile = canvas.toDataURL('image/png')

function validate(config) {
  if (!config || typeof config.url !== 'string') throw new Error('请输入瓦片地址。')
  const url = config.url.trim()
  if (!url || /\s/.test(url)) throw new Error('瓦片地址不能为空或包含空格、换行。')
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('请输入完整的 http:// 或 https:// 瓦片地址。')
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error('请使用 HTTP/HTTPS 地址，不支持其他协议或内嵌用户名、密码。')
  }
  if (parsed.hash) throw new Error('瓦片地址不能包含 # 片段。')
  if (!['{z}', '{x}', '{y}'].every((token) => url.includes(token))) {
    throw new Error('地址必须包含 {z}、{x}、{y}，请勿填写单张图片的固定坐标。')
  }
  if (/\{[^}]*\}/.test(url.replace(/\{[zxy]\}/g, ''))) {
    throw new Error('目前支持 {z}、{x}、{y}；请将域名、图层名等其他参数填写为实际值。')
  }
  if (!['xyz', 'tms'].includes(config.scheme)) throw new Error('请选择 XYZ 或 TMS。')
  if (![256, 512].includes(config.tileSize)) throw new Error('瓦片尺寸请选择 256 或 512。')
  const ranges = {
    minzoom: ['最小瓦片级别', 0, 22],
    maxzoom: ['最大瓦片级别', 0, 22],
    lng: ['中心经度', -180, 180],
    lat: ['中心纬度', -85.05112878, 85.05112878],
    zoom: ['地图缩放', 0, 22],
  }
  for (const [key, [label, min, max]] of Object.entries(ranges)) {
    if (!Number.isFinite(config[key]) || config[key] < min || config[key] > max) {
      throw new Error(`${label}应在 ${min} 到 ${max} 之间。`)
    }
  }
  if (!Number.isInteger(config.minzoom) || !Number.isInteger(config.maxzoom)) {
    throw new Error('瓦片级别必须是整数。')
  }
  if (config.minzoom > config.maxzoom) throw new Error('最小瓦片级别不能大于最大瓦片级别。')
  if (location.protocol === 'https:' && parsed.protocol === 'http:') {
    throw new Error(
      '当前页面使用 HTTPS，浏览器会限制 HTTP 瓦片。请使用 HTTPS 服务或在本地 HTTP 页面调试。',
    )
  }
  return Object.fromEntries(
    Object.keys(defaults).map((key) => [key, key === 'url' ? url : config[key]]),
  )
}

function writeForm(config) {
  for (const key of Object.keys(defaults)) element(key).value = config[key]
}

function readForm() {
  return validate(
    Object.fromEntries(
      Object.keys(defaults).map((key) => {
        const value = element(key).value.trim()
        return [key, ['url', 'scheme'].includes(key) ? value : value === '' ? NaN : Number(value)]
      }),
    ),
  )
}

function cameraConfig() {
  const center = map.getCenter().wrap()
  return { ...activeConfig, lng: center.lng, lat: center.lat, zoom: map.getZoom() }
}

function mapOptions() {
  const config = cameraConfig()
  return {
    container: 'map',
    center: [config.lng, config.lat],
    zoom: config.zoom,
    style: activeStyle,
  }
}

function showConfig() {
  if (!controlMode) element('config').textContent = JSON.stringify(mapOptions(), null, 2)
}

function mount(config, local = false) {
  generation++
  probeController?.abort()
  probeController = undefined
  map?.remove()
  map = undefined
  activeConfig = { ...config }
  controlMode = local
  element('probe').disabled = local
  element('copy-config').disabled = local
  element('share').disabled = local
  element('form-status').textContent = local
    ? '正在使用本地对照图。填写瓦片地址和位置后，点击“加载图层”。'
    : '已应用输入配置。'
  element('share-result').hidden = true
  element('sample-url').hidden = true
  element('sample').textContent = local
    ? '本地对照图不请求远程瓦片。'
    : '点击“检测中心瓦片”查看响应。'
  element('state').textContent = '正在加载地图…'
  element('events').textContent = ''
  element('requests').textContent = '等待瓦片请求…'
  const source = {
    type: 'raster',
    tiles: [local ? controlTile : config.url],
    tileSize: local ? 256 : config.tileSize,
    scheme: local ? 'xyz' : config.scheme,
    minzoom: local ? 0 : config.minzoom,
    maxzoom: local ? 22 : config.maxzoom,
  }
  activeStyle = {
    version: 8,
    sources: { 'custom-tiles': source },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#e9e1d3' } },
      {
        id: 'custom-tiles',
        type: 'raster',
        source: 'custom-tiles',
        paint: { 'raster-opacity': 1, 'raster-fade-duration': 0 },
      },
    ],
  }
  let requestCount = 0
  let errorCount = 0
  const recentURLs = []
  const events = []
  const log = (message) => {
    events.unshift(message)
    events.length = Math.min(events.length, 10)
    element('events').textContent = events.join('\n')
  }
  const cmap = new CMap({
    container: 'map',
    center: [config.lng, config.lat],
    zoom: config.zoom,
    maxZoom: 22,
    style: activeStyle,
    transformRequest(url, resourceType) {
      if (resourceType === 'Tile') {
        requestCount++
        recentURLs.unshift(local ? '本地对照图片（data URI）' : url)
        recentURLs.length = Math.min(recentURLs.length, 6)
        element('requests').textContent = [
          `瓦片调度 ${requestCount} 次（不代表实际网络请求次数）`,
          ...recentURLs,
        ].join('\n')
      }
      return { url }
    },
  })
  map = cmap.getMap()
  const currentMap = map
  currentMap.addControl(new NavigationControl(), 'top-right')
  currentMap.on('style.load', () => log('style.load：自定义 style 已加载'))
  currentMap.on('load', () => log('load：地图初始化完成'))
  currentMap.on('error', (event) => {
    if (map !== currentMap) return
    errorCount++
    element('state').textContent = `本次加载出现 ${errorCount} 次错误，图层可能部分可见。`
    log(event.error?.message || '未知地图错误')
  })
  currentMap.on('idle', () => {
    if (map !== currentMap) return
    if (!errorCount) {
      element('state').textContent = local
        ? '本地对照已加载：彩色网格表示渲染正常。'
        : '地图已空闲，请结合图像及瓦片检测判断是否显示正确。'
    }
  })
  const camera = () => {
    const { lng, lat } = currentMap.getCenter().wrap()
    const zoom = currentMap.getZoom()
    const tileZoom = Math.max(0, Math.round(zoom + Math.log2(512 / source.tileSize)))
    element('camera').textContent =
      `中心 ${lng.toFixed(5)}, ${lat.toFixed(5)} · 地图缩放 ${zoom.toFixed(2)}`
    element('zoom-hint').textContent =
      !local && tileZoom < source.minzoom
        ? `当前视图低于瓦片最小级别 ${source.minzoom}，请放大地图。`
        : `当前中心检测使用瓦片 z=${Math.min(source.maxzoom, Math.max(source.minzoom, tileZoom))}。拖动地图后可“使用当前视野”更新输入。`
    showConfig()
  }
  currentMap.on('moveend', camera)
  camera()
  if (local) element('config').textContent = '本地对照模式。点击“加载图层”恢复输入的远程服务。'
}

// Use the same raster zoom rounding as Mapbox. TMS only reverses the Y index.
function centerTileURL() {
  const { lng, lat, zoom, tileSize, minzoom, maxzoom, scheme, url } = cameraConfig()
  const z = Math.min(maxzoom, Math.max(minzoom, Math.round(zoom + Math.log2(512 / tileSize))))
  const n = 2 ** z
  const x = Math.min(n - 1, Math.max(0, Math.floor(((lng + 180) / 360) * n)))
  const latitude = (Math.max(-85.05112878, Math.min(85.05112878, lat)) * Math.PI) / 180
  let y = Math.min(
    n - 1,
    Math.max(0, Math.floor(((1 - Math.asinh(Math.tan(latitude)) / Math.PI) / 2) * n)),
  )
  if (scheme === 'tms') y = n - 1 - y
  const values = { z, x, y }
  return url.replace(/\{([zxy])\}/g, (_, key) => String(values[key]))
}

async function probe() {
  if (!map || controlMode) return
  probeController?.abort()
  const controller = new AbortController()
  probeController = controller
  const run = generation
  const timeout = setTimeout(() => controller.abort(), 15000)
  const url = centerTileURL()
  element('probe').disabled = true
  element('sample-url').href = url
  element('sample-url').textContent = url
  element('sample-url').hidden = false
  element('sample').textContent = '正在检测当前已加载图层的中心瓦片…'
  let bitmap
  try {
    const response = await fetch(url, {
      credentials: 'omit',
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`)
    const blob = await response.blob()
    bitmap = await createImageBitmap(blob)
    if (controller.signal.aborted || run !== generation) return
    const pixels = document.createElement('canvas')
    pixels.width = pixels.height = 64
    const ctx = pixels.getContext('2d')
    ctx.drawImage(bitmap, 0, 0, 64, 64)
    const rgba = ctx.getImageData(0, 0, 64, 64).data
    const visible = rgba.some((value, index) => index % 4 === 3 && value > 0)
    element('sample').textContent = [
      `HTTP ${response.status} · ${blob.type || '未知类型'} · ${blob.size} bytes`,
      `尺寸：${bitmap.width} × ${bitmap.height}`,
      bitmap.width === activeConfig.tileSize && bitmap.height === activeConfig.tileSize
        ? '尺寸与当前配置一致。'
        : '图片尺寸与配置不同，请核实瓦片尺寸。',
      visible
        ? '缩略检测存在可见像素，请在地图中核对内容和位置。'
        : '缩略检测未发现可见像素，可能是透明瓦片。',
    ].join('\n')
  } catch (error) {
    if (run !== generation || probeController !== controller) return
    element('sample').textContent = controller.signal.aborted
      ? '检测超时，请检查服务是否可访问。'
      : `检测失败：${error.message}\n浏览器无法读取响应时，可能是 CORS、网络或服务错误；请结合浏览器 Network 面板核实。`
  } finally {
    clearTimeout(timeout)
    bitmap?.close()
    if (run === generation && probeController === controller) {
      probeController = undefined
      element('probe').disabled = false
    }
  }
}

async function copy(text, success) {
  try {
    await navigator.clipboard.writeText(text)
    element('form-status').textContent = success
  } catch {
    element('share-result').hidden = false
    element('copy-value').value = text
    element('copy-value').select()
    element('form-status').textContent = '浏览器未允许自动复制，请复制下方已选中的内容。'
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault()
  try {
    mount(readForm())
  } catch (error) {
    element('form-status').textContent = error.message
  }
})
form.addEventListener('input', () => {
  element('form-status').textContent = '配置已修改，点击“加载图层”后生效。'
})
element('reset').onclick = () => {
  history.replaceState(null, '', location.pathname + location.search)
  writeForm(defaults)
  mount(defaults, true)
}
element('control').onclick = () => mount(map ? cameraConfig() : defaults, true)
element('current-view').onclick = () => {
  if (!map) return
  const config = cameraConfig()
  for (const key of ['lng', 'lat', 'zoom']) element(key).value = config[key].toFixed(6)
  element('form-status').textContent = '已将当前地图位置写入输入框。'
}
element('probe').onclick = probe
element('copy-config').onclick = () => {
  if (map && !controlMode)
    void copy(
      `new CMap(${JSON.stringify(mapOptions(), null, 2)})`,
      '已复制当前图层的 CMap 接入配置。',
    )
}
element('share').onclick = () => {
  if (!map || controlMode) return
  const url = new URL(location.href)
  url.search = ''
  url.hash = `config=${encodeURIComponent(JSON.stringify(cameraConfig()))}`
  void copy(url.href, '已复制调试链接，打开后会恢复当前图层和视野。')
}
window.addEventListener(
  'pagehide',
  () => {
    generation++
    probeController?.abort()
    map?.remove()
  },
  { once: true },
)

function restoreLink() {
  let initial = defaults
  if (location.hash.startsWith('#config=')) {
    try {
      initial = validate(JSON.parse(decodeURIComponent(location.hash.slice('#config='.length))))
    } catch (error) {
      writeForm(defaults)
      mount(defaults, true)
      element('form-status').textContent =
        `调试链接无效：${error.message} 已清空瓦片地址，请重新填写。`
      return
    }
  }
  writeForm(initial)
  try {
    mount(initial, !initial.url)
  } catch (error) {
    element('form-status').textContent = `地图初始化失败：${error.message}`
  }
}
window.addEventListener('hashchange', restoreLink)
restoreLink()
