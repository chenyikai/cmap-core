import type { MapMouseEvent } from 'mapbox-gl'

export enum EventStatus {
  ON = 'On',
  OFF = 'Off',
}

export interface EventItem {
  emit: () => void
  on: () => void
}

export interface EventMessage<T> {
  originEvent: MapMouseEvent
  instance: T
}
