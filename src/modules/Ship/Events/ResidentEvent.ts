import type { Map, MapMouseEvent } from 'mapbox-gl'

import { EventState } from '@/core/EventState'
import type { BaseShip } from '@/modules/Ship/BaseShip.ts'
import { SHIP_ICON_LAYER_NAME, SHIP_REAL_LAYER_NAME } from '@/modules/Ship/vars.ts'
import type { IAisShipOptions } from '@/types/Ship/AisShip.ts'
import type { IBaseShipOptions } from '@/types/Ship/BaseShip.ts'

export class ResidentEvent extends EventState {
  private readonly ships: globalThis.Map<string, BaseShip<IBaseShipOptions>>
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

  protected override get mapLifecycleEvent(): 'remove' {
    return 'remove'
  }

  constructor(
    map: Map,
    ships?: BaseShip<IBaseShipOptions>[],
    index = new globalThis.Map<string, BaseShip<IBaseShipOptions>>(),
  ) {
    super(map)

    this.ships = index
    ships?.forEach((ship) => {
      this.add(ship)
    })
    this._click = this.onClick.bind(this)
    this._move = this.onMove.bind(this)
    this._leave = this.onLeave.bind(this)
    this._zoomEnd = this.onZoomEnd.bind(this)
    this.enabled()
  }

  override enabled(): void {
    if (this.status === EventState.ON) return
    this.context.map.on('click', SHIP_ICON_LAYER_NAME, this._click)
    this.context.map.on('mousemove', SHIP_ICON_LAYER_NAME, this._move)
    this.context.map.on('mouseleave', SHIP_ICON_LAYER_NAME, this._leave)

    this.context.map.on('click', SHIP_REAL_LAYER_NAME, this._click)
    this.context.map.on('mousemove', SHIP_REAL_LAYER_NAME, this._move)
    this.context.map.on('mouseleave', SHIP_REAL_LAYER_NAME, this._leave)

    this.context.map.on('zoomend', this._zoomEnd)
    this.status = EventState.ON
  }

  override disabled(): void {
    this.clearHover(true)
    this.context.map.off('click', SHIP_ICON_LAYER_NAME, this._click)
    this.context.map.off('mousemove', SHIP_ICON_LAYER_NAME, this._move)
    this.context.map.off('mouseleave', SHIP_ICON_LAYER_NAME, this._leave)

    this.context.map.off('click', SHIP_REAL_LAYER_NAME, this._click)
    this.context.map.off('mousemove', SHIP_REAL_LAYER_NAME, this._move)
    this.context.map.off('mouseleave', SHIP_REAL_LAYER_NAME, this._leave)

    this.context.map.off('zoomend', this._zoomEnd)
    this.status = EventState.OFF
  }

  onAdd(): void {
    // Bind only after subclass fields have been initialized.
  }

  onRemove(): void {
    this.disabled()
  }

  add(ship: BaseShip<IBaseShipOptions>): void {
    this.ships.set(String(ship.id), ship)
  }

  remove(id: IAisShipOptions['id']): void {
    if (this.hoverId != null && String(this.hoverId) === String(id)) this.clearHover(false)
    this.ships.delete(String(id))
  }

  removeAll(): void {
    this.clearHover(false)
    this.ships.clear()
  }

  private clearHover(render: boolean): void {
    if (!this.mapRemoved && this.hoverId != null) {
      const ship = this.findShip(this.hoverId)
      ship?.setState({ hover: false })
      if (render) ship?.render()
    }
    this.hoverId = null
    if (!this.mapRemoved) this.context.map.getCanvasContainer().style.cursor = ''
  }

  onZoomEnd(): void {
    this.ships.forEach((ship) => {
      ship.render()
    })
  }

  onMove(e: MapMouseEvent): void {
    if (e.features?.length) {
      const id = e.features[0].id
      if (id == null || !this.findShip(id)) return
      this.context.map.getCanvasContainer().style.cursor = 'pointer'

      if (this.hoverId != null && String(this.hoverId) === String(id)) return

      if (this.hoverId != null) {
        this.unhover()
      }

      this.hoverId = id
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
      if (id != null) {
        const ship = this.findShip(id)
        if (!ship) return

        this.context.events.emit('click', ship)
        this.context.map.fire('ship-click', ship)
      }
    }
  }

  hover(): void {
    if (this.hoverId == null) return

    const ship = this.findShip(this.hoverId)
    if (!ship) return
    ship.setState({ hover: true })
    ship.render()
    this.context.events.emit('hover', ship)
    this.context.map.fire('ship-hover', ship)
  }

  unhover(): void {
    if (this.hoverId == null) return

    const ship = this.findShip(this.hoverId)
    if (!ship) return
    ship.setState({ hover: false })
    ship.render()
    this.context.events.emit('unhover', ship)
    this.context.map.fire('ship-unhover', ship)
  }

  findShip(id: IAisShipOptions['id']): BaseShip<IBaseShipOptions> | undefined {
    return this.ships.get(String(id))
  }
}
