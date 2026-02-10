import type { Map } from 'mapbox-gl'
import RBush from 'rbush'

import type { CollisionOptions } from '@/types/Collision'
import type { CollisionItemOptions } from '@/types/Collision/item.ts'

import CollisionItem from './CollisionItem.ts'

class Collision {
  _tree = new RBush<CollisionItem>()

  _map: Map

  _collisionList: CollisionItem[] = []

  constructor(map: Map, config?: CollisionOptions) {
    this._map = map
    if (Array.isArray(config?.collisions) && config.collisions.length > 0) {
      this.load(config.collisions)
    }
  }

  load(collisions: CollisionItemOptions[]): CollisionItem[] {
    this._tree.clear()

    this._collisionList = collisions.map((item) => new CollisionItem(item))

    return this.collides()
  }

  getItem(id: string | number): CollisionItem | undefined {
    return this._collisionList.find((item) => item.id === id)
  }

  clear(): void {
    this._tree.clear()
  }

  getCollisions(): CollisionItem[] {
    return this._collisionList
  }

  collides(): CollisionItem[] {
    // const { width, height } = this._map.getCanvas()
    // const viewportBBox: BBox = {
    //   minX: 0,
    //   minY: 0,
    //   maxX: width,
    //   maxY: height,
    // }

    for (const item of this._collisionList) {
      for (const dir of item.dirs) {
        item.setDir(dir)

        const isCollides = this._tree.collides(item)
        item.setVisible(!isCollides)

        if (item.visible) {
          this._tree.insert(item)
          break
        }
      }
    }

    return this.getCollisions()
  }
}

export default Collision
