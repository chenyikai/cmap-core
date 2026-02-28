import type { Map, MapMouseEvent } from 'mapbox-gl'

import { Module } from '@/core/Module'
import type { EventMessage } from '@/types/EventState'
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
      this.disabled()
    } else if (this.status === EventState.OFF) {
      this.status = EventState.ON
      this.able()
    }

    return this.status
  }

  public changeStatus(): void {
    if (this.status === EventState.ON) {
      this.status = EventStatus.OFF
    } else if (this.status === EventStatus.OFF) {
      this.status = EventStatus.ON
    }
  }

  public message<T>(e: MapMouseEvent, instance: T): EventMessage<T> {
    return {
      originEvent: e,
      instance,
    }
  }

  public abstract able(): void

  public abstract disabled(): void
}
