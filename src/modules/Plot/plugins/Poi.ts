import type * as GeoJSON from 'geojson'
import type { LngLat, Map } from 'mapbox-gl'

import { Module } from '@/core/Module'
import { PLOT_SOURCE_NAME } from '@/modules/Plot/vars.ts'
import type { IPoiOptions } from '@/types/Plot/Poi.ts'

export abstract class Poi<
  T extends IPoiOptions = IPoiOptions,
  G extends GeoJSON.Geometry | null = GeoJSON.Geometry,
> extends Module {
  public options: T

  readonly SOURCE: string = PLOT_SOURCE_NAME

  readonly LAYER: string = ''

  protected constructor(map: Map, options: T) {
    super(map)

    this.options = options
  }

  public abstract override onAdd(): void

  public abstract override onRemove(): void

  public abstract get id(): T['id']

  public get isEdit(): boolean {
    const state = this.getState()
    return !!state?.edit
  }

  public abstract get center(): LngLat | undefined

  public abstract get geometry(): G | null

  public abstract getFeature(): GeoJSON.Feature<G, T['style'] & T['properties']> | null

  public abstract start(): void

  public abstract stop(): void

  public abstract edit(): void

  public abstract unedit(): void

  public abstract focus(): void

  public abstract unfocus(): void

  public abstract select(): void

  public abstract unselect(): void

  public abstract move(position: LngLat): void

  public abstract update(options: T): void

  public abstract remove(): void

  public abstract render(): void

  public setState(states: Record<string, unknown>): void {
    this.context.map.setFeatureState(
      {
        source: this.SOURCE,
        id: this.id,
      },
      states,
    )
  }

  public getState(): Record<string, unknown> | null | undefined {
    return this.context.map.getFeatureState({
      source: this.SOURCE,
      id: this.id,
    })
  }
}
