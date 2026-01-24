export enum EventStatus {
  ON = 'On',
  OFF = 'Off',
}

export interface EventItem {
  emit: () => void
  on: () => void
}
