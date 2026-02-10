import { lineString, lineToPolygon, point, rhumbDestination, transformRotate } from '@turf/turf'
import dayjs from 'dayjs'
import type * as GeoJSON from 'geojson'
import type { LngLat, Map } from 'mapbox-gl'
import { Point } from 'mapbox-gl'

import { Tooltip } from '@/core/Tooltip/index.ts'
import { BaseShip } from '@/modules/Ship/BaseShip.ts'
import { LAYER_LIST, NAME, SHIP_SOURCE_NAME, UPDATE_STATUS } from '@/modules/Ship/vars.ts'
import type { IAisShipOptions } from '@/types/Ship/AisShip.ts'
import type { Orientation, Shape } from '@/types/Ship/BaseShip'
import { distanceToPx, pixelsToMeters } from '@/utils/util.ts'

export class AisShip extends BaseShip<IAisShipOptions> {
  override readonly SOURCE: string = SHIP_SOURCE_NAME
  static override NAME: string = NAME

  constructor(map: Map, options: IAisShipOptions) {
    super(map, options)

    if (this.options.tooltip) {
      this.setTooltip(
        new Tooltip(this.context.map, {
          id: this.id,
          position: this.position(),
          className: 'mapbox-gl-ship-name-tooltip',
          offsetX: 5,
          offsetY: 25,
          element: this.label(),
          anchor: 'bottom-right',
          visible: false,
        }),
      )
    }
  }

  public override onAdd(): void {
    this.context.register.addSource(SHIP_SOURCE_NAME, {
      type: 'geojson',
      dynamic: true,
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    })

    LAYER_LIST.forEach((layer) => {
      this.context.register.addLayer(layer)
    })

    // SHIP_ICON.forEach((icon) => this.context.iconManage.addSvg(icon))
    // await this.context.iconManage.load(SHIP_ICON)
  }
  public override onRemove(): void {
    throw new Error('Method not implemented.')
  }

  override get id(): string | number {
    return this.options.id
  }

  override get updateStatus(): UPDATE_STATUS {
    const betweenTime = Date.now() - dayjs(Number(this.options.time)).valueOf()
    if (betweenTime <= 1800000) {
      return UPDATE_STATUS.ONLINE
    } else if (betweenTime > 1800000 && betweenTime <= 7200000) {
      return UPDATE_STATUS.DELAY
    } else if (betweenTime > 7200000) {
      return UPDATE_STATUS.OFFLINE
    } else {
      return UPDATE_STATUS.OFFLINE
    }
  }

  public override getIconName(): string {
    const state = this.getState()
    let icon

    if (this.options.icon) {
      icon = this.options.icon
    } else {
      icon = `${AisShip.NAME}-${this.updateStatus}`

      if (state?.hover || state?.focus) {
        icon = `${icon}-active`
      }
    }

    return icon
  }

  override position(): LngLat {
    const orientation: Point = this.context.map.project(this.options.position)
    const x = orientation.x + this.offset().x
    const y = orientation.y + this.offset().y
    return this.context.map.unproject(new Point(x, y))
  }

  override get direction(): number {
    // AIS 标准：511 代表无效值
    const HDG_INVALID = 511

    // 1. 优先使用 艏向 (HDG)
    // 只有当 hdg 不等于 511，且在 0-360 范围内时才使用
    if (this.options.hdg !== HDG_INVALID && this.options.hdg > 0 && this.options.hdg < 360) {
      return this.options.hdg
    }

    // 2. 降级使用 航迹向 (COG)
    // COG 有时会是 360，也代表正北，或者有些设备无效时也是 360+
    if (
      this.options.cog > 0 &&
      this.options.cog < 360 // 360 在某些协议里也可能代表未知，通常取 [0, 360)
    ) {
      return this.options.cog
    }

    // 3. 实在没有数据，默认正北
    return 0
    // if (this.options.hdg && this.options.hdg >= 0 && this.options.hdg < 360) {
    //   if (
    //     this.options.statusId === 0 ||
    //     this.options.statusId === 7 ||
    //     this.options.statusId === 8
    //   ) {
    //     if (this.options.speed <= 0.5) {
    //       return this.options.hdg || this.options.cog || 0
    //     } else {
    //       if (Math.abs(this.options.hdg - this.options.cog) > 30) {
    //         return this.options.cog
    //       }
    //       return this.options.cog || this.options.hdg || 0
    //     }
    //   } else {
    //     return this.options.hdg || this.options.cog || 0
    //   }
    // } else {
    //   return this.options.cog || 0
    // }
  }

