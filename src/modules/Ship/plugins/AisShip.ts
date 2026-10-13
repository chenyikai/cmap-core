import { lineString, lineToPolygon, point, rhumbDestination, transformRotate } from '@turf/turf'
import dayjs from 'dayjs'
import type * as GeoJSON from 'geojson'
import type { LngLat, Map } from 'mapbox-gl'
import { MercatorCoordinate, Point } from 'mapbox-gl'

import { Tooltip } from '@/core/Tooltip/index.ts'
import { BaseShip } from '@/modules/Ship/BaseShip.ts'
import { LAYER_LIST, NAME, SHIP_SOURCE_NAME, UPDATE_STATUS } from '@/modules/Ship/vars.ts'
import type { IAisShipOptions } from '@/types/Ship/AisShip.ts'
import type { Orientation, Shape } from '@/types/Ship/BaseShip'
import { distanceToPx, pixelsToMeters } from '@/utils/util.ts'

export class AisShip extends BaseShip<IAisShipOptions> {
  private nameTooltip: Tooltip | null = null
  private removed = false
  private pendingFocus: (() => void) | null = null
  private renderKey: string | null = null
  private focusVisible = false
  override readonly SOURCE: string = SHIP_SOURCE_NAME
  static override NAME: string = NAME

  constructor(map: Map, options: IAisShipOptions) {
    super(map, options)

    if (this.options.tooltip) this.createNameTooltip()
  }

  private createNameTooltip(): void {
    const targetRadius = this.labelTargetRadius()
    this.nameTooltip = new Tooltip(this.context.map, {
      id: this.id,
      position: this.position(),
      className: 'mapbox-gl-ship-name-tooltip',
      offsetX: 5,
      offsetY: Math.max(25, targetRadius + 4),
      text: this.options.name,
      theme: 'ship',
      collision: true,
      targetRadius,
      anchor: 'bottom-right',
      line: true,
      visible: true,
    })
    this.tooltip = this.nameTooltip
  }

