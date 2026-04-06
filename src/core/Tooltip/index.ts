import { bboxPolygon, lineString } from '@turf/turf'
import type * as GeoJSON from 'geojson'
import type { LngLat, Map } from 'mapbox-gl'
import { Marker, Point } from 'mapbox-gl'
import type { BBox } from 'rbush'

import { Module } from '@/core/Module'
import type { AllAnchor, ITooltipOptions } from '@/types/Toolip'

import { LAYERS, TOOLTIP_SOURCE_NAME } from './vars.ts'

/**
 * Tooltip 组件
 *
 * 基于 Mapbox Marker 实现的地图标注，支持：
 * - 自定义 DOM 元素和锚点方向
 * - 碰撞检测所需的 BBox 计算
 * - 可选的连接线（从标注指向目标点）
 * - 地图缩放时自动重渲染
 *
 * 生命周期：show() → render() → hide()/remove()
 * - hide()：隐藏但保留实例，可再次 show()
 * - remove()：完全移除，清理事件和 Marker
 */
export class Tooltip extends Module {
  /** 设为 true 时，在地图上渲染当前 Tooltip 的 BBox 范围（调试用） */
  static DEBUG = false

  options: ITooltipOptions

  /** Mapbox Marker 实例，null 表示当前未渲染到地图上 */
  private mark: Marker | null = null

  /**
   * DOM 尺寸缓存，避免每次 zoom 都重新克隆测量
   * 在 update() 更换 element 时会自动失效
   */
  private _sizeCache: { width: number; height: number } | null = null

  /** zoom / zoomend 事件的统一处理函数，保持引用稳定以便正确解绑 */
  private zoom = (): void => {
    this.render()
  }

  constructor(map: Map, options: ITooltipOptions) {
    super(map)
    this.options = options

    if (this.visible) {
      this.context.map.on('zoom', this.zoom)
      this.context.map.on('zoomend', this.zoom)
    }
  }

  /** Tooltip 唯一标识，来自 options.id */
  get id(): string | number {
    return this.options.id
  }

  /**
   * 当前 Tooltip 是否可见
   * 需同时满足：options.visible 为 true，且 position 在地图当前视野范围内
   */
  get visible(): boolean {
    const bounds = this.context.map.getBounds()
    return !!this.options.visible && !!bounds?.contains(this.options.position)
  }

  /**
   * 当前锚点方向下的 BBox（屏幕像素坐标）
   * 默认锚点为 bottom-right
   */
  get bbox(): BBox {
    const allBbox = this.getAllBbox()
    const anchor = this.options.anchor ?? 'bottom-right'
    return allBbox[anchor]
  }

  /** 注册 GeoJSON source 和连接线图层 */
  override onAdd(): void {
    this.context.register.addSource(TOOLTIP_SOURCE_NAME, {
      type: 'geojson',
      dynamic: true,
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    })

    LAYERS.forEach((layer) => {
      this.context.register.addLayer(layer)
    })
  }

  override onRemove(): void {
    this.remove()
  }

  /** 调试模式：将当前 BBox 以多边形渲染到地图上 */
  private debug(): void {
    const { minX, minY, maxX, maxY } = this.bbox
    const { lng: minLon, lat: minLat } = this.context.map.unproject(new Point(minX, minY))
    const { lng: maxLon, lat: maxLat } = this.context.map.unproject(new Point(maxX, maxY))
    const fill = bboxPolygon([minLon, minLat, maxLon, maxLat], {
      properties: { meta: 'debug' },
      id: String(this.id) + 'debug',
    })

    this.context.register.setGeoJSONData(TOOLTIP_SOURCE_NAME, fill)
  }

  /**
   * 隐藏 Tooltip，移除 zoom 监听
   * 实例保留，可通过 show() 重新显示
   */
  hide(): void {
    this.options.visible = false
    this.render()
    this.context.map.off('zoom', this.zoom)
    this.context.map.off('zoomend', this.zoom)
  }

  /**
   * 显示 Tooltip，注册 zoom 监听
   * 先 off 再 on，防止多次调用导致监听器堆积
   */
  show(): void {
    this.options.visible = true
    this.render()
    this.context.map.off('zoom', this.zoom)
    this.context.map.off('zoomend', this.zoom)
    this.context.map.on('zoom', this.zoom)
    this.context.map.on('zoomend', this.zoom)
  }