  override get orientation(): Orientation {
    const SPEED_THRESHOLD = 0.5
    const ROT_NOT_AVAILABLE = -128

    if (this.options.speed < SPEED_THRESHOLD) {
      return 'static'
    }

    if (this.options.rot === ROT_NOT_AVAILABLE || this.options.rot === 0) {
      return 'straight'
    }

    if (this.options.rot > 0) {
      return 'right'
    }

    if (this.options.rot < 0) {
      return 'left'
    }

    return 'straight'
  }

  override getShape(): Shape | null {
    if (this.options.width && this.options.height) {
      const { x, y }: Point = this.context.map.project(this.position())
      const ex: number = distanceToPx(this.context.map, this.options.width) / 2
      const ey: number = distanceToPx(this.context.map, this.options.height) / 2

      return {
        leftDirection: new Point(x - ex, y - ey * 2),
        rightDirection: new Point(x + ex, y - ey * 2),
        turn: new Point(x, y - ey - this.options.speed * 3),
        head: new Point(x, y - ey),
        rightBow: new Point(x + ex, y - ey * 0.5),
        rightQuarter: new Point(x + ex, y + ey * 0.85),
        rightStern: new Point(x + ex * 0.7, y + ey),
        leftStern: new Point(x - ex * 0.7, y + ey),
        leftQuarter: new Point(x - ex, y + ey * 0.85),
        leftBow: new Point(x - ex, y - ey * 0.5),
      }
    } else {
      return null
    }
  }

  override getFeature():
    | GeoJSON.Feature<GeoJSON.Polygon, IAisShipOptions>
    | GeoJSON.Feature<GeoJSON.Point, IAisShipOptions> {
    const zoom = this.options.realZoom ?? 16

    if (this.context.map.getZoom() >= zoom) {
      return this.real()
    } else {
      return this.icon()
    }
  }
  override remove(): void {
    this.removeTooltip()

    if (this.isFocus) {
      this.unfocus()
      this.context.focus.remove(String(this.id))
    }

    const emptyFeature: GeoJSON.Feature<null> = {
      type: 'Feature',
      geometry: null,
      id: this.id,
      properties: {},
    }

    const emptyDirLineFeature: GeoJSON.Feature<null> = {
      type: 'Feature',
      geometry: null,
      id: String(this.id) + '-direction-line',
      properties: {},
    }
    this.context.register.setGeoJSONData(this.SOURCE, [emptyFeature, emptyDirLineFeature])

    this.context.map.triggerRepaint()
  }
  override setTooltip(tooltip: Tooltip): void {
    this.tooltip = tooltip
  }

  override removeTooltip(): void {
    this.tooltip?.remove()
    this.tooltip = null
  }

  override update(options: IAisShipOptions): void {
    this.options = options
    this.render()
  }

  override select(): void {
    this.context.map.flyTo({
      center: this.position(),
      zoom: 16,
    })

    this.context.map.once('moveend', () => {
      this.focus()
    })
  }
  override unselect(): void {
    this.unfocus()
  }

