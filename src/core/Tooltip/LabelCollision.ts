import type { Point } from 'mapbox-gl'
import type { BBox } from 'rbush'
import RBush from 'rbush'

import {
  circleIntersectsBox,
  type Connector,
  connectorBounds,
  connectorIntersectsBox,
  connectorIntersectsCircle,
  connectorsIntersect,
} from './layout'

export interface LabelTarget {
  owner: object
  point: Point
  radius: number
}

/** Greedy, priority-ordered placement backed by spatial indexes (not all-pairs checks). */
export class LabelCollision {
  private readonly labels = new RBush<BBox>()
  private readonly lines = new RBush<BBox & { connector: Connector }>()
  private readonly targets = new RBush<BBox & LabelTarget>()

  reset(targets: LabelTarget[] = []): void {
    this.labels.clear()
    this.lines.clear()
    this.targets.clear()
    this.targets.load(
      targets.map((target) => ({
        ...target,
        minX: target.point.x - target.radius,
        minY: target.point.y - target.radius,
        maxX: target.point.x + target.radius,
        maxY: target.point.y + target.radius,
      })),
    )
  }

  accepts(target: LabelTarget, box: BBox, connector: Connector | null): boolean {
    if (this.labels.collides(box)) return false
    if (
      this.targets
        .search(box)
        .some(
          (other) =>
            ((other.owner !== target.owner && target.point.dist(other.point) > 1e-7) ||
              other.radius > 0) &&
            circleIntersectsBox(other.point, other.radius, box),
        )
    )
      return false
    // Both directions matter: a later box must not cover an earlier connector.
    if (this.lines.search(box).some((line) => connectorIntersectsBox(line.connector, box)))
      return false
    if (!connector) return true
    const bounds = connectorBounds(connector)
    if (this.labels.search(bounds).some((label) => connectorIntersectsBox(connector, label)))
      return false
    if (this.lines.search(bounds).some((line) => connectorsIntersect(connector, line.connector)))
      return false
    return !this.targets.search(bounds).some(
      (other) =>
        other.owner !== target.owner &&
        // Coincident/overlapping source symbols cannot be avoided at the line's origin.
        target.point.dist(other.point) > target.radius + other.radius &&
        connectorIntersectsCircle(connector, other.point, other.radius),
    )
  }

  add(box: BBox, connector: Connector | null): void {
    this.labels.insert(box)
    if (connector) this.lines.insert({ ...connectorBounds(connector), connector })
  }
}
