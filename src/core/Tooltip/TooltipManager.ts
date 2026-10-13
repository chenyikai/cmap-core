import type { Map as MapboxMap, Point } from 'mapbox-gl'
import { LngLat } from 'mapbox-gl'
import type { BBox } from 'rbush'

import type { Anchor } from '@/types/Toolip'

import type { Tooltip } from './index'
import { LabelCollision } from './LabelCollision'
import {
  type Connector,
  intersectsViewport,
  labelBox,
  labelConnector,
  type LabelSize,
  pixelAlignedBox,
} from './layout'
import { TextCache, type TextMetrics } from './TextCache'

interface LabelState {
  size?: LabelSize
  metrics?: TextMetrics
  host?: HTMLDivElement
  anchor?: Anchor
  box?: BBox
  visible: boolean
  borderRadius?: number
}
interface Placement {
  tooltip: Tooltip
  state: LabelState
  point: Point
  box: BBox
  connector: Connector | null
}

const managers = new WeakMap<MapboxMap, TooltipManager>()

/** Owns the only overlay canvas and map listeners, including for legacy DOM labels. */
export class TooltipManager {
  private readonly container: HTMLElement
  private readonly canvas: HTMLCanvasElement
  private readonly context: CanvasRenderingContext2D
  private readonly textCache: TextCache
  private readonly labels = new Map<Tooltip, LabelState>()
  private readonly collisions = new LabelCollision()
  private readonly observer?: ResizeObserver
  private readonly domOwners = new Map<Element, Tooltip>()
  private order: Tooltip[] = []
  private orderDirty = true
  private dirty = false
  private destroyed = false
  private ready: boolean
  private ratio = 0

  private readonly onMove = (): void => {
    this.dirty = true
  }
  private readonly onLoad = (): void => {
    this.ready = true
    this.dirty = false
    this.invalidate()
  }
  private readonly onResize = (): void => {
    this.invalidate()
  }
  private readonly onFonts = (): void => {
    this.refreshStyles()
  }
  private readonly onRemove = (): void => {
    this.destroy()
  }
  private readonly onRender = (): void => {
    // A style replacement does not emit another map `load` event.
    if (!this.ready && this.map.isStyleLoaded()) this.ready = true
    const ratio = this.container.ownerDocument.defaultView?.devicePixelRatio ?? 1
    if (ratio !== this.ratio) this.dirty = true
    if (this.dirty && this.ready && !this.destroyed) this.draw(ratio)
  }

