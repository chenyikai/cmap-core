import { point } from '@turf/turf'
import type * as GeoJSON from 'geojson'
import type { LngLat, Map } from 'mapbox-gl'

import { Tooltip } from '@/core/Tooltip'
import { Poi } from '@/modules/Plot/plugins/Poi.ts'
import { LAYER_LIST, NAME, POINT_CIRCLE_LAYER_NAME } from '@/modules/Plot/plugins/Point/vars.ts'
import { EMPTY_SOURCE, PLOT_SOURCE_NAME } from '@/modules/Plot/vars.ts'
import type { PlotType } from '@/types/Plot/Poi.ts'
import type { IPointOptions } from '@/types/Plot/Point.ts'

import { PointCreateEvent, PointResidentEvent, PointUpdateEvent } from '../Events/PointEvents'

export class Point<T extends IPointOptions = IPointOptions> extends Poi<T, GeoJSON.Point> {
  static NAME: PlotType = NAME

  readonly LAYER: string = POINT_CIRCLE_LAYER_NAME

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
