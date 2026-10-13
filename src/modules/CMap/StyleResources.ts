import type {
  LayerSpecification,
  Map as MapboxMap,
  SourceSpecification,
  StyleSpecification,
} from 'mapbox-gl'

import { captureSourceSnapshot, getSourceSnapshot } from '@/core/ResourceRegister/snapshot'

const BASE_SOURCE_IDS = new Set(['base', 'label'])
const BASE_LAYER_IDS = new Set(['background', 'base_layer', 'label_layer', 'base-end', 'point-end'])

/** Keep one recoverable snapshot across rapid, overlapping basemap changes. */
export class StyleResources {
  private readonly sources = new Map<string, SourceSpecification>()
  private readonly layers = new Map<string, LayerSpecification>()
  private generation = 0
  private destroyed = false
  private restoring = false
  private restoreFrame?: number
  private onStyleData?: () => void
  private onStyleLoad?: () => void

  constructor(private readonly map: MapboxMap) {
    map.once('remove', () => {
      this.destroyed = true
      this.detach()
      this.sources.clear()
      this.layers.clear()
    })
  }

  change(style: StyleSpecification): void {
    if (this.destroyed) return
    let current: StyleSpecification | undefined
    try {
      current = this.map.getStyle()
    } catch (error) {
      // Mapbox serialize() throws while the next style is being initialized.
      // A repeated change must keep the first backup instead of reading that half-built style.
      if (!this.onStyleLoad) throw error
    }
    this.detach()
    const generation = ++this.generation
    for (const [id, spec] of Object.entries(current?.sources ?? {})) {
      if (!BASE_SOURCE_IDS.has(id)) this.sources.set(id, spec)
    }
    // Includes edits already submitted with updateData and edits still queued in registers.
    for (const [id, spec] of this.sources) {
      if (spec.type === 'geojson')
        this.sources.set(id, { ...spec, data: getSourceSnapshot(this.map, id, spec.data) })
    }
    for (const layer of current?.layers ?? []) {
      if (!BASE_LAYER_IDS.has(layer.id)) {
        this.layers.delete(layer.id)
        this.layers.set(layer.id, layer)
      }
    }
    const isCurrent = (): boolean => !this.destroyed && generation === this.generation
    const restore = (): void => {
      if (!isCurrent() || this.restoring) return
      this.restoring = true
      try {
        for (const [id, spec] of this.sources) {
          if (!isCurrent()) return
          if (!this.map.getSource(id)) {
            const captured =
              spec.type === 'geojson' ? captureSourceSnapshot(this.map, id, spec.data) : undefined
            const restored = captured
              ? ({ ...spec, data: captured.data } as SourceSpecification)
              : spec
            this.map.addSource(id, restored)
            if (!isCurrent()) return
            if (this.map.getSource(id)) captured?.acknowledge()
          }
        }
        for (const layer of this.layers.values()) {
          if (!isCurrent()) return
          if (!this.map.getLayer(layer.id)) this.map.addLayer(layer)
        }
        if (!isCurrent()) return
        // An error event is not necessarily an exception. Keep failed restores recoverable.
        if (
          [...this.sources.keys()].some((id) => !this.map.getSource(id)) ||
          [...this.layers.keys()].some((id) => !this.map.getLayer(id))
        )
          return
        this.sources.clear()
        this.layers.clear()
        this.detach()
      } finally {
        this.restoring = false
      }
    }
    let settingStyle = true
    let loadObserved = false
    const ready = (): boolean => {
      if (loadObserved || this.map.isStyleLoaded()) return true
      // A diff can finish before raster tiles load, without emitting style.load.
      // isStyleLoaded() waits for those tiles; getStyle() only requires the style
      // itself to be initialized (the same prerequisite as addSource/addLayer).
      try {
        return !!this.map.getStyle()
      } catch {
        return false
      }
    }
    const scheduleRestore = (): void => {
      if (settingStyle || !isCurrent() || this.restoreFrame !== undefined) return
      // styledata can fire inside Style.update(), after layer.recalculate() but before
      // symbol placement. Adding a symbol there leaves its evaluated layout undefined
      // for the current placement pass. Mutate resources outside that render stack.
      this.restoreFrame = requestAnimationFrame(() => {
        this.restoreFrame = undefined
        // Readiness has already been observed. Raster tiles may start loading between
        // the event and this frame, making isStyleLoaded() false without invalidating
        // addSource/addLayer. Waiting again can strand the backup with no styledata left.
        if (isCurrent()) restore()
      })
    }
    this.onStyleData = (): void => {
      if (!settingStyle && isCurrent() && ready()) scheduleRestore()
    }
    this.onStyleLoad = (): void => {
      loadObserved = true
      scheduleRestore()
    }
    // Register before setStyle: identical styles / test adapters can finish synchronously.
    this.map.on('styledata', this.onStyleData)
    this.map.on('style.load', this.onStyleLoad)
    try {
      this.map.setStyle(style)
    } finally {
      settingStyle = false
    }
    // Ignore old-style events fired while setStyle removes old resources, but handle
    // synchronous completion and no-op style switches after setStyle has returned.
    if (isCurrent() && ready()) scheduleRestore()
  }

  private detach(): void {
    if (this.restoreFrame !== undefined) cancelAnimationFrame(this.restoreFrame)
    this.restoreFrame = undefined
    if (this.onStyleData) this.map.off('styledata', this.onStyleData)
    if (this.onStyleLoad) this.map.off('style.load', this.onStyleLoad)
    this.onStyleData = undefined
    this.onStyleLoad = undefined
  }
}