  /**
   * 更新 Tooltip 配置并重新渲染
   * 若 element 发生变更，自动清除尺寸缓存
   */
  update(options: ITooltipOptions): void {
    if (options.element !== this.options.element) {
      this._sizeCache = null
    }
    this.options = options
    this.render()
  }

  /**
   * 切换锚点方向
   * 会销毁当前 Marker 并以新锚点重新创建
   */
  setAnchor(anchor: ITooltipOptions['anchor']): void {
    if (this.mark) {
      this.mark.remove()
      this.mark = null
    }

    this.options.anchor = anchor

    this.show()
  }

  /**
   * 计算所有锚点方向下的 BBox
   * 用于碰撞检测系统评估最佳放置位置
   */
  getAllBbox(): AllAnchor {
    return {
      center: this.getBbox('center'),
      top: this.getBbox('top'),
      bottom: this.getBbox('bottom'),
      left: this.getBbox('left'),
      right: this.getBbox('right'),
      'top-left': this.getBbox('top-left'),
      'top-right': this.getBbox('top-right'),
      'bottom-left': this.getBbox('bottom-left'),
      'bottom-right': this.getBbox('bottom-right'),
    }
  }

  /**
   * 计算指定锚点方向下的 BBox（屏幕像素坐标）
   * @param val 锚点方向，不传则使用 options.anchor
   */
  getBbox(val?: ITooltipOptions['anchor']): BBox {
    const anchor = val ?? this.options.anchor

    const point = this.context.map.project(this.options.position)
    const offset = new Point(this.options.offsetX ?? 0, this.options.offsetY ?? 0)
    const { width, height } = this.getOffDOMSize(this.options.element)

    const bbox: BBox = {
      minX: point.x,
      minY: point.y,
      maxX: point.x,
      maxY: point.y,
    }

    if (anchor === 'top-left') {
      bbox.maxY = point.y + height + Math.abs(offset.y)
      bbox.maxX = point.x + width + Math.abs(offset.x)
    } else if (anchor === 'top-right') {
      bbox.maxY = point.y + height + Math.abs(offset.y)
      bbox.minX = point.x - (width + offset.x)
    } else if (anchor === 'bottom-left') {
      bbox.minY = point.y - (height + offset.y)
      bbox.maxX = point.x + width + Math.abs(offset.x)
    } else if (anchor === 'bottom-right') {
      bbox.minY = point.y - (height + offset.y)
      bbox.minX = point.x - (width + offset.x)
    }

    return bbox
  }

  /**
   * 获取 DOM 元素的渲染尺寸
   *
   * 因为元素可能尚未挂载或处于隐藏状态，通过克隆节点并临时插入地图容器的方式强制触发布局计算。
   * 结果会缓存到 _sizeCache，直到 element 变更时才重新测量。
   *
   * 注意：不能用 display:none 隐藏，否则 offsetWidth/offsetHeight 均为 0。
   */
  private getOffDOMSize(label: HTMLElement): { width: number; height: number } {
    if (this._sizeCache) return this._sizeCache

    const element = label.cloneNode(true) as HTMLElement

    element.style.position = 'absolute'
    element.style.visibility = 'hidden'
    element.style.top = '-9999px'
    element.style.left = '-9999px'
    element.style.display = 'block'

    this.context.map.getCanvasContainer().appendChild(element)

    const width = element.offsetWidth
    const height = element.offsetHeight

    this.context.map.getCanvasContainer().removeChild(element)

    this._sizeCache = { width, height }
    return this._sizeCache
  }

  /**
   * 完全移除 Tooltip
   * 解绑 zoom 事件、销毁 Marker、清空连接线
   */
  remove(): void {
    this.options.visible = false
    this.context.map.off('zoom', this.zoom)
    this.context.map.off('zoomend', this.zoom)

    if (this.mark) {
      this.mark.remove()
      this.mark = null
    }

    this.connectLine()
  }

  /** 根据当前 options 创建 Mapbox Marker 实例（不挂载到地图） */
  _create(): void {
    this.mark = new Marker({
      className: this.options.className ?? 'mapbox-gl-tooltip',
      element: this.options.element,
      offset: this._getOffsetByAnchor(),
      anchor: this.options.anchor,
    }).setLngLat(this.options.position)
  }