  override focus(): void {
    this.setState({ focus: true })

    this.render()
  }
  override unfocus(): void {
    this.setState({ focus: false })

    this.render()
  }
  override icon(): GeoJSON.Feature<GeoJSON.Point, IAisShipOptions> {
    return point<IAisShipOptions>(
      this.position().toArray(),
      {
        ...this.options,
        icon: this.getIconName(),
        direction: this.direction,
        updateStatus: this.updateStatus,
      },
      {
        id: this.id,
      },
    )
  }
  override real():
    | GeoJSON.Feature<GeoJSON.Polygon, IAisShipOptions>
    | GeoJSON.Feature<GeoJSON.Point, IAisShipOptions> {
    const shape = this.getShape()

    if (!shape) {
      return this.icon()
    } else {
      const {
        head,
        rightBow,
        rightQuarter,
        rightStern,
        leftStern,
        leftQuarter,
        leftBow,
        leftDirection,
        rightDirection,
        turn,
      } = shape
      let points: Point[] = [
        head,
        rightBow,
        rightQuarter,
        rightStern,
        leftStern,
        leftQuarter,
        leftBow,
        head,
      ]

      if (this.orientation === 'left') {
        points = [leftDirection, turn, ...points, turn, leftDirection]
      } else if (this.orientation === 'right') {
        points = [rightDirection, turn, ...points, turn, rightDirection]
      } else if (this.orientation === 'straight') {
        points = [turn, ...points, turn]
      }

      const line: GeoJSON.Feature<GeoJSON.LineString, IAisShipOptions> =
        lineString<IAisShipOptions>(
          points.map((item) => this.context.map.unproject(item).toArray()),
        )

      let ship: GeoJSON.Feature<GeoJSON.Polygon, IAisShipOptions> = lineToPolygon(line, {
        properties: {
          ...this.options,
          updateStatus: this.updateStatus,
          outLine: true,
        },
      }) as GeoJSON.Feature<GeoJSON.Polygon, IAisShipOptions>

      ship = transformRotate<GeoJSON.Feature<GeoJSON.Polygon>>(ship, this.direction, {
        pivot: this.position().toArray(),
      }) as GeoJSON.Feature<GeoJSON.Polygon, IAisShipOptions>

      ship.id = this.id
      return ship
    }
  }

  override headingLine(): GeoJSON.Feature<GeoJSON.LineString | null, { meta: 'directionLine' }> {
    const head = rhumbDestination(
      this.position().toArray(),
      pixelsToMeters(this.context.map, this.position().toArray()[1], this.options.speed * 5),
      this.direction,
      {
        units: 'meters',
      },
    )

    const path: GeoJSON.Position[] = []
    if (this.orientation === 'left') {
      const turn = rhumbDestination(
        head,
        pixelsToMeters(this.context.map, this.position().toArray()[1], 10),
        this.direction - 90,
        {
          units: 'meters',
        },
      )
      path.push(this.position().toArray(), head.geometry.coordinates, turn.geometry.coordinates)
    } else if (this.orientation === 'right') {
      const turn = rhumbDestination(
        head,
        pixelsToMeters(this.context.map, this.position().toArray()[1], 10),
        this.direction + 90,
        {
          units: 'meters',
        },
      )
      path.push(this.position().toArray(), head.geometry.coordinates, turn.geometry.coordinates)
    } else if (this.orientation === 'straight') {
      path.push(this.position().toArray(), head.geometry.coordinates)
    }

    if (path.length === 0)
      return {
        type: 'Feature',
        geometry: null,
        id: String(this.id) + '-direction-line',
        properties: {
          meta: 'directionLine',
        },
      }

    return lineString(
      path,
      {
        meta: 'directionLine',
      },
      { id: String(this.id) + '-direction-line' },
    )
  }

  override render(): void {
    const bounds = this.context.map.getBounds()
    if (!bounds?.contains(this.position())) {
      this.tooltip?.hide()
      return
    }

    this.tooltip?.render()

    this.context.register.setGeoJSONData(this.SOURCE, [this.headingLine(), this.getFeature()])

    if (this.isFocus) {
      const icon = this.context.iconManage.getImage(this.getIconName())
      this.context.focus.set(this.getFeature(), {
        size: icon?.width,
        armLength: 10,
        padding: 10,
      })
    } else {
      this.context.focus.remove(String(this.id))
    }
  }
  override label(): HTMLElement {
    const id = `${String(this.id)}-ship-name-box`
    let shipNameBox = document.getElementById(id)
    if (shipNameBox) {
      return shipNameBox
    }

    shipNameBox = document.createElement('div')
    shipNameBox.id = id
    shipNameBox.classList.add('ship-name-box')

    const shipName = document.createElement('div')
    shipName.innerText = this.options.name
    shipName.classList.add('ship-name')

    shipNameBox.appendChild(shipName)

    return shipNameBox
  }
  override offset(): Point {
    const offset = new Point(0, 0)

    if (this.options.top && this.options.bottom && this.options.left && this.options.right) {
      const ey = distanceToPx(
        this.context.map,
        Math.abs(this.options.top - this.options.bottom) / 2,
      )
      const ex = distanceToPx(
        this.context.map,
        Math.abs(this.options.left - this.options.right) / 2,
      )

      offset.x = this.options.right > this.options.left ? ex : -ex
      offset.y = this.options.top > this.options.bottom ? ey : -ey
    }

    return offset
  }
}
