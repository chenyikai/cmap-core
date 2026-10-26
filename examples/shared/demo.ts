import { CMap } from 'cmap-core'
import { LngLat, NavigationControl, type Map, type StyleSpecification } from 'mapbox-gl'

export interface DemoContext {
  cmap: CMap
  map: Map
  controls: HTMLElement
  overlay: HTMLElement
  button(label: string, action: () => unknown | Promise<unknown>): HTMLButtonElement
  log(message: string, value?: unknown): void
  cleanup(fn: () => void): void
  fit(positions: LngLat[]): void
}

export type Demo = (ctx: DemoContext) => void | Promise<void>
export const origin = new LngLat(122.25, 29.95)
export const at = (x: number, y: number) => new LngLat(origin.lng + x, origin.lat + y)

// No basemap credentials or remote tiles are needed for the learning examples.
export const plainStyle = (): StyleSpecification => ({
  version: 8,
  // Required by symbol-layer validation; localFontFamily generates all glyphs locally.
  glyphs: 'data:application/x-protobuf;base64,#{fontstack}/{range}',
  sources: {},
  layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#dceaf0' } }],
})

export async function createDemo(container: HTMLElement): Promise<DemoContext> {
  container.innerHTML = `<div class="demo-toolbar" id="controls"></div>
    <div class="map-wrap"><div id="demo-map"></div><div id="overlay"></div>
    <span class="map-note">示意底图 · 舟山附近 · 合成数据</span></div>
    <details class="event-log" open><summary>事件与输出</summary><pre id="log">初始化地图…</pre></details>`
  const output = container.querySelector<HTMLPreElement>('#log')!
  const controls = container.querySelector<HTMLElement>('#controls')!
  const disposers: (() => void)[] = []
  const entries: string[] = []
  const log = (message: string, value?: unknown): void => {
    const detail = value === undefined ? '' : `\n${JSON.stringify(value, null, 2)}`
    entries.unshift(`${message}${detail}`)
    output.textContent = entries.slice(0, 12).join('\n\n')
  }
  const cmap = new CMap({
    container: 'demo-map',
    center: origin,
    zoom: 13.3,
    style: plainStyle(),
    localFontFamily: 'sans-serif',
    ...(import.meta.env.VITE_TDT_TOKEN ? { TDTToken: import.meta.env.VITE_TDT_TOKEN } : {}),
  })
  const map = cmap.getMap()
  const report = (message: string): void => {
    document.querySelector('#status')!.textContent = '运行错误'
    document.querySelector('#status')!.setAttribute('data-error', 'true')
    log('错误', message)
  }
  map.on('error', (e) => report(e.error.message))
  const onError = (e: ErrorEvent): void => report(e.message)
  const onRejection = (e: PromiseRejectionEvent): void => report(String(e.reason))
  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onRejection)
  window.addEventListener(
    'pagehide',
    () => {
      for (const dispose of disposers.reverse()) {
        try {
          dispose()
        } catch (error) {
          console.warn('Demo cleanup:', error)
        }
      }
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
      map.remove()
    },
    { once: true },
  )
  await cmap.mapLoaded()
  map.addControl(new NavigationControl(), 'top-right')
  const ctx: DemoContext = {
    cmap,
    map,
    controls,
    overlay: container.querySelector('#overlay')!,
    log,
    cleanup: (fn) => {
      disposers.push(fn)
    },
    fit: (positions) => {
      const lngs = positions.map((p) => p.lng),
        lats = positions.map((p) => p.lat)
      map.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: 80, maxZoom: 16, duration: 0 },
      )
    },
    button: (label, action) => {
      const button = document.createElement('button')
      button.textContent = label
      button.onclick = async () => {
        button.disabled = true
        try {
          await action()
        } catch (error) {
          report(String(error))
        } finally {
          button.disabled = false
        }
      }
      controls.append(button)
      return button
    },
  }
  return ctx
}
