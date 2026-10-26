import mapbox from 'mapbox-gl'
import '../../src/styles/index.scss'
import { Tooltip } from '../../src/core/Tooltip'
import { CMap } from '../../src/modules/CMap'
import type { Anchor } from '../../src/types/Toolip'

const cmap = new CMap({
  container: 'map',
  center: [120, 30],
  zoom: 9,
  style: {
    version: 8,
    sources: {},
    layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#d4eaee' } }],
  },
})
const map = cmap.getMap()
let items: (Tooltip | mapbox.Marker)[] = []

function element(text: string, theme = 'ship'): HTMLDivElement {
  const box = document.createElement('div')
  box.className = `${theme}-name-box`
  const label = document.createElement('div')
  label.className = `${theme}-name`
  label.textContent = text
  box.append(label)
  return box
}

function reset(): void {
  items.forEach((item) => item.remove())
  items = []
}

function scene(): void {
  reset()
  document.getElementById('info')!.textContent = '左：Canvas 文本标签　右：原生 Marker + 原有 CSS'
  const samples = ['浙渔 001', '浙渔 12345 / AIS', '2026-10-13 12:34:56', '长船名测试 ABC 中文']
  samples.forEach((text, i) => {
    const theme = i === 2 ? 'track' : 'ship'
    items.push(
      new Tooltip(map, {
        position: map.unproject([270, 120 + i * 90]),
        text,
        theme,
        anchor: 'center',
        line: false,
      }),
    )
    items.push(
      new mapbox.Marker({
        element: element(text, theme),
        anchor: 'center',
      })
        .setLngLat(map.unproject([710, 120 + i * 90]))
        .addTo(map),
    )
  })
}

function connectorScene(dense = false): void {
  reset()
  document.getElementById('info')!.textContent = dense
    ? '密集标签：避让文字、目标图标和连接线；无可用位置时隐藏标签'
    : '九种锚点：连接线止于朝向目标的标签边界，中心重叠时不画线'
  const anchors: Anchor[] = [
    'top-left',
    'top',
    'top-right',
    'left',
    'center',
    'right',
    'bottom-left',
    'bottom',
    'bottom-right',
  ]
  const count = dense ? 180 : anchors.length
  for (let i = 0; i < count; i++) {
    const x = dense ? 100 + ((i * 73) % 900) : 220 + (i % 3) * 310
    const y = dense ? 90 + ((i * 37) % 530) : 170 + Math.floor(i / 3) * 210
    const position = map.unproject([x, y])
    const symbol = document.createElement('div')
    symbol.style.cssText =
      'width:14px;height:14px;background:#999;border:1px solid #333;border-radius:50%;'
    items.push(new mapbox.Marker({ element: symbol }).setLngLat(position).addTo(map))
    items.push(
      new Tooltip(map, {
        position,
        text: dense ? `船名 ${i}` : anchors[i],
        anchor: dense ? 'bottom-right' : anchors[i],
        collision: dense,
        targetRadius: 9,
        offsetX: 12,
        offsetY: 30,
        line: true,
      }),
    )
  }
}

function bulk(mode: 'canvas' | 'marker', count: number, collision = false): void {
  reset()
  const { clientWidth: width, clientHeight: height } = map.getCanvas()
  for (let i = 0; i < count; i++) {
    const position = map.unproject([
      60 + ((i * 73) % (width - 120)),
      60 + ((i * 37) % (height - 120)),
    ])
    const text = `浙渔 ${String(i).padStart(5, '0')}`
    items.push(
      mode === 'canvas'
        ? new Tooltip(map, { position, text, collision })
        : new mapbox.Marker({ element: element(text), anchor: 'bottom-right' })
            .setLngLat(position)
            .addTo(map),
    )
  }
}

// Deliberately construct a label before style load to exercise the public entry point.
items.push(new Tooltip(map, { position: [120, 30], text: '等待地图加载' }))
map.once('load', () => {
  const params = new URLSearchParams(location.search)
  if (params.has('connectors')) connectorScene(params.has('dense'))
  else scene()
  Object.assign(window, {
    tooltipHarness: {
      map,
      Tooltip,
      scene,
      connectorScene,
      bulk,
      reset,
      get items() {
        return items
      },
      stats: () => ({
        labels: items.length,
        overlays: document.querySelectorAll('.cmap-tooltip-canvas').length,
        markers: document.querySelectorAll('.mapboxgl-marker').length,
        domLabels: document.querySelectorAll('.cmap-tooltip-dom').length,
        visible: items.filter((item) => item instanceof Tooltip && item.visible).length,
      }),
    },
  })
})
