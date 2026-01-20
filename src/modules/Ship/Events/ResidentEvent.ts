import type { Map, MapMouseEvent } from 'mapbox-gl'

import { EventState } from '@/core/EventState'
import type { AisShip } from '@/modules/Ship/plugins/AisShip.ts'
import { SHIP_ICON_LAYER_NAME, SHIP_REAL_LAYER_NAME } from '@/modules/Ship/vars.ts'
import type { IAisShipOptions } from '@/types/Ship/AisShip.ts'

export class ResidentEvent extends EventState {
  protected readonly ships: AisShip[] = []
  protected hoverId: IAisShipOptions['id'] | null | undefined = null
  protected _click: OmitThisParameter<(e: MapMouseEvent) => void> = (): void => {
    /* empty */
  }
  protected _move: OmitThisParameter<(e: MapMouseEvent) => void> = (): void => {
    /* empty */
  }
  protected _leave: OmitThisParameter<(e: MapMouseEvent) => void> = (): void => {
    /* empty */
  }
  protected _zoomEnd = (): void => {
    /* empty */
  }

  constructor(map: Map, ships?: AisShip[]) {
    super(map)

    if (ships) {
      this.ships = ships
    }
  }

  override on(): void {
    this.context.map.on('click', SHIP_ICON_LAYER_NAME, this._click)
    this.context.map.on('mousemove', SHIP_ICON_LAYER_NAME, this._move)
    this.context.map.on('mouseleave', SHIP_ICON_LAYER_NAME, this._leave)

    this.context.map.on('click', SHIP_REAL_LAYER_NAME, this._click)
    this.context.map.on('mousemove', SHIP_REAL_LAYER_NAME, this._move)
    this.context.map.on('mouseleave', SHIP_REAL_LAYER_NAME, this._leave)

    this.context.map.on('zoomend', this._zoomEnd)
  }

  override off(): void {
    this.context.map.off('click', SHIP_ICON_LAYER_NAME, this._click)
    this.context.map.off('mousemove', SHIP_ICON_LAYER_NAME, this._move)
    this.context.map.off('mouseleave', SHIP_ICON_LAYER_NAME, this._leave)

    this.context.map.off('click', SHIP_REAL_LAYER_NAME, this._click)
    this.context.map.off('mousemove', SHIP_REAL_LAYER_NAME, this._move)
    this.context.map.off('mouseleave', SHIP_REAL_LAYER_NAME, this._leave)

    this.context.map.off('zoomend', this._zoomEnd)
  }

  onAdd(): void {
    this._click = this.onClick.bind(this)
    this._move = this.onMove.bind(this)
    this._leave = this.onLeave.bind(this)
    this._zoomEnd = this.onZoomEnd.bind(this)

    this.on()
  }

  onRemove(): void {
    this.off()
  }

  add(ship: AisShip): void {
    const data = this.findShip(ship.id)
    if (data) {
      ship.update(data.options)
    } else {
      this.ships.push(ship)
    }
  }

  remove(id: IAisShipOptions['id']): void {
    const i = this.ships.findIndex((item) => item.id === id)
    if (i !== -1) {
      this.ships.splice(i, 1)
    }
  }

  onZoomEnd(): void {
    this.ships.forEach((ship) => {
      ship.render()
    })
  }

  onMove(e: MapMouseEvent): void {
    if (e.features?.length) {
      this.context.map.getCanvasContainer().style.cursor = 'pointer'

      if (this.hoverId === e.features[0].id) return

      if (this.hoverId) {
        this.unhover()
      }

      this.hoverId = e.features[0].id as string
      this.hover()
    }
  }

  onLeave(): void {
    this.unhover()
    this.hoverId = null
    this.context.map.getCanvasContainer().style.cursor = ''
  }

  onClick(e: MapMouseEvent): void {
    if (e.features?.length) {
      const id = e.features[0].id
      if (id) {
        const ship = this.findShip(id)
        ship?.focus()
        this.context.events.emit('click', ship)
      }
    }
  }

  hover(): void {
    if (!this.hoverId) return

    const ship = this.findShip(this.hoverId)
    ship?.setState({ hover: true })
    ship?.render()
    this.context.events.emit('hover', ship)
  }

  unhover(): void {
    if (!this.hoverId) return

    const ship = this.findShip(this.hoverId)
    ship?.setState({ hover: false })
    ship?.render()
    this.context.events.emit('unhover', ship)
  }

  findShip(id: IAisShipOptions['id']): AisShip | undefined {
    return this.ships.find((item) => String(item.id) === String(id))
  }
}
