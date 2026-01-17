import type { Map } from 'mapbox-gl'

import { Module } from '@/core/Module'

export abstract class EventState extends Module {
  protected constructor(map: Map) {
    super(map)
  }

  public abstract override onAdd(): void

  public abstract override onRemove(): void
}
