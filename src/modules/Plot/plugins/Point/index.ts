import { point } from '@turf/turf'
import type * as GeoJSON from 'geojson'
import type { LngLat, Map, MapMouseEvent } from 'mapbox-gl'

import { EventState } from '@/core/EventState'
import { Tooltip } from '@/core/Tooltip'
import { Poi } from '@/modules/Plot/plugins/Poi.ts'
import { LAYER_LIST, NAME, POINT_CIRCLE_LAYER_NAME } from '@/modules/Plot/plugins/Point/vars.ts'
import { EMPTY_SOURCE, PLOT_SOURCE_NAME } from '@/modules/Plot/vars.ts'
import type { PlotType } from '@/types/Plot/Poi.ts'
import type { IPointOptions } from '@/types/Plot/Point.ts'

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
    if (this.point.options.tooltip) {
      this.point.setTooltip(
        new Tooltip(this.context.map, {
          id: this.point.id,
          position: e.lngLat,
          className: 'mapbox-gl-tooltip',
          offsetX: 0,
          offsetY: 18,
          element: this.point.label(),
          anchor: 'top',
          line: false,
          visible: true,
        }),
      )
    }

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

    this.point.removeTooltip()
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

    if (this.point.center && this.point.options.tooltip) {
      this.point.setTooltip(
        new Tooltip(this.context.map, {
          id: this.point.id,
          position: this.point.center,
          className: 'mapbox-gl-tooltip',
          offsetX: 0,
          offsetY: 18,
          element: this.point.label(),
          anchor: 'top',
          line: false,
          visible: false,
        }),
      )
    }

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
    this.context.eventManager.on(
      this.point.id,
      POINT_CIRCLE_LAYER_NAME,
      'mousedown',
      this.onMousedown,
    )
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
    this.context.eventManager.on(
      this.point.id,
      POINT_CIRCLE_LAYER_NAME,
      'dblclick',
      this.onDblclick,
    )

    this.context.eventManager.on(
      this.point.id,
      POINT_CIRCLE_LAYER_NAME,
      'mouseenter',
      this.onMouseEnter,
    )

    this.context.eventManager.on(
      this.point.id,
      POINT_CIRCLE_LAYER_NAME,
      'mouseleave',
      this.onMouseLeave,
    )

    this.context.eventManager.on(this.point.id, POINT_CIRCLE_LAYER_NAME, 'click', this.onClick)
  }

  public override disabled(): void {
    this.context.eventManager.off(this.point.id, 'dblclick', this.onDblclick)

    this.context.eventManager.off(this.point.id, 'mouseenter', this.onMouseEnter)

    this.context.eventManager.off(this.point.id, 'mouseleave', this.onMouseLeave)

    this.context.eventManager.off(this.point.id, 'click', this.onClick)
  }
}

export class Point<T extends IPointOptions = IPointOptions> extends Poi<T, GeoJSON.Point> {
  static NAME: PlotType = NAME

  protected residentEvent: PointResidentEvent

  protected updateEvent: PointUpdateEvent

  protected createEvent: PointCreateEvent

  constructor(map: Map, options: T) {
    super(map, options)

    this.residentEvent = new PointResidentEvent(map, this)
    this.updateEvent = new PointUpdateEvent(map, this)
    this.createEvent = new PointCreateEvent(map, this)
    this.residentEvent.able()

    if (this.options.tooltip && this.center) {
      this.setTooltip(
        new Tooltip(this.context.map, {
          id: this.id,
          position: this.center,
          className: 'mapbox-gl-plot-name-tooltip',
          offsetX: 0,
          offsetY: 18,
          element: this.label(),
          anchor: 'top',
          line: false,
          visible: false,
        }),
      )
    }
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

  public override get id(): string {
    return this.options.id
  }
  public override edit(): void {
    this.setState({ edit: true })
    this.residentEvent.disabled()
    this.updateEvent.able()
  }
  public override unedit(): void {
    this.setState({ edit: true })
    this.residentEvent.able()
    this.updateEvent.disabled()
  }

  override setTooltip(tooltip: Tooltip): void {
    if (this.tooltip) {
      this.removeTooltip()
    }

    this.tooltip = tooltip
  }
  override removeTooltip(): void {
    this.tooltip?.remove()
    this.tooltip = null
  }

  public override focus(): void {
    throw new Error('Method not implemented.')
  }
  public override unfocus(): void {
    throw new Error('Method not implemented.')
  }
  public override select(): void {
    throw new Error('Method not implemented.')
  }
  public override unselect(): void {
    throw new Error('Method not implemented.')
  }

  public override get center(): LngLat | undefined {
    return this.options.position
  }

  public override get geometry(): GeoJSON.Point | null {
    throw new Error('Method not implemented.')
  }

  public override getFeature(): GeoJSON.Feature<
    GeoJSON.Point,
    T['style'] & T['properties']
  > | null {
    if (!this.options.position) {
      return null
    }

    return point(
      this.options.position.toArray(),
      {
        ...this.options.style,
        ...this.options.properties,
        meta: 'circle',
      },
      {
        id: this.options.id,
      },
    )
  }
  public override start(): void {
    if (this.center === undefined) {
      this.createEvent.able()
    }
  }
  public override stop(): void {
    this.createEvent.disabled()
  }

  override label(): HTMLElement {
    const id = `${this.id}-plot-name-box`
    let nameBox = document.getElementById(id)
    if (nameBox) {
      return nameBox
    }

    nameBox = document.createElement('div')
    nameBox.id = id
    nameBox.classList.add('plot-name-box')

    const plotName = document.createElement('div')
    plotName.innerText = this.options.name
    plotName.classList.add('text')

    nameBox.appendChild(plotName)

    return nameBox
  }

  public override move(position: T['position']): void {
    this.options.position = position
    this.render()
  }
  public override update(options: T): void {
    this.options = options
    this.render()
  }
  public override remove(): void {
    throw new Error('Method not implemented.')
  }
  public override render(): void {
    if (this.getFeature()) {
      const bounds = this.context.map.getBounds()
      if (this.center && !bounds?.contains(this.center)) {
        this.tooltip?.hide()
        return
      }

      this.tooltip?.show()

      this.context.register.setGeoJSONData(PLOT_SOURCE_NAME, this.getFeature() as GeoJSON.Feature)
    }
  }
}