  constructor(private readonly map: MapboxMap) {
    this.container = map.getCanvasContainer()
    const document = this.container.ownerDocument
    this.canvas = document.createElement('canvas')
    this.canvas.className = 'cmap-tooltip-canvas'
    this.canvas.setAttribute('aria-hidden', 'true')
    this.canvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;'
    const context = this.canvas.getContext('2d')
    if (!context) throw new Error('Tooltip requires Canvas 2D support')
    this.context = context
    this.textCache = new TextCache(this.container)
    this.container.appendChild(this.canvas)
    this.ready = map.isStyleLoaded()
    map.on('load', this.onLoad)
    map.on('move', this.onMove)
    map.on('resize', this.onResize)
    map.on('render', this.onRender)
    map.on('remove', this.onRemove)
    document.fonts.addEventListener('loadingdone', this.onFonts)
    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const tooltip = this.domOwners.get(entry.target)
          const state = tooltip && this.labels.get(tooltip)
          if (state) state.size = undefined
        }
        this.invalidate()
      })
    }
  }

  add(tooltip: Tooltip): void {
    this.labels.set(tooltip, { visible: false })
    this.orderDirty = true
    this.invalidate()
  }

  remove(tooltip: Tooltip): void {
    const state = this.labels.get(tooltip)
    if (state) this.detachDOM(state, tooltip)
    this.labels.delete(tooltip)
    this.orderDirty = true
    if (this.labels.size === 0) this.destroy()
    else this.invalidate()
  }

  update(tooltip: Tooltip, contentChanged = false, resetAnchor = false): void {
    const state = this.labels.get(tooltip)
    if (!state || this.destroyed) return
    if (resetAnchor) state.anchor = undefined
    if (contentChanged) {
      this.detachDOM(state, tooltip)
      state.size = undefined
      state.metrics = undefined
    }
    this.orderDirty = true
    this.invalidate()
  }

  invalidate(): void {
    if (this.destroyed || this.dirty) return
    this.dirty = true
    this.map.triggerRepaint()
  }

  refreshStyles(): void {
    if (this.destroyed) return
    this.textCache.clear()
    for (const state of this.labels.values()) {
      state.size = undefined
      state.metrics = undefined
    }
    this.invalidate()
  }

  isVisible(tooltip: Tooltip): boolean {
    return tooltip.options.visible && (this.labels.get(tooltip)?.visible ?? false)
  }

  private measure(tooltip: Tooltip, state: LabelState): LabelSize {
    if (state.size) return state.size
    if (tooltip.renderer === 'canvas') {
      state.metrics = this.textCache.measure(tooltip.options)
      state.size = state.metrics
      state.borderRadius = state.metrics.style.borderRadius
    } else {
      const host = this.ensureDOM(tooltip, state)
      const { display, visibility } = host.style
      host.style.display = 'block'
      host.style.visibility = 'hidden'
      state.size = { width: host.offsetWidth, height: host.offsetHeight }
      const element = tooltip.options.element!
      const view = this.container.ownerDocument.defaultView
      const radius = parseFloat(view?.getComputedStyle(element).borderTopLeftRadius ?? '')
      const childRadius = element.firstElementChild
        ? parseFloat(view?.getComputedStyle(element.firstElementChild).borderTopLeftRadius ?? '')
        : 0
      state.borderRadius = radius || childRadius || 0
      host.style.display = display
      host.style.visibility = visibility
    }
    return state.size
  }

  private project(tooltip: Tooltip): Point {
    const position = LngLat.convert(tooltip.options.position)
    const projection = this.map.getProjection().name
    if (
      this.map.getRenderWorldCopies() &&
      (projection === 'mercator' || projection === 'equirectangular')
    ) {
      const lng = position.lng + 360 * Math.round((this.map.getCenter().lng - position.lng) / 360)
      return this.map.project(new LngLat(lng, position.lat))
    }
    return this.map.project(position)
  }

  getBox(tooltip: Tooltip, anchor?: Anchor): BBox {
    const state = this.labels.get(tooltip)
    if (!state) throw new Error('Tooltip has been removed')
    const box = labelBox(
      this.project(tooltip),
      this.measure(tooltip, state),
      anchor ?? state.anchor ?? tooltip.options.anchor,
      tooltip.options.offsetX,
      tooltip.options.offsetY,
    )
    const ratio = this.container.ownerDocument.defaultView?.devicePixelRatio ?? 1
    return tooltip.renderer === 'canvas' ? pixelAlignedBox(box, ratio) : box
  }

  getConnector(tooltip: Tooltip): Connector | null {
    const box = this.getBox(tooltip)
    return labelConnector(this.project(tooltip), box, this.labels.get(tooltip)?.borderRadius)
  }

  private ensureDOM(tooltip: Tooltip, state: LabelState): HTMLDivElement {
    if (state.host) return state.host
    const host = this.container.ownerDocument.createElement('div')
    host.className = `cmap-tooltip-dom ${tooltip.options.className ?? 'mapbox-gl-tooltip'}`
    host.style.cssText = 'position:absolute;top:0;left:0;width:max-content;visibility:hidden;'
    const element = tooltip.options.element!
    host.appendChild(element)
    this.container.appendChild(host)
    this.domOwners.set(element, tooltip)
    this.observer?.observe(element)
    state.host = host
    return host
  }

  private detachDOM(state: LabelState, _tooltip: Tooltip): void {
    const element = state.host?.firstElementChild
    if (element) {
      this.observer?.unobserve(element)
      this.domOwners.delete(element)
    }
    state.host?.remove()
    state.host = undefined
  }

  private draw(ratio: number): void {
    this.dirty = false
    this.ratio = ratio
    // Mapbox's canvas container can have zero height (its canvas is absolute-positioned).
    const mapCanvas = this.map.getCanvas()
    const width = mapCanvas.clientWidth || this.container.clientWidth
    const height = mapCanvas.clientHeight || this.container.clientHeight
    const pixelWidth = Math.round(width * ratio)
    const pixelHeight = Math.round(height * ratio)
    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth
      this.canvas.height = pixelHeight
      this.canvas.style.width = `${String(width)}px`
      this.canvas.style.height = `${String(height)}px`
    }
    const context = this.context
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.clearRect(0, 0, width, height)
    if (this.orderDirty) {
      this.order = [...this.labels.keys()].sort(
        (a, b) => (b.options.priority ?? 0) - (a.options.priority ?? 0),
      )
      this.orderDirty = false
    }
    const placements: Placement[] = []
    const targets = []
    for (const tooltip of this.order) {
      const state = this.labels.get(tooltip)!
      state.visible = false
      if (state.host) state.host.style.display = 'none'
      if (!tooltip.options.visible) continue
      const point = this.project(tooltip)
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue
      targets.push({ owner: tooltip, point, radius: tooltip.options.targetRadius ?? 0 })
    }
    const avoidCollisions = targets.some(({ owner }) => owner.options.collision)
    this.collisions.reset(avoidCollisions ? targets : [])
    // Explicitly positioned labels remain visible and serve as obstacles for auto placement.
    const layoutOrder = avoidCollisions
      ? [
          ...targets.filter(({ owner }) => !owner.options.collision),
          ...targets.filter(({ owner }) => owner.options.collision),
        ]
      : targets
    for (const target of layoutOrder) {
      const { owner: tooltip, point } = target
      const state = this.labels.get(tooltip)!
      const size = this.measure(tooltip, state)
      const { anchor, offsetX, offsetY, collision } = tooltip.options
      const candidates = collision
        ? [
            ...new Set([
              state.anchor ?? anchor,
              ...(tooltip.options.anchors ?? [
                'top-left',
                'top-right',
                'bottom-left',
                'bottom-right',
              ]),
            ]),
          ]
        : [anchor]
      for (const candidate of candidates) {
        const rawBox = labelBox(point, size, candidate, offsetX, offsetY)
        const box = tooltip.renderer === 'canvas' ? pixelAlignedBox(rawBox, ratio) : rawBox
        if (!intersectsViewport(box, width, height)) continue
        const connector = tooltip.options.line
          ? labelConnector(point, box, state.borderRadius)
          : null
        if (collision && !this.collisions.accepts(target, box, connector)) continue
        state.anchor = candidate
        state.box = box
        placements.push({ tooltip, state, box, point, connector })
        if (avoidCollisions) this.collisions.add(box, connector)
        break
      }
    }
    this.textCache.retain(
      placements.flatMap(({ state }) => (state.metrics ? [state.metrics] : [])),
      ratio,
    )
    // Limit cold-cache rasterization per frame. Cached labels remain cheap to move.
    const start = performance.now()
    let generated = 0
    const visible: Placement[] = []
    for (const placement of placements) {
      const { tooltip, state } = placement
      if (tooltip.renderer === 'canvas') {
        const metrics = state.metrics!
        if (!this.textCache.get(metrics, ratio) && this.textCache.canCache(metrics, ratio)) {
          if (generated > 0 && (generated >= 64 || performance.now() - start > 4)) {
            this.invalidate()
            continue
          }
          this.textCache.create(metrics, ratio)
          generated++
        }
      }
      state.visible = true
      visible.push(placement)
    }
    context.strokeStyle = '#000'
    context.lineWidth = 1
    // Cover the half-pixel antialias seam at the boundary without drawing through the label.
    context.lineCap = 'round'
    context.beginPath()
    for (const { connector } of visible) {
      if (!connector) continue
      context.moveTo(connector.start.x, connector.start.y)
      context.lineTo(connector.end.x, connector.end.y)
    }
    context.stroke()
    for (const { tooltip, state, box } of visible) {
      if (tooltip.renderer === 'canvas') {
        this.textCache.draw(context, state.metrics!, ratio, box.minX, box.minY)
      } else {
        const host = this.ensureDOM(tooltip, state)
        host.style.display = 'block'
        host.style.visibility = 'visible'
        host.style.transform = `translate(${String(box.minX)}px, ${String(box.minY)}px)`
      }
      if (tooltip.debug) {
        context.strokeStyle = '#f00'
        context.strokeRect(box.minX, box.minY, box.maxX - box.minX, box.maxY - box.minY)
      }
    }
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.map.off('load', this.onLoad)
    this.map.off('move', this.onMove)
    this.map.off('resize', this.onResize)
    this.map.off('render', this.onRender)
    this.map.off('remove', this.onRemove)
    this.container.ownerDocument.fonts.removeEventListener('loadingdone', this.onFonts)
    this.observer?.disconnect()
    for (const tooltip of [...this.labels.keys()]) tooltip.remove()
    this.labels.clear()
    this.order = []
    this.domOwners.clear()
    this.textCache.clear()
    this.collisions.reset()
    this.canvas.remove()
    managers.delete(this.map)
  }
}

export function getTooltipManager(map: MapboxMap): TooltipManager {
  let manager = managers.get(map)
  if (!manager) {
    manager = new TooltipManager(map)
    managers.set(map, manager)
  }
  return manager
}

export function refreshTooltipStyles(map: MapboxMap): void {
  managers.get(map)?.refreshStyles()
}
