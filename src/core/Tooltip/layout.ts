import { Point } from 'mapbox-gl'
import type { BBox } from 'rbush'

import type { Anchor } from '@/types/Toolip'

export const ANCHORS: Anchor[] = [
  'center',
  'top',
  'bottom',
  'left',
  'right',
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
]

const FRACTIONS: Record<Anchor, [number, number]> = {
  center: [0.5, 0.5],
  top: [0.5, 0],
  bottom: [0.5, 1],
  left: [0, 0.5],
  right: [1, 0.5],
  'top-left': [0, 0],
  'top-right': [1, 0],
  'bottom-left': [0, 1],
  'bottom-right': [1, 1],
}

export interface LabelSize {
  width: number
  height: number
}

export function anchorOffset(anchor: Anchor, x: number, y: number): Point {
  const [fx, fy] = FRACTIONS[anchor]
  return new Point((1 - 2 * fx) * x, (1 - 2 * fy) * y)
}

export function labelBox(
  point: Point,
  size: LabelSize,
  anchor: Anchor,
  x: number,
  y: number,
): BBox {
  const [fx, fy] = FRACTIONS[anchor]
  const offset = anchorOffset(anchor, x, y)
  const minX = point.x + offset.x - size.width * fx
  const minY = point.y + offset.y - size.height * fy
  return { minX, minY, maxX: minX + size.width, maxY: minY + size.height }
}

export function intersectsViewport(box: BBox, width: number, height: number): boolean {
  return box.maxX >= 0 && box.maxY >= 0 && box.minX <= width && box.minY <= height
}

/** Use exactly the same pixel origin for layout, connectors, and cached text drawing. */
export function pixelAlignedBox(box: BBox, ratio: number): BBox {
  const x = Math.round(box.minX * ratio) / ratio - box.minX
  const y = Math.round(box.minY * ratio) / ratio - box.minY
  return { minX: box.minX + x, minY: box.minY + y, maxX: box.maxX + x, maxY: box.maxY + y }
}

export interface Connector {
  start: Point
  end: Point
}

const EPSILON = 1e-7
const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value))

/** Intersect the source-to-center ray with the facing edge, including rounded corners. */
export function labelConnector(source: Point, box: BBox, borderRadius = 0): Connector | null {
  const halfWidth = (box.maxX - box.minX) / 2
  const halfHeight = (box.maxY - box.minY) / 2
  if (halfWidth <= 0 || halfHeight <= 0) return null
  const r = clamp(borderRadius, 0, Math.min(halfWidth, halfHeight))
  const nearX = clamp(source.x, box.minX + r, box.maxX - r)
  const nearY = clamp(source.y, box.minY + r, box.maxY - r)
  // A label covering its target needs no connector through its own content.
  if (Math.hypot(source.x - nearX, source.y - nearY) <= r + EPSILON) return null
  const cx = (box.minX + box.maxX) / 2
  const cy = (box.minY + box.maxY) / 2
  const dx = source.x - cx
  const dy = source.y - cy
  const scale = Math.min(halfWidth / Math.abs(dx), halfHeight / Math.abs(dy))
  let end = new Point(cx + dx * scale, cy + dy * scale)
  if (r > 0 && Math.abs(end.x - cx) > halfWidth - r && Math.abs(end.y - cy) > halfHeight - r) {
    const cornerX = cx + Math.sign(dx) * (halfWidth - r)
    const cornerY = cy + Math.sign(dy) * (halfHeight - r)
    const qx = source.x - cornerX
    const qy = source.y - cornerY
    const a = dx * dx + dy * dy
    const b = -2 * (qx * dx + qy * dy)
    const c = qx * qx + qy * qy - r * r
    const t = (-b - Math.sqrt(Math.max(0, b * b - 4 * a * c))) / (2 * a)
    end = new Point(source.x - dx * t, source.y - dy * t)
  }
  // Protection circles are conservative collision bounds, not the visible icon outline.
  // Clipping to them creates gaps around triangular/asymmetric ship symbols.
  if (source.dist(end) <= EPSILON) return null
  return { start: source, end }
}

export function connectorBounds({ start, end }: Connector): BBox {
  return {
    minX: Math.min(start.x, end.x),
    minY: Math.min(start.y, end.y),
    maxX: Math.max(start.x, end.x),
    maxY: Math.max(start.y, end.y),
  }
}

/** Slab intersection; unlike bounding-box overlap this rejects diagonal false positives. */
export function connectorIntersectsBox({ start, end }: Connector, box: BBox): boolean {
  let enter = 0
  let exit = 1
  for (const [origin, delta, min, max] of [
    [start.x, end.x - start.x, box.minX, box.maxX],
    [start.y, end.y - start.y, box.minY, box.maxY],
  ]) {
    if (Math.abs(delta) < EPSILON) {
      if (origin < min || origin > max) return false
    } else {
      const a = (min - origin) / delta
      const b = (max - origin) / delta
      enter = Math.max(enter, Math.min(a, b))
      exit = Math.min(exit, Math.max(a, b))
      if (enter > exit + EPSILON) return false
    }
  }
  return true
}

export function connectorsIntersect(a: Connector, b: Connector): boolean {
  const dx = a.end.x - a.start.x
  const dy = a.end.y - a.start.y
  const ex = b.end.x - b.start.x
  const ey = b.end.y - b.start.y
  const qx = b.start.x - a.start.x
  const qy = b.start.y - a.start.y
  const cross = dx * ey - dy * ex
  if (Math.abs(cross) < EPSILON) {
    if (Math.abs(qx * dy - qy * dx) > EPSILON) return false
    const length2 = dx * dx + dy * dy
    if (length2 < EPSILON) return false
    const t0 = (qx * dx + qy * dy) / length2
    const t1 = t0 + (ex * dx + ey * dy) / length2
    return Math.min(1, Math.max(t0, t1)) - Math.max(0, Math.min(t0, t1)) > EPSILON
  }
  const t = (qx * ey - qy * ex) / cross
  const u = (qx * dy - qy * dx) / cross
  // Connectors may share a target, but must not cross elsewhere.
  return (
    t >= -EPSILON &&
    t <= 1 + EPSILON &&
    u >= -EPSILON &&
    u <= 1 + EPSILON &&
    !(t <= EPSILON && u <= EPSILON)
  )
}

export function circleIntersectsBox(center: Point, radius: number, box: BBox): boolean {
  return (
    Math.hypot(
      center.x - clamp(center.x, box.minX, box.maxX),
      center.y - clamp(center.y, box.minY, box.maxY),
    ) <= radius
  )
}

export function connectorIntersectsCircle(
  { start, end }: Connector,
  center: Point,
  radius: number,
): boolean {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length2 = dx * dx + dy * dy
  const t = length2
    ? clamp(((center.x - start.x) * dx + (center.y - start.y) * dy) / length2, 0, 1)
    : 0
  return Math.hypot(start.x + t * dx - center.x, start.y + t * dy - center.y) <= radius
}
