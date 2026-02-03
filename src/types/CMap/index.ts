import type { LngLatLike, MapOptions, PopupOptions } from 'mapbox-gl'

export interface BeforeRemoveEvent {
  /**
   * 阻止销毁的方法
   * @param isCancel - true: 阻止销毁; false: 继续销毁
   */
  cancel: () => void
  next: () => void
}

export enum MapType {
  LAND = 'land',
  SATELLITE = 'satellite',
}

export interface formatOptions {
  value: string | number
  data: object
}

export interface InfoFormConfig {
  label: string | number

  prop: string | number

  format(formatOptions: formatOptions): string
}

export type customPopupOptions = PopupOptions & {
  center: LngLatLike

  config: InfoFormConfig[]

  data: object

  template: string
}

export interface ICMapOptions extends MapOptions {
  type?: MapType
}
