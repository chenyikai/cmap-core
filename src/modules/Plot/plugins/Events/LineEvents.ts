import { cloneDeep, set } from 'lodash-es'
import type { Map, MapMouseEvent } from 'mapbox-gl'
import { LngLat } from 'mapbox-gl'

import { EventState } from '@/core/EventState'
import { Line } from '@/modules/Plot/plugins/Line'
import { Point } from '@/modules/Plot/plugins/Point'
import type { EventMessage } from '@/types/EventState'
import { PointType } from '@/types/Plot/Line.ts'

export abstract class LineBaseEvent extends EventState {
  protected line: Line

  protected constructor(map: Map, line: Line) {
    super(map)

    this.line = line
  }

  public abstract override onAdd(): void

  public abstract override onRemove(): void

  public abstract override able(): void

  public abstract override disabled(): void
}

export class LineCreateEvent extends LineBaseEvent {
  private count = 0

  private onClick = (e: MapMouseEvent): void => {
    // 点击过一次之后 计算结束事件
    if (this.count >= 1) {
      const features = this.context.map.queryRenderedFeatures(e.point, {
        layers: [this.line.points[0].LAYER],
      })

      if (features.length > 0) {
        this.stop(e)
        return
      }
    }

    if (!Array.isArray(this.line.options.position)) {
      this.line.options.position = []
    }

    this.line.options.position.push(e.lngLat)

    const point = new Point(this.context.map, {
      id: `${this.line.id}-node-${String(this.count)}`,
      isName: false,
      position: e.lngLat,
      style: this.line.options.vertexStyle,
      properties: {
        id: `${this.line.id}-node-${String(this.count)}`,
        index: this.count,
        type: PointType.VERTEX,
      },
    })

    point.residentEvent.disabled()
    this.line.points.push(point)

    this.line.render()
    this.count++
  }

  private onMousemove = (e: MapMouseEvent): void => {
    this.context.map.getCanvasContainer().style.cursor = 'crosshair'
    if (!this.line.options.position) return

    this.line.drawPoint = e.lngLat
    this.line.render()
  }

  private stop = (e: MapMouseEvent): void => {
    e.preventDefault()

    this.context.map.getCanvasContainer().style.cursor = ''
    this.line.drawPoint = null
    this.count = 0
    this.disabled()

    this.line.removePoint()
    this.line.createPoint()
    this.line.edit()
  }

  constructor(map: Map, line: Line) {
    super(map, line)
  }

  public override onAdd(): void {
    /* empty */
  }
  public override onRemove(): void {
    /* empty */
  }

  public override able(): void {
    this.context.map.doubleClickZoom.disable()

    this.context.map.on('click', this.onClick)
    this.context.map.on('mousemove', this.onMousemove)
    this.context.map.on('dblclick', this.stop)
    this.changeStatus()
  }
  public override disabled(): void {
    this.context.map.off('click', this.onClick)
    this.context.map.off('mousemove', this.onMousemove)
    this.context.map.off('dblclick', this.stop)

    setTimeout(() => {
      this.context.map.doubleClickZoom.enable()
    }, 0)
    this.changeStatus()
  }
}

export class LineUpdateEvent extends LineBaseEvent {
  private onVertexUpdate = (e: EventMessage<Point>): void => {
    const current = e.instance
    const { index } = current.options.properties ?? {}
    const positions = this.line.options.position

    if (!positions || typeof index !== 'number' || !current.center) return

    set(positions, index, current.center)

    // targetVertexIdx: 相邻顶点的索引
    // targetMidIdx: 需要更新的中点索引
    const updateMidpoint = (targetVertexIdx: number, targetMidIdx: number): void => {
      const targetVertex = this.line.getPoint(targetVertexIdx)
      if (targetVertex?.center) {
        const lng = (current.center!.lng + targetVertex.center.lng) / 2
        const lat = (current.center!.lat + targetVertex.center.lat) / 2
        this.line.getMidPoint(targetMidIdx)?.move(new LngLat(lng, lat))
      }
    }

    if (index < positions.length - 1) {
      updateMidpoint(index + 1, index)
    }

    if (index > 0) {
      updateMidpoint(index - 1, index - 1)
    }

    this.line.render()
  }

