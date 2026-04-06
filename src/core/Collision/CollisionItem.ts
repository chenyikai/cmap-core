import type { BBox } from 'rbush'

import type { CollisionItemOptions, Id } from '@/types/Collision/item.ts'

/**
 * 碰撞检测项
 *
 * 持有一组候选方向的 BBox，碰撞系统会按优先级逐一尝试，
 * 找到第一个不与已放置项冲突的方向后确定最终 dir。
 *
 * 实现了 RBush 所需的 minX/minY/maxX/maxY 接口，可直接插入空间索引树。
 *
 * @template T 方向标识类型，默认 string，与 CollisionItemOptions 保持一致
 */
class CollisionItem<T extends string = string> {
  /** 唯一标识 */
  id: Id

  /** 当前是否显示（碰撞检测后由系统写入） */
  visible = true

  /** 当前选定的放置方向 */
  dir: T

  /** 按优先顺序排列的候选方向列表 */
  readonly priority: T[]

  private readonly positions: Partial<Record<T, BBox>>

  constructor(options: CollisionItemOptions<T>) {
    this.id = options.id
    this.positions = options.positions

    // 过滤掉 positions 中不存在的 key，确保 dir 始终有对应 BBox
    const keys = Object.keys(options.positions) as T[]
    this.priority = (options.priority ?? keys).filter((k) => k in options.positions)
    this.dir = this.priority[0]
  }

  // ── RBush 空间索引所需的四个边界值 ──────────────────────────────

  get minX(): number {
    return this.positions[this.dir]?.minX ?? 0
  }

  get minY(): number {
    return this.positions[this.dir]?.minY ?? 0
  }

  get maxX(): number {
    return this.positions[this.dir]?.maxX ?? 0
  }

  get maxY(): number {
    return this.positions[this.dir]?.maxY ?? 0
  }

  // ── 公开方法 ────────────────────────────────────────────────────

  /** 获取当前方向下的 BBox */
  getBBox(): BBox {
    return this.positions[this.dir] ?? { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  }

  /** 切换当前放置方向 */
  setDir(dir: T): void {
    this.dir = dir
  }

  /** 设置是否显示 */
  setVisible(visible: boolean): void {
    this.visible = visible
  }

  /**
   * AABB 相交检测：判断当前 BBox 与给定 BBox 是否有重叠区域
   *
   * 使用分离轴定理的逆命题：任意一轴上不相交则整体不相交。
   */
  isIntersect(box: BBox): boolean {
    return !(
      box.maxX < this.minX ||
      box.minX > this.maxX ||
      box.maxY < this.minY ||
      box.minY > this.maxY
    )
  }

  /**
   * 判断当前 BBox 是否被给定 BBox 完全包含
   *
   * 即 box 的四条边均在当前 BBox 的外侧或重合。
   */
  isContainedBy(box: BBox): boolean {
    return (
      box.minX <= this.minX &&
      box.minY <= this.minY &&
      this.maxX <= box.maxX &&
      this.maxY <= box.maxY
    )
  }
}

export default CollisionItem
