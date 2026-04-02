import { along, bbox, length, lineString } from '@turf/turf'
import type * as GeoJSON from 'geojson'
import type { Feature, LineString } from 'geojson'
import type { Map } from 'mapbox-gl'
import { LngLat } from 'mapbox-gl'

import {
  LineCreateEvent,
  LineResidentEvent,
  LineUpdateEvent,
} from '@/modules/Plot/plugins/Events/LineEvents.ts'
import { Poi } from '@/modules/Plot/plugins/Poi.ts'
import { Point } from '@/modules/Plot/plugins/Point'
import { EMPTY_SOURCE, Meta, PLOT_SOURCE_NAME } from '@/modules/Plot/vars.ts'
import type { ILineOptions } from '@/types/Plot/Line.ts'
import { PointType } from '@/types/Plot/Line.ts'
import type { PlotType } from '@/types/Plot/Poi.ts'
import type { PointInstance, PointStyle } from '@/types/Plot/Point.ts'

import { DEFAULT_LINE_COLOR, LAYER_LIST, LINE_LAYER_NAME, NAME } from './vars.ts'

export class Line<T extends ILineOptions = ILineOptions> extends Poi<T, GeoJSON.LineString | null> {
  static NAME: PlotType = NAME
  override readonly LAYER: string = LINE_LAYER_NAME

  public points: PointInstance[] = []
  public midPoints: Point[] = []
  public titles: GeoJSON.Feature<GeoJSON.LineString | null>[] = []

  public residentEvent: LineResidentEvent
  public updateEvent: LineUpdateEvent
  public createEvent: LineCreateEvent

  constructor(map: Map, options: T) {
    super(map, options)

    this.residentEvent = new LineResidentEvent(map, this)
    this.updateEvent = new LineUpdateEvent(map, this)
    this.createEvent = new LineCreateEvent(map, this)
    this.createPoint()

    this.residentEvent.enabled()
  }

  public override get id(): string {
    return this.options.id
  }

  public override get center(): LngLat | null {
    if (!Array.isArray(this.options.position) || this.options.position.length === 0) {
      return null
    }

    const feature = this.getFeature() as GeoJSON.Feature<GeoJSON.LineString>
    const distance = length(feature)
    const coordinates = along(feature, distance / 2).geometry.coordinates

    return new LngLat(coordinates[0], coordinates[1])
  }

  public override get geometry(): GeoJSON.LineString | null {
    return this.getFeature().geometry
  }

  public override onAdd(): void {
    this.context.register.addSource(PLOT_SOURCE_NAME, EMPTY_SOURCE)

    LAYER_LIST.forEach((layer) => {
      this.context.register.addLayer(layer)
    })
  }
  public override onRemove(): void {
    this.remove()
  }

  public override getFeature(): GeoJSON.Feature<GeoJSON.LineString | null> {
    if (
      (!this.options.position || this.options.position.length < 2) &&
      !this.createEvent.getDrawLngLat()
    ) {
      return {
        type: 'Feature',
        geometry: null,
        id: this.id,
        properties: {},
      }
    }

    const coordinates = this.points.map((point) => {
      if (point.center) {
        return point.center.toArray()
      } else {
        return []
      }
    })

    const modify = this.updateEvent.getModifyLngLat()

    if (modify) {
      const { index } = modify.options.properties ?? {}
      if (typeof index === 'number' && modify.center) {
        coordinates.splice(index + 1, 0, modify.center.toArray())
      }
    }

    if (this.createEvent.getDrawLngLat()) {
      coordinates.push(this.createEvent.getDrawLngLat()!.toArray())
    }

    return lineString(
      coordinates,
      {
        ...this.options.properties,
        ...this.options.style,
        visibility: this.options.visibility,
        isName: this.options.isName,
        text: this.options.name,
        id: this.options.id,
      },
      {
        id: this.id,
      },
    )
  }
  public override start(): void {
    if (this.center === null) {
      this.createEvent.enabled()
      this.updateEvent.disabled()
      this.residentEvent.disabled()
      this.setState({ create: true })
    }
  }
  public override stop(): void {
    this.createEvent.disabled()
    this.residentEvent.enabled()
    this.setState({ create: false })
  }

