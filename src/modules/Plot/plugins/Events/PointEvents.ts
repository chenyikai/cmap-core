import type { Map, MapMouseEvent } from 'mapbox-gl'

import { EventState } from '@/core/EventState'
import type { Point } from '@/modules/Plot/plugins/Point'

export abstract class PointBaseEvent<T extends Point = Point> extends EventState {
  protected point: T

  protected constructor(map: Map, point: T) {
    super(map)

    this.point = point
  }

  public abstract override onAdd(): void

  public abstract override onRemove(): void

  public abstract override able(): void

  public abstract override disabled(): void
}

export class PointCreateEvent<T extends Point = Point> extends PointBaseEvent<T> {
  private onClick = (e: MapMouseEvent): void => {
    this.point.update({
      ...this.point.options,
      position: e.lngLat,
    })

    this.point.emit(`create`, this.message<Point>(e, this.point))

    this.disabled()
  }

  private onMousemove = (): void => {
    this.context.map.getCanvasContainer().style.cursor = 'crosshair'
  }

  constructor(map: Map, point: T) {
    super(map, point)
  }

  public override onAdd(): void {
    /* empty */
  }
  public override onRemove(): void {
    this.disabled()
  }

  public override able(): void {
    this.context.map.on('click', this.onClick)
    this.context.map.on('mousemove', this.onMousemove)
    this.changeStatus()
  }
  public override disabled(): void {
    this.context.map.getCanvasContainer().style.cursor = ''
    this.context.map.off('click', this.onClick)
    this.context.map.off('mousemove', this.onMousemove)
    this.changeStatus()
  }
}

export class PointUpdateEvent<T extends Point = Point> extends PointBaseEvent<T> {
  private onMousedown = (e: MapMouseEvent): void => {
    e.preventDefault()
    this.context.map.getCanvasContainer().style.cursor = 'move'

    this.context.map.on('mousemove', this.onMousemove)
    this.context.map.once('mouseup', this.onMouseup)

    this.point.emit(`beforeUpdate`, this.message<Point>(e, this.point))
  }

  private onMousemove = (e: MapMouseEvent): void => {
    this.context.map.getCanvasContainer().style.cursor = 'move'
    this.point.move(e.lngLat)

    this.point.emit(`update`, this.message<Point>(e, this.point))
  }

  private onMouseup = (e: MapMouseEvent): void => {
    this.context.map.getCanvasContainer().style.cursor = ''
    // this.disabled()
    this.context.map.off('mousemove', this.onMousemove)

    this.point.render()

    this.point.emit(`doneUpdate`, this.message<Point>(e, this.point))
  }

  constructor(map: Map, point: T) {
    super(map, point)
  }

  public override onAdd(): void {
    // this.on()
  }

  public override onRemove(): void {
    this.disabled()
  }

  public override able(): void {
    this.context.eventManager.on(this.point.id, this.point.LAYER, 'mousedown', this.onMousedown)
    this.changeStatus()
  }

  public override disabled(): void {
    this.context.eventManager.off(this.point.id, 'mousedown', this.onMousedown)
    this.changeStatus()
  }
}

export class PointResidentEvent<T extends Point = Point> extends PointBaseEvent<T> {
  private onMouseEnter = (e: MapMouseEvent): void => {
    this.context.map.getCanvasContainer().style.cursor = 'pointer'
    const message = this.message<Point>(e, this.point)
    this.point.setState({ hover: true })
    this.point.emit('hover', message)
  }

  private onMouseLeave = (e: MapMouseEvent): void => {
    this.context.map.getCanvasContainer().style.cursor = ''
    const message = this.message<Point>(e, this.point)
    this.point.setState({ hover: false })
    this.point.emit('unhover', message)
  }

  private onClick = (e: MapMouseEvent): void => {
    const message = this.message<Point>(e, this.point)
    this.point.emit('click', message)
  }

  private onDblclick = (e: MapMouseEvent): void => {
    e.preventDefault()
    const message = this.message<Point>(e, this.point)
    this.point.emit('dblclick', message)
  }

  constructor(map: Map, point: T) {
    super(map, point)
  }

  public override onAdd(): void {
    // this.on()
  }

  public override onRemove(): void {
    this.disabled()
  }

  public override able(): void {
    this.context.eventManager.on(this.point.id, this.point.LAYER, 'dblclick', this.onDblclick)

    this.context.eventManager.on(this.point.id, this.point.LAYER, 'mouseenter', this.onMouseEnter)

    this.context.eventManager.on(this.point.id, this.point.LAYER, 'mouseleave', this.onMouseLeave)

    this.context.eventManager.on(this.point.id, this.point.LAYER, 'click', this.onClick)
    this.changeStatus()
  }

  public override disabled(): void {
    this.context.eventManager.off(this.point.id, 'dblclick', this.onDblclick)

    this.context.eventManager.off(this.point.id, 'mouseenter', this.onMouseEnter)

    this.context.eventManager.off(this.point.id, 'mouseleave', this.onMouseLeave)

    this.context.eventManager.off(this.point.id, 'click', this.onClick)
    this.changeStatus()
  }
}
