/**
 * 基础交互对象接口
 * 任何想要使用 GlobalEventManager 的类只需拥有一个唯一 ID 即可
 */
export interface IInteractable {
  readonly id: string | number
}

// /**
//  * 事件回调函数类型
//  * @param e Mapbox 的事件对象 (包含 point, lngLat, originalEvent 等)
//  */
// export type EventHandler<E = any> = (e: E) => void

/**
 * ✅ [新增] 定义通用的事件回调类型
 * 替代原生的 Function 类型
 * 这里定义为接收一个参数（事件对象），没有返回值
 */

export type EventHandler = (e: any) => void
