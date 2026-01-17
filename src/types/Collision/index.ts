import type { BBox } from 'rbush'

import type { CollisionItemOptions } from './item.ts'

export interface CollisionOptions {
  collisions?: CollisionItemOptions[]
}
export interface collisionItem {
  bbox: BBox
}