  public override onAdd(): void {
    this.context.register.addSource(SHIP_SOURCE_NAME, {
      type: 'geojson',
      // dynamic: true,
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
    this.remove()
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
    const shape = this.geographicShape()
    if (!shape) return null
    return Object.fromEntries(
      Object.entries(shape).map(([key, position]) => [key, this.context.map.project(position)]),
    ) as unknown as Shape
  }

  /** Build the hull in local metre coordinates, independent of the camera bearing/pitch. */
  private geographicShape(): Record<keyof Shape, LngLat> | null {
    if (this.options.width && this.options.height) {
      const position = this.position()
      const center = MercatorCoordinate.fromLngLat(position)
      const units = center.meterInMercatorCoordinateUnits()
      const ex = this.options.width / 2
      const ey = this.options.height / 2
      const coordinate = (x: number, y: number): LngLat =>
        new MercatorCoordinate(center.x + x * units, center.y + y * units).toLngLat()
      // Preserve the existing short turn decoration, separately from headingLine().
      const turn = pixelsToMeters(this.context.map, position.lat, this.options.speed * 3)

      return {
        leftDirection: coordinate(-ex, -ey * 2),
        rightDirection: coordinate(ex, -ey * 2),
        turn: coordinate(0, -ey - turn),
        head: coordinate(0, -ey),
        rightBow: coordinate(ex, -ey * 0.5),
        rightQuarter: coordinate(ex, ey * 0.85),
        rightStern: coordinate(ex * 0.7, ey),
        leftStern: coordinate(-ex * 0.7, ey),
        leftQuarter: coordinate(-ex, ey * 0.85),
        leftBow: coordinate(-ex, -ey * 0.5),
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
    if (this.removed) return
    this.removed = true
    this.cancelSelection()
    this.detachLifecycle()
    this.removeTooltip()
    // Mapbox fires remove after disposing its style and canvas. Only release local handles then.
    if (this.mapRemoved) return
    if (this.focusVisible) {
      this.context.focus.remove(String(this.id))
      this.focusVisible = false
    }
    this.context.map.removeFeatureState({ source: this.SOURCE, id: this.id })

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
    if (this.removed) return
    if (this.tooltip && this.tooltip !== tooltip) this.tooltip.remove()
    this.nameTooltip = null
    this.tooltip = tooltip
    this.renderKey = null
  }

  override removeTooltip(): void {
    this.tooltip?.remove()
    this.tooltip = null
    this.nameTooltip = null
    this.renderKey = null
  }

  override update(options: IAisShipOptions): void {
    if (this.removed || this.mapRemoved) return
    const tooltipChanged = !!this.options.tooltip !== !!options.tooltip
    this.options = options
    if (tooltipChanged) {
      if (this.nameTooltip && !options.tooltip) this.removeTooltip()
      else if (options.tooltip && !this.tooltip) this.createNameTooltip()
    }
    if (this.currentRenderKey() !== this.renderKey) this.render()
  }

  override select(): void {
    if (this.removed || this.mapRemoved) return
    this.cancelSelection()
    this.context.map.stop()
    const focus = (): void => {
      if (this.pendingFocus !== focus) return
      this.cancelSelection()
      this.focus()
    }
    this.pendingFocus = focus
    this.context.map.once('moveend', focus)
    this.context.map.flyTo({
      center: this.position(),
      zoom: 16,
    })

    if (!this.context.map.isMoving()) focus()
  }

  private cancelSelection(): void {
    if (!this.pendingFocus) return
    this.context.map.off('moveend', this.pendingFocus)
    this.pendingFocus = null
  }
  override unselect(): void {
    this.unfocus()
  }

  override focus(): void {
    if (this.removed || this.mapRemoved) return
    this.cancelSelection()
    this.setState({ focus: true })

    this.render()
  }
  override unfocus(): void {
    this.cancelSelection()
    if (this.removed || this.mapRemoved) return
    this.setState({ focus: false })

    this.render()
  }
  override icon(): GeoJSON.Feature<GeoJSON.Point, IAisShipOptions> {
    return point<IAisShipOptions>(
      this.position().toArray(),
      {
        ...this.options,
        id: this.options.id,
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
    const shape = this.geographicShape()

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
      let points: LngLat[] = [
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
        lineString<IAisShipOptions>(points.map((item) => item.toArray()))

      let ship: GeoJSON.Feature<GeoJSON.Polygon, IAisShipOptions> = lineToPolygon(line, {
        properties: {
          ...this.options,
          id: this.options.id,
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

  override headingLine(): GeoJSON.Feature<
    GeoJSON.LineString | null,
    { meta: 'directionLine'; 'line-color': string }
  > {
    const head = rhumbDestination(
      this.position().toArray(),
      // pixelsToMeters(this.context.map, this.position().toArray()[1], this.options.speed * 92.52),
      this.options.speed * 92.52,
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
          'line-color': '#f00',
        },
      }

    return lineString(
      path,
      {
        meta: 'directionLine',
        'line-color': this.isFocus || this.isHover ? '#f00' : '#000',
      },
      { id: String(this.id) + '-direction-line' },
    )
  }

  private currentRenderKey(): string {
    // Compare values, not object references: callers often recreate unchanged AIS records.
    return JSON.stringify([
      this.options,
      this.context.map.getZoom(),
      this.updateStatus,
      this.isHover,
      this.isFocus,
      // Legacy offset/heading calculations use the map-center latitude.
      this.context.map.getCenter().lat,
    ])
  }

  override render(): void {
    if (this.removed || this.mapRemoved) return
    const key = this.currentRenderKey()
    // Text and position updates reuse the label and its cached bitmap.
    if (this.tooltip) {
      const position = this.position()
      const changedText =
        this.tooltip === this.nameTooltip && this.tooltip.options.text !== this.options.name
      const targetRadius = this.labelTargetRadius()
      this.tooltip.update({
        position,
        ...(this.tooltip === this.nameTooltip
          ? { targetRadius, offsetY: Math.max(25, targetRadius + 4) }
          : {}),
        ...(changedText ? { text: this.options.name } : {}),
      })
    }
    // Keep geometry in sync even offscreen; Mapbox performs viewport culling itself.
    // Otherwise panning reveals a Tooltip whose ship feature was never submitted.
    const feature = this.getFeature()
    this.context.register.setGeoJSONData(this.SOURCE, [this.headingLine(), feature])

    if (this.isFocus) {
      const icon = this.context.iconManage.getImage(this.getIconName())
      this.context.focus.set(
        { ...feature, id: String(this.id) },
        {
          size: icon?.width,
          armLength: 10,
          padding: 10,
        },
      )
      this.focusVisible = true
    } else if (this.focusVisible) {
      this.context.focus.remove(String(this.id))
      this.focusVisible = false
    }
    this.renderKey = key
  }

  /** Protect the ship body/icon during label layout; independent of its heading line. */
  private labelTargetRadius(): number {
    const zoom = this.context.map.getZoom()
    if (zoom >= (this.options.realZoom ?? 16) && this.options.width && this.options.height) {
      return distanceToPx(this.context.map, Math.hypot(this.options.width, this.options.height)) / 2
    }
    const image = this.context.iconManage.getImage(this.getIconName())
    // The built-in AIS triangle is 33 x 49; custom registered images use their actual size.
    const width = image?.width ?? 33
    const height = image?.height ?? 49
    const min = this.options.minIconSize ?? 0.2
    const max = this.options.maxIconSize ?? 0.5
    const scale = min + (max - min) * Math.max(0, Math.min(1, zoom / 19))
    return (Math.hypot(width, height) * scale) / 2
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