  public override show(): void {
    this.points.forEach((point) => {
      point.show()
    })
    this.midPoints.forEach((mid) => {
      mid.show()
    })

    super.show()
  }

  public override hide(): void {
    this.points.forEach((point) => {
      point.hide()
    })
    this.midPoints.forEach((mid) => {
      mid.hide()
    })

    super.hide()
  }

  public override edit(): void {
    this.setState({ edit: true })

    this.points.forEach((point) => {
      point.edit()
    })

    this.midPoints.forEach((midPoint) => {
      midPoint.edit()
      midPoint.show()
    })

    this.residentEvent.disabled()
    this.updateEvent.enabled()

    this.render()
  }

  public override unedit(): void {
    this.setState({ edit: false })
    this.points.forEach((point) => {
      point.unedit()
    })
    this.midPoints.forEach((midPoint) => {
      midPoint.unedit()
      midPoint.hide()
    })

    this.residentEvent.enabled()
    this.updateEvent.disabled()

    this.render()
  }

  public override focus(): void {
    this.setState({ focus: true })
    this.render()
  }
  public override unfocus(): void {
    this.setState({ focus: false })
    this.render()
  }
  public override select(): void {
    const bounds = bbox(this.getFeature() as GeoJSON.Feature) as [number, number, number, number]
    this.context.map.fitBounds(bounds, {
      padding: {
        left: 60,
        right: 60,
        top: 60,
        bottom: 60,
      },
    })

    this.context.map.once('moveend', () => {
      this.focus()
    })
  }
  public override unselect(): void {
    this.unfocus()
  }
  public override move(position: LngLat): void {
    // 如果不借助鼠标拖拽 直接移动以中心为基准点
    const drag: LngLat | null = this.center ?? this.updateEvent.getDragLngLat()

    if (!drag) return

    const lngDiff = position.lng - drag.lng
    const latDiff = position.lat - drag.lat
    this.points.forEach((point, index) => {
      if (point.center) {
        const newPos = new LngLat(point.center.lng + lngDiff, point.center.lat + latDiff)

        this.updatePoint(index, newPos, false)
      }
    })

    this.render()
  }
  public override update(options: T): void {
    this.options = options
    this.removePoint()
    this.createPoint()

    this.render()
  }
  public override remove(): void {
    this.removePoint()
    // this.removeTitles()
    this.residentEvent.disabled()
    this.createEvent.disabled()
    this.updateEvent.disabled()
    this.removeAllListeners()

    this.options.position = []
    this.render()
  }
  public override render(): void {
    this.points.map((point) => {
      point.render()
    })

    if (this.isEdit) {
      this.midPoints.map((minPoint) => {
        minPoint.render()
      })
    }

    if (this.isFocus) {
      this.context.focus.set(this.getFeature() as GeoJSON.Feature, {
        armLength: 40,
        padding: 30,
      })
    } else {
      this.context.focus.remove(this.id)
    }

    // if (Array.isArray(this.options.position) && this.options.position.length > 1) {
    //   this.createTitles()
    // } else {
    //   this.removeTitles()
    // }

    this.context.register.setGeoJSONData(PLOT_SOURCE_NAME, [
      this.getFeature(),
      // ...this.titles,
    ] as GeoJSON.Feature[])
  }

  public getMidPoint(index: number): Point | null {
    const data = this.midPoints.at(index)
    if (!data) return null

    return Number(data.options.properties?.index) === index ? data : null
  }

  public getPoint(index: number): PointInstance | null {
    const point = this.points.at(index)
    if (!point) return null

    return Number(point.options.properties?.index) === index ? point : null
  }

  public createVertex(id: string, index: number, position: LngLat): PointInstance {
    const style: PointStyle = {
      'circle-radius': 5,
      'circle-stroke-color': this.options.style?.['line-color'] ?? DEFAULT_LINE_COLOR,
      ...this.options.vertexStyle,
    }

    return new Point(this.context.map, {
      // id: `${this.id}-node-${String(index)}`, // 建议 ID 加上 node 标识
      id, // 建议 ID 加上 node 标识
      isName: false,
      visibility: 'visible',
      position,
      style,
      properties: {
        id: `${this.id}-node-${String(index)}`,
        index,
        type: PointType.VERTEX, // 标记类型，方便点击事件区分
      },
    })
  }