  private onMidBeforeUpdate = (e: EventMessage<Point>): void => {
    this.line.modifyMid = e.instance
  }

  private onMidUpdate = (e: EventMessage<Point>): void => {
    const { index } = e.instance.options.properties ?? {}
    const { position } = cloneDeep(this.line.options)
    if (position && typeof index === 'number' && e.instance.center) {
      this.line.render()
    }
  }

  private onMidDone = (): void => {
    if (this.line.geometry?.coordinates) {
      const lonLat = this.line.geometry.coordinates
      const position = lonLat.map((item) => new LngLat(item[0], item[1]))

      this.line.modifyMid = null
      this.line.update({
        ...this.line.options,
        position,
      })

      this.line.edit()
    }
  }

  private onLineMouseenter = (): void => {
    this.context.map.getCanvasContainer().style.cursor = 'pointer'
    this.context.map.once('mousedown', this.line.LAYER, (e: MapMouseEvent) => {
      e.preventDefault()
      this.context.map.getCanvasContainer().style.cursor = 'move'
      this.line.drawPoint = e.lngLat

      this.context.map.on('mousemove', this.onMousemove)
      this.context.map.once('mouseup', this.onMouseup)

      this.line.emit(`${Line.NAME}.beforeUpdate`, this.message<Line>(e, this.line))
    })
  }

  private onLineMouseLeave = (): void => {
    this.context.map.getCanvasContainer().style.cursor = ''
    this.line.drawPoint = null
  }

  private onMousemove = (e: MapMouseEvent): void => {
    this.context.map.getCanvasContainer().style.cursor = 'move'
    this.line.move(e.lngLat)

    this.line.emit(`${Line.NAME}.update`, this.message<Line>(e, this.line))
  }

  private onMouseup = (e: MapMouseEvent): void => {
    this.context.map.getCanvasContainer().style.cursor = ''
    this.context.map.off('mousemove', this.onMousemove)
    this.line.render()

    this.line.emit(`${Line.NAME}.doneUpdate`, this.message<Line>(e, this.line))
  }

  constructor(map: Map, line: Line) {
    super(map, line)
  }

  public override onAdd(): void {
    /* empty */
  }

  public override onRemove(): void {
    this.disabled()
  }

  public override able(): void {
    this.line.points.forEach((point) => {
      point.on('Point.update', this.onVertexUpdate)
    })
    this.line.midPoints.forEach((mid) => {
      mid.on('Point.beforeUpdate', this.onMidBeforeUpdate)
      mid.on('Point.update', this.onMidUpdate)
      mid.on('Point.doneUpdate', this.onMidDone)
    })

    this.context.eventManager.on(this.line.id, this.line.LAYER, 'mouseenter', this.onLineMouseenter)
    this.context.eventManager.on(this.line.id, this.line.LAYER, 'mouseleave', this.onLineMouseLeave)

    this.changeStatus()
  }

  public override disabled(): void {
    this.line.points.forEach((point) => {
      point.off('Point.update', this.onVertexUpdate)
    })
    this.line.midPoints.forEach((mid) => {
      mid.off('Point.beforeUpdate', this.onMidBeforeUpdate)
      mid.off('Point.update', this.onMidUpdate)
      mid.off('Point.doneUpdate', this.onMidDone)
    })

    this.context.eventManager.off(this.line.id, 'mouseenter', this.onLineMouseenter)
    this.context.eventManager.off(this.line.id, 'mouseleave', this.onLineMouseLeave)
    this.changeStatus()
  }
}

export class LineResidentEvent extends LineBaseEvent {
  constructor(map: Map, line: Line) {
    super(map, line)
  }

  public override onAdd(): void {
    // this.on()
  }

  public override onRemove(): void {
    throw new Error('Method not implemented.')
  }

  public override able(): void {
    this.changeStatus()
  }

  public override disabled(): void {
    this.changeStatus()
  }
}
