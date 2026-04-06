import type { BBox } from 'rbush'

export type Id = string | number

/**
 * 碰撞检测项配置
 *
 * @template T 方向标识类型，默认为 string，可传入业务枚举（如 Anchor）以获得类型安全
 *
 * @example
 * // 通用用法
 * const item: CollisionItemOptions = {
 *   id: 'label-1',
 *   positions: { left: bbox1, right: bbox2 },
 *   priority: ['left', 'right'],
 * }
 *
 * // 与 Tooltip Anchor 结合
 * const item: CollisionItemOptions<Anchor> = {
 *   id: tooltip.id,
 *   positions: tooltip.getAllBbox(),
 *   priority: ['bottom-right', 'bottom-left', 'top-right', 'top-left'],
 * }
 */
export interface CollisionItemOptions<T extends string = string> {
  /** 唯一标识 */
  id: Id
  /** 各候选方向的 BBox（屏幕像素坐标），key 为方向标识 */
  positions: Partial<Record<T, BBox>>
  /**
   * 方向尝试优先顺序，靠前的方向优先放置
   * 不传则按 positions 的 key 顺序
   */
  priority?: T[]
}
