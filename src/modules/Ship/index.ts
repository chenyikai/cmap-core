import type { Map as MapboxGlMap } from 'mapbox-gl'

import { Module } from '@/core/Module'
import type { Tooltip } from '@/core/Tooltip'
import type { BaseShip } from '@/modules/Ship/BaseShip.ts'
import { ResidentEvent } from '@/modules/Ship/Events/ResidentEvent'
import type { IShipOptions } from '@/types/Ship'
import type { BaseShipConstructor, IBaseShipOptions } from '@/types/Ship/BaseShip.ts'

class Ship extends Module {
  options: IShipOptions
  ships: BaseShip<IBaseShipOptions>[] = []
  event: ResidentEvent

  private pluginRegistry = new Map<string, BaseShipConstructor>()
  private readonly shipIndex = new Map<string, BaseShip<IBaseShipOptions>>()
  private focusId: IBaseShipOptions['id'] | null = null
  private removed = false

  protected override get mapLifecycleEvent(): 'remove' {
    return 'remove'
  }

  constructor(map: MapboxGlMap, options: IShipOptions) {
    super(map)
    this.options = options
    this.event = new ResidentEvent(map, undefined, this.shipIndex)

    this.registerPlugins(options.plugins)
  }

  override onAdd(): void {
    // throw new Error('Method not implemented.')
  }
  override onRemove(): void {
    if (this.removed) return
    this.removed = true
    this.removeAll()
    this.event.destroy()
  }

  get tooltips(): Tooltip[] {
    return this.ships.flatMap((ship) => ship.tooltip ?? [])
  }

  private registerPlugins(plugins: BaseShipConstructor[] = []): void {
    plugins.forEach((PluginClass) => {
      if (PluginClass.NAME) {
        this.pluginRegistry.set(PluginClass.NAME, PluginClass)
      } else {
        console.warn('Ship Plugin missing static NAME property:', PluginClass)
      }
    })
  }

  add(data: IBaseShipOptions): BaseShip<any> | undefined {
    const previous = this.get(data.id)
    const ship = this.upsert(data)
    if (ship && ship !== previous) this.ships.push(ship)
    return ship
  }

  private upsert(data: IBaseShipOptions): BaseShip<IBaseShipOptions> | undefined {
    if (this.removed || this.mapRemoved) return undefined
    const Constructor = this.pluginRegistry.get(data.type)

    if (!Constructor) {
      console.warn(`No plugin registered for ship type: "${data.type}"`)
      return undefined
    }

    const existing = this.shipIndex.get(String(data.id))
    if (existing?.options.type === data.type) {
      // Keep the original Feature ID type; lookups accept either numeric or string IDs.
      existing.update({ ...data, id: existing.id })
      return existing
    }
    if (existing) this.remove(existing.id)

    const ship = new Constructor(this.context.map, data) as BaseShip<IBaseShipOptions>
    this.event.add(ship)
    ship.render()

    return ship
  }

  load(list: IBaseShipOptions[]): BaseShip<any>[] {
    if (this.removed || this.mapRemoved) return []
    const focusedId = this.focusId
    const restoreFocus = focusedId != null && this.shipIndex.get(String(focusedId))?.isFocus
    // One authoritative instance per ID. Duplicate input uses the last record.
    const incoming = new Map(list.map((item) => [String(item.id), item]))
    for (const [key, ship] of this.shipIndex) {
      const next = incoming.get(key)
      if (next?.type !== ship.options.type) this.removeEntry(ship)
    }

    const newShips: BaseShip<IBaseShipOptions>[] = []
    incoming.forEach((item) => {
      const ship = this.upsert(item)
      if (ship) {
        newShips.push(ship)
      }
    })

    this.ships = newShips
    if (restoreFocus) {
      const ship = this.shipIndex.get(String(focusedId))
      if (ship && !ship.isFocus) this.focus(ship.id)
    }

    return [...newShips]
  }

  remove(id: IBaseShipOptions['id']): void {
    const ship = this.shipIndex.get(String(id))
    if (!ship) return
    this.removeEntry(ship)
    this.ships = this.ships.filter((item) => item !== ship)
  }

  private removeEntry(ship: BaseShip<IBaseShipOptions>): void {
    this.event.remove(ship.id)
    ship.remove()
    if (this.focusId != null && String(this.focusId) === String(ship.id)) this.focusId = null
  }

  removeAll(): void {
    const ships = [...this.shipIndex.values()]
    this.event.removeAll()
    ships.forEach((ship) => {
      ship.remove()
    })
    this.ships = []

    this.focusId = null
  }

  render(): void {
    this.ships.forEach((ship) => {
      ship.render()
    })
  }

  get(id: string | number): BaseShip<any> | undefined {
    return this.shipIndex.get(String(id))
  }

  private changeFocus(ship: BaseShip<IBaseShipOptions>): void {
    if (this.focusId != null && String(this.focusId) !== String(ship.id)) {
      this.get(this.focusId)?.unselect()
    }
    this.focusId = ship.id
  }

  focus(id: IBaseShipOptions['id']): void {
    const ship = this.shipIndex.get(String(id))
    if (ship) {
      this.changeFocus(ship)
      ship.focus()
    } else {
      console.warn(`The ship-${String(id)} was not found.`)
    }
  }

  unfocus(id: IBaseShipOptions['id']): void {
    const ship = this.get(id)
    if (ship) {
      ship.unfocus()
      if (String(this.focusId) === String(ship.id)) this.focusId = null
    } else {
      console.warn(`The ship-${String(id)} was not found.`)
    }
  }

  select(id: IBaseShipOptions['id']): void {
    const ship = this.shipIndex.get(String(id))
    if (ship) {
      this.changeFocus(ship)
      ship.select()
    } else {
      console.warn(`The ship-${String(id)} was not found.`)
    }
  }

  unselect(id: IBaseShipOptions['id']): void {
    const ship = this.get(id)
    if (ship) {
      ship.unselect()
      if (String(this.focusId) === String(ship.id)) this.focusId = null
    } else {
      console.warn(`The ship-${String(id)} was not found.`)
    }
  }
}

export default Ship
