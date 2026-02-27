import type { Map, MapMouseEvent } from 'mapbox-gl'

import { EventState } from '@/core/EventState'
import { Point } from '@/modules/Plot/plugins/Point'

export abstract class PointBaseEvent extends EventState {
  protected point: Point

  protected constructor(map: Map, point: Point) {
    super(map)

    this.point = point
  }

  public abstract override onAdd(): void

  public abstract override onRemove(): void

  public abstract override able(): void

  public abstract override disabled(): void
}

export class PointCreateEvent extends PointBaseEvent {
  private onClick = (e: MapMouseEvent): void => {
    this.point.update({
      ...this.point.options,
      position: e.lngLat,
    })

    this.point.emit(`${Point.NAME}.create`, this.message<Point>(e, this.point))

    this.disabled()
  }

  private onMousemove = (): void => {
    this.context.map.getCanvasContainer().style.cursor = 'crosshair'
  }

  constructor(map: Map, point: Point) {
    super(map, point)
  }

  public override onAdd(): void {
    /* empty */
  }
  public override onRemove(): void {
    /* empty */
  }

  public override able(): void {
    this.context.map.on('click', this.onClick)
    this.context.map.on('mousemove', this.onMousemove)
  }
  public override disabled(): void {
    this.context.map.getCanvasContainer().style.cursor = ''
    this.context.map.off('click', this.onClick)
    this.context.map.off('mousemove', this.onMousemove)
  }
}

export class PointUpdateEvent extends PointBaseEvent {
  private onMousedown = (e: MapMouseEvent): void => {
    e.preventDefault()
    this.context.map.getCanvasContainer().style.cursor = 'move'

    this.context.map.on('mousemove', this.onMousemove)
    this.context.map.once('mouseup', this.onMouseup)

    this.point.emit(`${Point.NAME}.beforeUpdate`, this.message<Point>(e, this.point))
  }

  private onMousemove = (e: MapMouseEvent): void => {
    this.context.map.getCanvasContainer().style.cursor = 'move'
    this.point.move(e.lngLat)

    this.point.emit(`${Point.NAME}.update`, this.message<Point>(e, this.point))
  }

  private onMouseup = (e: MapMouseEvent): void => {
    this.context.map.getCanvasContainer().style.cursor = ''
    // this.disabled()
    this.context.map.off('mousemove', this.onMousemove)

    this.point.render()

    this.point.emit(`${Point.NAME}.doneUpdate`, this.message<Point>(e, this.point))
  }

  constructor(map: Map, point: Point) {
    super(map, point)
  }

  public override onAdd(): void {
    // this.on()
  }

  public override onRemove(): void {
    throw new Error('Method not implemented.')
  }

  public override able(): void {
    console.log(this.point.LAYER, 'able')
    this.context.eventManager.on(this.point.id, this.point.LAYER, 'mousedown', this.onMousedown)
  }

  public override disabled(): void {
    this.context.eventManager.off(this.point.id, 'mousedown', this.onMousedown)
  }
}

export class PointResidentEvent extends PointBaseEvent {
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

  constructor(map: Map, point: Point) {
    super(map, point)
  }

  public override onAdd(): void {
    // this.on()
  }

  public override onRemove(): void {
    throw new Error('Method not implemented.')
  }

  public override able(): void {
    this.context.eventManager.on(this.point.id, this.point.LAYER, 'dblclick', this.onDblclick)

    this.context.eventManager.on(this.point.id, this.point.LAYER, 'mouseenter', this.onMouseEnter)

    this.context.eventManager.on(this.point.id, this.point.LAYER, 'mouseleave', this.onMouseLeave)

    this.context.eventManager.on(this.point.id, this.point.LAYER, 'click', this.onClick)
  }

  public override disabled(): void {
    this.context.eventManager.off(this.point.id, 'dblclick', this.onDblclick)

    this.context.eventManager.off(this.point.id, 'mouseenter', this.onMouseEnter)

    this.context.eventManager.off(this.point.id, 'mouseleave', this.onMouseLeave)

    this.context.eventManager.off(this.point.id, 'click', this.onClick)
  }
}
