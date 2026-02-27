import type { IPointOptions } from '@/types/Plot/Point.ts'

export type IconAnchor =
  | 'center'
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'

export interface IconPointStyle {
  'text-color'?: string
  'text-size'?: number
  'icon-size'?: number
  'icon-rotate'?: number
  'text-offset'?: [number, number]
  'icon-anchor'?: IconAnchor
}

export interface IIconPointOptions extends IPointOptions {
  icon: string
  style?: IconPointStyle
}

export interface CalcOffsetParams {
  iconHeight: number // 图标原始高度 (px)
  iconScale?: number // 图标缩放比例 (默认为 1)
  iconAnchor?: IconAnchor // 图标锚点 (默认为 'bottom')
  textSize?: number // 文字大小 (px, 默认为 12)
  gap?: number // 间距 (px, 默认为 5)
}