  public createMid(id: string, index: number, position: LngLat): Point {
    const style = {
      'circle-radius': 2,
      'circle-color': this.options.style?.['line-color'] ?? DEFAULT_LINE_COLOR,
      'circle-stroke-color': this.options.style?.['line-color'] ?? DEFAULT_LINE_COLOR,
      ...this.options.midStyle,
    }

    return new Point(this.context.map, {
      id, // 建议 ID 加上 mid 标识
      isName: false,
      visibility: 'visible',
      position,
      style,
      properties: {
        id: `${this.id}-mid-${String(index)}`, // 建议 ID 加上 mid 标识
        index, // 这里的 index 代表它是第几段线上的中点
        type: PointType.MIDPOINT,
      },
    })
  }

  public createTitles(): Feature<LineString>[] {
    if (!Array.isArray(this.points) || this.points.length === 0) return []

    const length = this.points.length
    this.titles = this.points.flatMap((current, index) => {
      if (index === length - 1) return []
      if (!current.center) return []

      const next = this.points[index + 1]
      if (!next.center) return []

      const id = `line-title-${this.id}-${String(index)}`
      return lineString(
        [current.center.toArray(), next.center.toArray()],
        {
          meta: Meta.LINE_TITLE,
          visibility: this.options.visibility,
          isName: true,
          text: this.options.name,
          'text-size': this.options.style?.['text-size'],
          originId: this.id,
          id,
        },
        {
          id,
        },
      )
    })

    return this.titles as GeoJSON.Feature<GeoJSON.LineString>[]
  }

  public removeTitles(): GeoJSON.Feature<null>[] {
    this.titles = this.titles.map((item) => {
      return {
        ...item,
        geometry: null,
      }
    })

    return this.titles as GeoJSON.Feature<null>[]
  }

  public createPoint(): void {
    this.removePoint()

    const positions = this.options.position ?? []

    positions.forEach((current, i) => {
      this.points.push(this.createVertex(`${this.id}-node-${String(i)}`, i, current))
    })

    this.syncMidPoints()
  }

  /**
   * 插入一个新节点 (例如: 将中点转为实点时调用)
   * @param index 要插入的位置索引
   * @param position 新节点的坐标
   */
  public insertPoint(index: number, position: LngLat): PointInstance {
    // 1. 同步原始数据
    this.options.position ??= []
    this.options.position.splice(index, 0, position)

    // 2. 创建新点实例并插入数组
    const newPoint = this.createVertex(`${this.id}-node-${String(index)}`, index, position)
    this.points.splice(index, 0, newPoint)

    // 如果处于编辑状态，让新点立刻表现为编辑态
    if (this.isEdit) {
      newPoint.edit()
    }

    // 3. 重新修正索引并全量同步中点
    this.reindexPoints()
    this.syncMidPoints()
    this.render()

    return newPoint
  }

  /**
   * 更新某个实点的位置 (例如: 拖拽某个节点)
   * @param index 节点索引
   * @param position 拖拽后的新坐标
   * @param isRender 是否立即渲染
   */
  public updatePoint(index: number, position: LngLat, isRender = true): void {
    const point = this.getPoint(index)
    if (!point) return

    // 1. 同步原始数据
    if (this.options.position?.[index]) {
      this.options.position[index] = position
    }

    // 2. 移动实体点
    point.move(position)

    // 3. 局部更新左右两个相邻的中点(提升性能，不用全量重绘)
    this.updateAdjacentMidPoints(index)

    // 4. 重绘线段 (触发 getFeature 变更)
    if (isRender) {
      this.render()
    }
  }

  /** 更新指定中点的坐标 (例如：拖拽中点时触发，但在松手前它还是个中点) */
  public updateMidPoint(index: number, position: LngLat): void {
    const midPoint = this.getMidPoint(index)
    if (!midPoint) return

    midPoint.move(position)
  }

