import { along, length, lineString } from '@turf/turf'
import type * as GeoJSON from 'geojson'
import type { Map } from 'mapbox-gl'
import { LngLat } from 'mapbox-gl'

import {
  LineCreateEvent,
  LineResidentEvent,
  LineUpdateEvent,
} from '@/modules/Plot/plugins/Events/LineEvents.ts'
import { Poi } from '@/modules/Plot/plugins/Poi.ts'
import { Point } from '@/modules/Plot/plugins/Point'
import { EMPTY_SOURCE, PLOT_SOURCE_NAME } from '@/modules/Plot/vars.ts'
import type { ILineOptions } from '@/types/Plot/Line.ts'
import { PointType } from '@/types/Plot/Line.ts'
import type { PlotType } from '@/types/Plot/Poi.ts'

import { LAYER_LIST, LINE_LAYER_NAME, NAME } from './vars.ts'

export class Line extends Poi<ILineOptions, GeoJSON.LineString | null> {
  static NAME: PlotType = NAME
  override readonly LAYER: string = LINE_LAYER_NAME

  public points: Point[] = []
  public midPoints: Point[] = []

  public modifyMid: Point | null | undefined

  public drawPoint: LngLat | null = null

  protected residentEvent: LineResidentEvent
  protected updateEvent: LineUpdateEvent
  protected createEvent: LineCreateEvent

  constructor(map: Map, options: ILineOptions) {
    super(map, options)

    this.residentEvent = new LineResidentEvent(map, this)
    this.updateEvent = new LineUpdateEvent(map, this)
    this.createEvent = new LineCreateEvent(map, this)

    this.createPoint()
  }

  public createPoint(): void {
    const positions = this.options.position ?? []

    for (let i = 0; i < positions.length; i++) {
      const current = positions[i]

      const vertex = new Point(this.context.map, {
        id: `${this.id}-node-${String(i)}`, // 建议 ID 加上 node 标识
        isName: false,
        visibility: 'visible',
        position: current,
        style: this.options.vertexStyle,
        properties: {
          id: `${this.id}-node-${String(i)}`,
          index: i,
          type: PointType.VERTEX, // 标记类型，方便点击事件区分
        },
      })
      this.points.push(vertex)

      if (i < positions.length - 1) {
        const next = positions[i + 1]

        const midLng = (current.lng + next.lng) / 2
        const midLat = (current.lat + next.lat) / 2
        const midPos = new LngLat(midLng, midLat)

        const mid = new Point(this.context.map, {
          id: `${this.id}-mid-${String(i)}`, // 建议 ID 加上 mid 标识
          isName: false,
          visibility: 'visible',
          position: midPos,
          style: this.options.midStyle,
          properties: {
            id: `${this.id}-mid-${String(i)}`, // 建议 ID 加上 mid 标识
            index: i, // 这里的 index 代表它是第几段线上的中点
            type: PointType.MIDPOINT,
          },
        })
        this.midPoints.push(mid)
      }
    }
  }

  public removePoint(): void {
    this.points.forEach((point) => {
      point.remove()
    })
    this.points = []
    this.midPoints.forEach((mid) => {
      mid.remove()
    })
    this.midPoints = []
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
  public override get center(): LngLat | null {
    if (!Array.isArray(this.options.position) || this.options.position.length === 0) {
      return null
    }

    const feature = this.getFeature() as GeoJSON.Feature<GeoJSON.LineString>
    const distance = length(feature)
    const coordinates = along(feature, distance / 2).geometry.coordinates

    return new LngLat(coordinates[0], coordinates[1])
  }
  public override get geometry(): GeoJSON.LineString | null {
    return this.getFeature().geometry
  }
  public override getFeature(): GeoJSON.Feature<
    GeoJSON.LineString | null,
    ILineOptions['style'] | ILineOptions['properties']
  > {
    if ((!this.options.position || this.options.position.length < 2) && !this.drawPoint) {
      const emptyFeature: GeoJSON.Feature<
        null,
        ILineOptions['style'] | ILineOptions['properties']
      > = {
        type: 'Feature',
        geometry: null,
        id: this.id,
        properties: {},
      }
      return emptyFeature
    }

    const coordinates = this.points.map((point) => {
      if (point.center) {
        return point.center.toArray()
      } else {
        return []
      }
    })

    if (this.modifyMid) {
      const { index } = this.modifyMid.options.properties ?? {}
      if (typeof index === 'number' && this.modifyMid.center) {
        coordinates.splice(index + 1, 0, this.modifyMid.center.toArray())
      }
    }

    if (this.drawPoint) {
      coordinates.push(this.drawPoint.toArray())
    }

    return lineString(
      coordinates,
      {
        ...this.options.properties,
        ...this.options.style,
        visibility: this.options.visibility,
      },
      {
        id: this.id,
      },
    )
  }
  public override start(): void {
    if (this.center === null) {
      this.createEvent.able()
      this.updateEvent.disabled()
      this.residentEvent.disabled()
    }
  }
  public override stop(): void {
    this.createEvent.disabled()
    this.residentEvent.able()
  }

  public override show(): void {
    this.points.forEach((point) => {
      point.show()
    })
    this.midPoints.forEach((mid) => {
      mid.show()
    })

    super.show()
  }

  public override hide(): void {
    this.points.forEach((point) => {
      point.hide()
    })
    this.midPoints.forEach((mid) => {
      mid.hide()
    })

    super.hide()
  }

  public override edit(): void {
    this.setState({ edit: true })

    this.points.forEach((point) => {
      point.edit()
    })

    this.midPoints.forEach((midPoint) => {
      midPoint.edit()
    })

    this.residentEvent.disabled()
    this.updateEvent.able()

    this.render()
  }

  public override unedit(): void {
    this.setState({ edit: false })
    this.points.forEach((point) => {
      point.unedit()
    })
    this.midPoints.forEach((midPoint) => {
      midPoint.unedit()
    })

    this.residentEvent.able()
    this.updateEvent.disabled()

    this.render()
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
  public override move(position: LngLat): void {
    console.log(position, 'position')
    // if (!this.center) return
    // const dir = bearing(this.center.toArray(), position.toArray())
    // const dir = bearing(
    //   new LngLat(122.09860659512042, 30.004767949301183).toArray(),
    //   position.toArray(),
    // )
    //
    // console.log(dir, 'dirdadkajk')
  }
  public override update(options: ILineOptions): void {
    this.options = options
    this.removePoint()
    this.createPoint()
    this.render()
  }
  public override remove(): void {
    throw new Error('Method not implemented.')
  }
  public override render(): void {
    this.points.map((point) => {
      point.render()
    })

    if (this.isEdit) {
      this.midPoints.map((minPoint) => {
        minPoint.render()
      })
    }
    this.context.register.setGeoJSONData(PLOT_SOURCE_NAME, this.getFeature() as GeoJSON.Feature)
  }

  public getMidPoint(index: number): Point | null {
    if (this.midPoints.length === 0) return null

    const data = this.midPoints[index]
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!data) return null

    if (Number(data.options.properties?.index) === index) {
      return data
    } else {
      return null
    }
  }

  public getPoint(index: number): Point | null {
    if (this.points.length === 0) return null

    const data = this.points[index]
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!data) return null

    if (Number(data.options.properties?.index) === index) {
      return data
    } else {
      return null
    }
  }
}
