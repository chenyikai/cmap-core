import type { Map } from 'mapbox-gl'
import { LngLat, type LngLatLike, type Point } from 'mapbox-gl'
import type { BBox } from 'rbush'

import { Module } from '@/core/Module'
import type { AllAnchor, Anchor, ITooltipOptions, TooltipUpdateOptions } from '@/types/Toolip'

import { anchorOffset, ANCHORS } from './layout'
import { getTooltipManager, refreshTooltipStyles, type TooltipManager } from './TooltipManager'

type ResolvedOptions = ITooltipOptions & {
  id: string | number
  position: LngLat
  visible: boolean
  anchor: Anchor
  offsetX: number
  offsetY: number
}

let sequence = 0

function normalize(options: ITooltipOptions): ResolvedOptions {
  const hasText = typeof options.text === 'string'
  const hasElement = options.element !== undefined
  if (hasText === hasElement) throw new Error('Tooltip requires exactly one of text or element')
  if ((options.renderer === 'canvas' && !hasText) || (options.renderer === 'dom' && !hasElement)) {
    throw new Error('Canvas Tooltip requires text; DOM Tooltip requires element')
  }
  const anchor = options.anchor ?? 'bottom-right'
  if (!ANCHORS.includes(anchor) || options.anchors?.some((value) => !ANCHORS.includes(value))) {
    throw new Error('Invalid Tooltip anchor')
  }
  for (const value of [options.offsetX, options.offsetY, options.priority]) {
    if (value !== undefined && !Number.isFinite(value))
      throw new Error('Invalid Tooltip offset or priority')
  }
  if (
    options.targetRadius !== undefined &&
    (!Number.isFinite(options.targetRadius) || options.targetRadius < 0)
  ) {
    throw new Error('Invalid Tooltip targetRadius')
  }
  for (const [key, value] of Object.entries(options.style ?? {})) {
    if (
      typeof value === 'number' &&
      (!Number.isFinite(value) || (value < 0 && key !== 'shadowOffsetX' && key !== 'shadowOffsetY'))
    ) {
      throw new Error('Invalid Tooltip style: ' + key)
    }
  }
  return {
    ...options,
    id: options.id ?? 'cmap-tooltip-' + String(++sequence),
    position: LngLat.convert(options.position),
    anchor,
    offsetX: options.offsetX ?? 0,
    offsetY: options.offsetY ?? 0,
    visible: options.visible ?? true,
  }
}

/** A lightweight label handle. Construction and updates automatically schedule display. */
export class Tooltip extends Module {
  static DEBUG = false
  options: ResolvedOptions
  private readonly map: Map
  private readonly manager: TooltipManager
  private removed = false

  constructor(map: Map, options: ITooltipOptions) {
    // No per-label map listeners or eager GeoJSON/Context initialization.
    super(map, false)
    this.map = map
    this.options = normalize(options)
    this.manager = getTooltipManager(map)
    this.manager.add(this)
  }

  get id(): string | number {
    return this.options.id
  }
  get renderer(): 'canvas' | 'dom' {
    return this.options.text !== undefined ? 'canvas' : 'dom'
  }
  get debug(): boolean {
    return Tooltip.DEBUG
  }
  /** Actual visibility after the last layout, independent of the requested options.visible. */
  get visible(): boolean {
    return !this.removed && this.manager.isVisible(this)
  }
  get bbox(): BBox {
    return this.manager.getBox(this)
  }

  override onAdd(): void {
    /* Shared resources are initialized after options are available. */
  }
  override onRemove(): void {
    this.remove()
  }
  override mount(): void {
    this.render()
  }

  static refreshStyles(map: Map): void {
    refreshTooltipStyles(map)
  }

  show(): void {
    if (this.removed) return
    this.options.visible = true
    this.render()
  }

  hide(): void {
    if (this.removed) return
    this.options.visible = false
    this.render()
  }

  update(options: TooltipUpdateOptions): void {
    if (this.removed) return
    if (options.id !== undefined && options.id !== this.id)
      throw new Error('Tooltip id cannot be changed')
    const contentChanged = ['text', 'element', 'renderer', 'theme', 'style', 'className'].some(
      (key) => key in options,
    )
    const next = { ...this.options, ...options, id: this.id }
    if ('text' in options && options.text !== undefined) {
      next.element = undefined
      next.renderer = 'canvas'
    } else if ('element' in options && options.element !== undefined) {
      next.text = undefined
      next.renderer = 'dom'
    }
    if (options.style) next.style = { ...this.options.style, ...options.style }
    this.options = normalize(next)
    this.manager.update(this, contentChanged, 'anchor' in options || 'anchors' in options)
  }

  setAnchor(anchor: ITooltipOptions['anchor']): void {
    // Preserve the existing API: selecting an anchor also requests visibility.
    this.update({ anchor, visible: true })
  }

  setLngLat(position: LngLatLike): this {
    this.update({ position })
    return this
  }

  getAllBbox(): AllAnchor {
    return Object.fromEntries(
      ANCHORS.map((anchor) => [anchor, this.getBbox(anchor)]),
    ) as unknown as AllAnchor
  }

  getBbox(anchor?: Anchor): BBox {
    return this.manager.getBox(this, anchor)
  }

  /** Compatibility methods; drawing is now batched at map level. */
  _create(): void {
    this.render()
  }
  _getOffsetByAnchor(): Point {
    return anchorOffset(this.options.anchor, this.options.offsetX, this.options.offsetY)
  }
  connectLine(): void {
    this.render()
  }
  connectPoint(): LngLat | null {
    if (!this.visible) return null
    const connector = this.manager.getConnector(this)
    return connector ? this.map.unproject(connector.end) : null
  }

  render(): this {
    if (!this.removed) this.manager.invalidate()
    return this
  }

  remove(): void {
    if (this.removed) return
    this.removed = true
    this.options.visible = false
    this.manager.remove(this)
    this.removeAllListeners()
  }
}
