import { cloneDeep } from 'lodash-es'
import type { Map, MapMouseEvent } from 'mapbox-gl'
import { LngLat } from 'mapbox-gl'

import { EventState } from '@/core/EventState'
import { Line } from '@/modules/Plot/plugins/Line'
import type { Point } from '@/modules/Plot/plugins/Point'
import type { EventMessage } from '@/types/EventState'

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
      const layers = new Set(
        [...this.line.points, ...this.line.midPoints].map((item) => item.LAYER),
      )

      const features = this.context.map.queryRenderedFeatures(e.point, {
        layers: [...layers],
      })

      if (features.length > 0) {
        this.stop(e)
        return
      }
    }

    this.line.insertPoint(this.count, e.lngLat)
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
  protected dragStartLngLat: LngLat | null = null

  private onVertexUpdate = (e: EventMessage<Point>): void => {
    const current = e.instance
    const { index } = current.options.properties ?? {}

    if (typeof index !== 'number' || !current.center) return

    this.line.updatePoint(index, current.center)

    this.line.emit('update', this.message<Line>(e.originEvent, this.line), current)
  }

  private onMidBeforeUpdate = (e: EventMessage<Point>): void => {
    this.line.modifyMid = e.instance
    this.line.emit('midBeforeUpdate', this.message<Line>(e.originEvent, this.line), e.instance)
  }

  private onMidUpdate = (e: EventMessage<Point>): void => {
    const { index } = e.instance.options.properties ?? {}
    const { position } = cloneDeep(this.line.options)
    if (position && typeof index === 'number' && e.instance.center) {
      this.line.render()
      this.line.emit('midUpdate', this.message<Line>(e.originEvent, this.line), e.instance)
    }
  }

  private onMidDone = (e: MapMouseEvent): void => {
    if (this.line.geometry?.coordinates) {
      const lonLat = this.line.geometry.coordinates

      this.line.options.position = lonLat.map((item) => new LngLat(item[0], item[1]))
      this.line.modifyMid = null

      this.line.update({
        ...this.line.options,
      })

      this.line.edit()

      this.line.emit('midDoneUpdate', this.message<Line>(e, this.line))
    }
  }

  private onLineMousedown = (e: MapMouseEvent): void => {
    const layers = new Set([...this.line.points, ...this.line.midPoints].map((item) => item.LAYER))

    const features = this.context.map.queryRenderedFeatures(e.point, {
      layers: [...layers],
    })

    if (features.length > 0) {
      return
    }

    e.preventDefault()
    this.context.map.getCanvasContainer().style.cursor = 'move'
    this.line.dragStartLngLat = e.lngLat

    this.context.map.on('mousemove', this.onMousemove)
    this.context.map.once('mouseup', this.onMouseup)

    this.line.emit(`${Line.NAME}.beforeUpdate`, this.message<Line>(e, this.line))
  }

  private onLineMouseenter = (): void => {
    this.context.map.getCanvasContainer().style.cursor = 'pointer'
    this.context.map.on('mousedown', this.line.LAYER, this.onLineMousedown)
  }

  private onLineMouseLeave = (): void => {
    this.context.map.getCanvasContainer().style.cursor = ''
    this.context.map.off('mousedown', this.line.LAYER, this.onLineMousedown)
    this.line.drawPoint = null
  }

  private onMousemove = (e: MapMouseEvent): void => {
    this.context.map.getCanvasContainer().style.cursor = 'move'
    const current = e.lngLat
    this.line.move(current)
    this.line.dragStartLngLat = current
    this.line.emit(`${Line.NAME}.update`, this.message<Line>(e, this.line))
  }

  private onMouseup = (e: MapMouseEvent): void => {
    this.context.map.getCanvasContainer().style.cursor = ''
    this.context.map.off('mousemove', this.onMousemove)
    this.context.map.off('mousedown', this.line.LAYER, this.onLineMousedown)
    this.dragStartLngLat = null
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
      point.on('update', this.onVertexUpdate)
    })
    this.line.midPoints.forEach((mid) => {
      mid.on('beforeUpdate', this.onMidBeforeUpdate)
      mid.on('update', this.onMidUpdate)
      mid.on('doneUpdate', this.onMidDone)
    })

    this.context.eventManager.on(this.line.id, this.line.LAYER, 'mouseenter', this.onLineMouseenter)
    this.context.eventManager.on(this.line.id, this.line.LAYER, 'mouseleave', this.onLineMouseLeave)

    this.changeStatus()
  }

  public override disabled(): void {
    this.line.points.forEach((point) => {
      point.off('update', this.onVertexUpdate)
    })
    this.line.midPoints.forEach((mid) => {
      mid.off('beforeUpdate', this.onMidBeforeUpdate)
      mid.off('update', this.onMidUpdate)
      mid.off('doneUpdate', this.onMidDone)
    })

    this.context.eventManager.off(this.line.id, 'mouseenter', this.onLineMouseenter)
    this.context.eventManager.off(this.line.id, 'mouseleave', this.onLineMouseLeave)
    this.changeStatus()
  }
}

export class LineResidentEvent extends LineBaseEvent {
  private onLineMouseenter = (e: MapMouseEvent): void => {
    this.context.map.getCanvasContainer().style.cursor = 'pointer'
    this.line.setState({ hover: true })
    this.line.points.forEach((point) => {
      point.setState({ hover: true })
    })
    this.line.emit('hover', this.message<Line>(e, this.line))
  }

  private onLineMouseLeave = (e: MapMouseEvent): void => {
    this.context.map.getCanvasContainer().style.cursor = ''
    this.line.setState({ hover: false })
    this.line.points.forEach((point) => {
      point.setState({ hover: false })
    })
    this.line.emit('unhover', this.message<Line>(e, this.line))
  }

  private onClick = (e: EventMessage<Point>): void => {
    this.line.emit('click', this.message<Line>(e.originEvent, this.line))
  }

  private onLineClick = (e: MapMouseEvent): void => {
    const layers = new Set([...this.line.points, ...this.line.midPoints].map((item) => item.LAYER))

    const features = this.context.map.queryRenderedFeatures(e.point, {
      layers: [...layers],
    })

    if (features.length > 0) {
      return
    }

    this.line.emit('click', this.message<Line>(e, this.line))
  }

  constructor(map: Map, line: Line) {
    super(map, line)
  }

  public override onAdd(): void {
    // this.on()
  }

  public override onRemove(): void {
    this.disabled()
  }

  public override able(): void {
    this.line.points.forEach((point) => {
      point.on('click', this.onClick)
    })
    this.context.eventManager.on(this.line.id, this.line.LAYER, 'mouseenter', this.onLineMouseenter)
    this.context.eventManager.on(this.line.id, this.line.LAYER, 'mouseleave', this.onLineMouseLeave)
    this.context.eventManager.on(this.line.id, this.line.LAYER, 'click', this.onLineClick)
    this.changeStatus()
  }

  public override disabled(): void {
    this.line.points.forEach((point) => {
      point.off('click', this.onClick)
    })

    this.context.eventManager.off(this.line.id, 'mouseenter', this.onLineMouseenter)
    this.context.eventManager.off(this.line.id, 'mouseleave', this.onLineMouseLeave)
    this.context.eventManager.off(this.line.id, 'click', this.onLineClick)
    this.changeStatus()
  }
}
