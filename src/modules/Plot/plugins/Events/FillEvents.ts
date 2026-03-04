import type { Map, MapMouseEvent } from 'mapbox-gl'
import type { LngLat } from 'mapbox-gl'

import { EventState } from '@/core/EventState'
import type { Fill } from '@/modules/Plot/plugins/Fill'
import type { Line } from '@/modules/Plot/plugins/Line'
import type { EventMessage } from '@/types/EventState'
import type { PointInstance } from '@/types/Plot/Point.ts'

export abstract class FillBaseEvent extends EventState {
  protected fill: Fill

  protected constructor(map: Map, fill: Fill) {
    super(map)

    this.fill = fill
  }

  public abstract override onAdd(): void

  public abstract override onRemove(): void

  public abstract override able(): void

  public abstract override disabled(): void
}

export class FillCreateEvent extends FillBaseEvent {
  private count = 0

  private onClick = (e: MapMouseEvent): void => {
    // 点击过一次之后 计算结束事件
    if (this.count >= 1) {
      // const layers = new Set(
      //   [...this.fill.points, ...this.line.midPoints].map((item) => item.LAYER),
      // )
      //
      // const features = this.context.map.queryRenderedFeatures(e.point, {
      //   layers: [...layers],
      // })
      //
      // if (features.length > 0) {
      //   this.stop(e)
      //   return
      // }
    }

    // if (!Array.isArray(this.line.options.position)) {
    //   this.line.options.position = []
    // }

    // this.line.options.position.push(e.lngLat)
    this.count++
  }

  private onMousemove = (e: MapMouseEvent): void => {
    this.context.map.getCanvasContainer().style.cursor = 'crosshair'
    console.log(e, 'e')
  }

  private stop = (e: MapMouseEvent): void => {
    e.preventDefault()

    this.context.map.getCanvasContainer().style.cursor = ''
    // this.line.drawPoint = null
    // this.count = 0
    // this.disabled()
    //
    // this.line.removePoint()
    // this.line.createPoint()
    // this.line.edit()
  }

  constructor(map: Map, fill: Fill) {
    super(map, fill)
  }

  public override onAdd(): void {
    /* empty */
  }
  public override onRemove(): void {
    /* empty */
  }

  public override able(): void {
    this.context.map.doubleClickZoom.disable()
    //
    // this.context.map.on('click', this.onClick)
    // this.context.map.on('mousemove', this.onMousemove)
    // this.context.map.on('dblclick', this.stop)
    this.changeStatus()
  }
  public override disabled(): void {
    // this.context.map.off('click', this.onClick)
    // this.context.map.off('mousemove', this.onMousemove)
    // this.context.map.off('dblclick', this.stop)

    setTimeout(() => {
      this.context.map.doubleClickZoom.enable()
    }, 0)
    this.changeStatus()
  }
}

export class FillUpdateEvent extends FillBaseEvent {
  protected dragStartLngLat: LngLat | null = null

  private onLineUpdate = (_e: EventMessage<Line>, point: PointInstance): void => {
    if (!point.center || !this.fill.line) return

    const index = point.options.properties?.index as number

    if (index === 0) {
      const lastIndex = this.fill.line.points.length - 1
      this.fill.line.updatePoint(lastIndex, point.center)
    }

    this.fill.line.updatePoint(index, point.center)

    this.fill.render()
  }

  private onLineMidUpdate = (): void => {
    this.fill.render()
  }

  private onLineMidDoneUpdate = (): void => {
    this.fill.line?.points.at(-1)?.hide()
  }

  private onFillMousedown = (e: MapMouseEvent): void => {
    const layers = new Set(
      [...(this.fill.line?.points ?? []), ...(this.fill.line?.midPoints ?? [])].map(
        (item) => item.LAYER,
      ),
    )

    const features = this.context.map.queryRenderedFeatures(e.point, {
      layers: [...layers, this.fill.line?.LAYER ?? ''],
    })

    if (features.length > 0) {
      return
    }

    e.preventDefault()
    this.context.map.getCanvasContainer().style.cursor = 'move'
    this.fill.dragStartLngLat = e.lngLat

    this.context.map.on('mousemove', this.onMousemove)
    this.context.map.once('mouseup', this.onMouseup)

    this.fill.emit(`beforeUpdate`, this.message<Fill>(e, this.fill))
  }

  private onMousemove = (e: MapMouseEvent): void => {
    this.context.map.getCanvasContainer().style.cursor = 'move'
    const current = e.lngLat
    this.fill.move(current)
    this.fill.dragStartLngLat = current
    this.fill.emit(`update`, this.message<Fill>(e, this.fill))
  }

  private onMouseup = (e: MapMouseEvent): void => {
    this.context.map.getCanvasContainer().style.cursor = 'pointer'
    this.context.map.off('mousemove', this.onMousemove)
    this.dragStartLngLat = null
    this.fill.render()

    this.fill.emit(`doneUpdate`, this.message<Fill>(e, this.fill))
  }

  private onFillMouseenter = (): void => {
    this.context.map.getCanvasContainer().style.cursor = 'pointer'
  }

  private onFillMouseLeave = (): void => {
    this.context.map.getCanvasContainer().style.cursor = ''
  }

  constructor(map: Map, fill: Fill) {
    super(map, fill)
  }

  public override onAdd(): void {
    /* empty */
  }

  public override onRemove(): void {
    this.disabled()
  }

  public override able(): void {
    this.fill.line?.on('update', this.onLineUpdate)

    this.fill.line?.on('midUpdate', this.onLineMidUpdate)

    this.fill.line?.on('midDoneUpdate', this.onLineMidDoneUpdate)

    this.context.map.on('mousedown', this.fill.LAYER, this.onFillMousedown)

    this.context.eventManager.on(this.fill.id, this.fill.LAYER, 'mouseenter', this.onFillMouseenter)

    this.context.eventManager.on(this.fill.id, this.fill.LAYER, 'mouseleave', this.onFillMouseLeave)

    this.changeStatus()
  }

  public override disabled(): void {
    this.fill.line?.off('update', this.onLineUpdate)

    this.fill.line?.off('midUpdate', this.onLineMidUpdate)

    this.fill.line?.off('midDoneUpdate', this.onLineMidDoneUpdate)

    this.context.map.off('mousedown', this.fill.LAYER, this.onFillMousedown)

    this.context.eventManager.off(this.fill.id, 'mouseenter', this.onFillMouseenter)

    this.context.eventManager.off(this.fill.id, 'mouseleave', this.onFillMouseLeave)

    this.changeStatus()
  }
}

export class FillResidentEvent extends FillBaseEvent {
  constructor(map: Map, fill: Fill) {
    super(map, fill)
  }

  public override onAdd(): void {
    // this.on()
  }

  public override onRemove(): void {
    this.disabled()
  }

  public override able(): void {
    this.changeStatus()
  }

  public override disabled(): void {
    this.changeStatus()
  }
}
