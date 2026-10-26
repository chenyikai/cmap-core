import type { LngLatLike } from 'mapbox-gl'
import type { BBox } from 'rbush'

export type Anchor =
  | 'center'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'

export interface AllAnchor {
  center: BBox
  top: BBox
  bottom: BBox
  left: BBox
  right: BBox
  'top-left': BBox
  'top-right': BBox
  'bottom-left': BBox
  'bottom-right': BBox
}

export interface SimpleAnchor {
  'top-left': BBox
  'top-right': BBox
  'bottom-left': BBox
  'bottom-right': BBox
}

/** Supported Canvas text styling. Sizes and offsets are CSS pixels. */
export interface TooltipTextStyle {
  fontFamily?: string
  fontSize?: number
  fontWeight?: string | number
  lineHeight?: number
  color?: string
  backgroundColor?: string
  paddingX?: number
  paddingY?: number
  borderRadius?: number
  shadowColor?: string
  shadowBlur?: number
  shadowOffsetX?: number
  shadowOffsetY?: number
}

export interface ITooltipOptions {
  id?: string | number
  visible?: boolean
  line?: boolean
  className?: string
  position: LngLatLike
  /** Text uses the shared Canvas renderer. Supply text OR element. */
  text?: string
  /** Existing arbitrary HTML remains interactive through the DOM renderer. */
  element?: HTMLElement
  renderer?: 'canvas' | 'dom'
  theme?: 'default' | 'ship' | 'track'
  style?: TooltipTextStyle
  /** Opt-in label collision avoidance. Explicit hide() is independent of collisions. */
  collision?: boolean
  /** Collision-only protection around the target icon, in CSS pixels. Does not shorten the line. */
  targetRadius?: number
  priority?: number
  anchors?: Anchor[]
  offsetX?: number
  offsetY?: number
  anchor?: Anchor
}

export type TooltipUpdateOptions = Partial<ITooltipOptions>