  /**
   * 根据锚点方向计算 Marker 的像素偏移量
   *
   * Mapbox Marker 的 offset 是相对于锚点的偏移，不同方向需要对 offsetX/Y 取反，
   * 以保证视觉上标注始终朝正确方向偏移。
   */
  _getOffsetByAnchor(): Point {
    const offset = new Point(0, 0)
    if (this.options.anchor === 'center') {
      offset.x = 0
      offset.y = 0
    } else if (this.options.anchor === 'top') {
      offset.x = 0
      offset.y = this.options.offsetY ?? 0
    } else if (this.options.anchor === 'bottom') {
      offset.x = 0
      offset.y = -(this.options.offsetY ?? 0)
    } else if (this.options.anchor === 'left') {
      offset.x = this.options.offsetX ?? 0
      offset.y = 0
    } else if (this.options.anchor === 'right') {
      offset.x = -(this.options.offsetX ?? 0)
      offset.y = 0
    } else if (this.options.anchor === 'top-left') {
      offset.x = this.options.offsetX ?? 0
      offset.y = this.options.offsetY ?? 0
    } else if (this.options.anchor === 'top-right') {
      offset.x = -(this.options.offsetX ?? 0)
      offset.y = this.options.offsetY ?? 0
    } else if (this.options.anchor === 'bottom-left') {
      offset.x = this.options.offsetX ?? 0
      offset.y = -(this.options.offsetY ?? 0)
    } else if (this.options.anchor === 'bottom-right') {
      offset.x = -(this.options.offsetX ?? 0)
      offset.y = -(this.options.offsetY ?? 0)
    }

    return offset
  }

  /**
   * 更新 Tooltip 的地理坐标
   * 若 Marker 已存在则同步更新其位置，无需重建
   */
  setLngLat(lngLat: LngLat): this {
    this.options.position = lngLat

    if (this.mark) {
      this.mark.setLngLat(lngLat)
    }

    return this
  }

  /**
   * 渲染从 Tooltip 到目标点的连接线
   *
   * - 若 options.line 未开启则跳过
   * - 若不可见或连接点不存在，写入 geometry: null 清空线段（避免残留）
   * - 否则以 [position, connectPoint] 绘制 LineString
   */
  connectLine(): void {
    if (!this.options.line) return

    const id = `${String(this.options.id)}-tooltip-connect-line`

    const endPoint = this.connectPoint()
    if (!endPoint || !this.visible) {
      const emptyFeature: GeoJSON.Feature<null> = {
        type: 'Feature',
        geometry: null,
        id,
        properties: {},
      }

      this.context.register.setGeoJSONData(TOOLTIP_SOURCE_NAME, emptyFeature)
      return
    }

    const lonLat = [this.options.position.toArray(), endPoint.toArray()]

    const feature: GeoJSON.Feature<GeoJSON.LineString> = lineString(
      lonLat,
      {},
      {
        id,
      },
    )

    this.context.register.setGeoJSONData(TOOLTIP_SOURCE_NAME, feature)
  }

  /**
   * 计算连接线的终点（Tooltip 元素底部中心的地理坐标）
   *
   * 以 Marker 位置为基础，加上偏移量和元素宽度的一半，
   * 最终 unproject 回地理坐标。
   * 若 Marker 不存在或不可见则返回 null。
   */
  connectPoint(): LngLat | null {
    if (!this.mark || !this.visible) return null

    const point = this.context.map.project(this.mark.getLngLat())
    const offset = this.mark.getOffset()

    point.x += offset.x
    point.y += offset.y

    const { width } = this.getOffDOMSize(this.options.element)

    if (this.options.anchor === 'top-left') {
      point.x += width / 2
    } else if (this.options.anchor === 'top-right') {
      point.x -= width / 2
    } else if (this.options.anchor === 'bottom-left') {
      point.x += width / 2
    } else if (this.options.anchor === 'bottom-right') {
      point.x -= width / 2
    }

    return this.context.map.unproject(point)
  }

  /**
   * 渲染 Tooltip
   * - visible 为 true：创建或复用 Marker，挂载到地图，更新连接线
   * - visible 为 false：移除 Marker，清空连接线
   */
  render(): this {
    if (this.visible) {
      if (!this.mark) {
        this._create()
      }

      this.mark?.addTo(this.context.map)

      if (Tooltip.DEBUG) {
        this.debug()
      }
    } else {
      this.mark?.remove()
      this.mark = null
    }

    this.connectLine()
    return this
  }
}