  public removePointAt(index: number): void {
    const point = this.points.at(index)
    if (!point) return

    // 1. 从地图上移除
    point.remove()

    // 2. 从数组中移除
    this.points.splice(index, 1)

    // 3. 更新索引并重绘中点
    this._reindexPoints()
    this._syncMidPoints()
  }

  /** 清空所有点 (替代原有的 removePoint) */
  public clearAll(): void {
    this.points.forEach((point) => {
      point.remove()
    })
    this.midPoints.forEach((mid) => {
      mid.remove()
    })
    this.points = []
    this.midPoints = []
  }

  public removePoint(): void {
    this.points.forEach((point) => {
      point.remove()
    })
    this.points = []
    this.midPoints.forEach((mid) => {
      mid.remove()
    })
    this.midPoints = []
  }

  /**
   * 内部机制：全量重新生成所有的中点
   */
  protected syncMidPoints(): void {
    // 1. 清空旧的中点
    this.midPoints.forEach((mid) => {
      mid.remove()
    })
    this.midPoints = []

    // 2. 根据现有的实点重新构建
    for (let i = 0; i < this.points.length - 1; i++) {
      const current = this.points[i].center
      const next = this.points[i + 1].center

      if (current && next) {
        const midPos = this.calcMidPosition(current, next)
        const midPoint = this.createMid(`${this.id}-mid-${String(i)}`, i, midPos)

        // 如果线段正在编辑态，新生成的中点也应表现为编辑态
        if (this.isEdit) midPoint.edit()

        this.midPoints.push(midPoint)
      }
    }
  }

  /**
   * 内部机制：修补数组增减后的索引及属性ID
   */
  protected reindexPoints(): void {
    this.points.forEach((point, i) => {
      const newId = `${this.id}-node-${String(i)}`

      if (point.options.properties) {
        point.options.properties.index = i

        point.options.properties.id = newId
      }

      // 注意：根据你的底层实现，可能也需要强行覆盖外部的 id
      point.options.id = newId
    })
  }

  /**
   * 内部机制：只更新指定节点相邻的两个中点 (用于优化拖拽时的渲染性能)
   */
  protected updateAdjacentMidPoints(index: number): void {
    // 更新左侧中点 (index - 1)
    if (index > 0 && this.points[index - 1]) {
      const p1 = this.points[index - 1].center
      const p2 = this.points[index].center
      if (p1 && p2) {
        this.updateMidPoint(index - 1, this.calcMidPosition(p1, p2))
      }
    }
    // 更新右侧中点 (index)
    if (index < this.points.length - 1 && this.points[index + 1]) {
      const p1 = this.points[index].center
      const p2 = this.points[index + 1].center
      if (p1 && p2) {
        this.updateMidPoint(index, this.calcMidPosition(p1, p2))
      }
    }
  }

  /**
   * 内部计算：获取两点之间的中点坐标
   */
  protected calcMidPosition(p1: LngLat, p2: LngLat): LngLat {
    const midLng = (p1.lng + p2.lng) / 2
    const midLat = (p1.lat + p2.lat) / 2
    return new LngLat(midLng, midLat)
  }

  /** 内部：当数组发生增删时，修复 properties 中的 index 和 id */
  private _reindexPoints(): void {
    this.points.forEach((point, i) => {
      const newId = `${this.id}-node-${String(i)}`
      // 这里根据你的底层 Point 类 API 进行调整，通常需要更新配置
      if (point.options.properties) {
        point.options.properties.index = i
        point.options.properties.id = newId
      }
      point.options.id = newId
    })
  }

  /** 内部：重新计算并全量同步所有中点 */
  private _syncMidPoints(): void {
    // 1. 先清除旧的中点
    this.midPoints.forEach((mid) => {
      mid.remove()
    })
    this.midPoints = []

    // 2. 根据当前的顶点重新生成
    for (let i = 0; i < this.points.length - 1; i++) {
      const currentPos = this.points[i].options.position!
      const nextPos = this.points[i + 1].options.position!

      const midPos = this.calcMidPosition(currentPos, nextPos)
      this.midPoints.push(this.createMid(`${this.id}-mid-${String(i)}`, i, midPos))
    }
  }
}
