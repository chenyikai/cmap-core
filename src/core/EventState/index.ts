import type { Map } from 'mapbox-gl'

import { Module } from '@/core/Module'
import { EventStatus } from '@/types/EventState'

export abstract class EventState extends Module {
  private status: EventStatus = EventStatus.OFF
  static ON: EventStatus = EventStatus.ON
  static OFF: EventStatus = EventStatus.OFF

  protected constructor(map: Map) {
    super(map)
  }

  public abstract override onAdd(): void

  public abstract override onRemove(): void

  public switch(): EventStatus {
    if (this.status === EventState.ON) {
      this.status = EventState.OFF
      this.off()
    } else if (this.status === EventState.OFF) {
      this.status = EventState.ON
      this.on()
    }

    return this.status
  }

  public abstract on(): void

  public abstract off(): void
}
