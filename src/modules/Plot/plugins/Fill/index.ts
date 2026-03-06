import { bbox, booleanPointInPolygon, centerOfMass, lineToPolygon } from '@turf/turf'
import type * as GeoJSON from 'geojson'
import type { Feature, Polygon } from 'geojson'
import type { Map } from 'mapbox-gl'
import { LngLat } from 'mapbox-gl'
import polylabel from 'polylabel'

import { FillResidentEvent } from '@/modules/Plot/plugins/Events/FillEvents.ts'
import { FillUpdateEvent } from '@/modules/Plot/plugins/Events/FillEvents.ts'
import { FillCreateEvent } from '@/modules/Plot/plugins/Events/FillEvents.ts'
import { IconPoint } from '@/modules/Plot/plugins/IconPoint'
import { Line } from '@/modules/Plot/plugins/Line'
import { Poi } from '@/modules/Plot/plugins/Poi.ts'
import { EMPTY_SOURCE, PLOT_SOURCE_NAME } from '@/modules/Plot/vars.ts'
import type { IFillOptions } from '@/types/Plot/Fill.ts'
import type { PlotType } from '@/types/Plot/Poi.ts'
import type { CirclePointStyle } from '@/types/Plot/Point.ts'

import { DEFAULT_FILL_COLOR, FILL_LAYER_NAME, LAYER_LIST, NAME } from './vars.ts'

export class Fill<T extends IFillOptions = IFillOptions> extends Poi<T, GeoJSON.Polygon | null> {
  static NAME: PlotType = NAME
  override readonly LAYER: string = FILL_LAYER_NAME
  public title: IconPoint | undefined
  public line: Line | null = null

  protected residentEvent: FillResidentEvent
  protected updateEvent: FillUpdateEvent
  protected createEvent: FillCreateEvent

  constructor(map: Map, options: T) {
    super(map, options)

    if (this.options.position) {
      this.options.position = [...this.options.position, this.options.position[0]]
    }

    this.residentEvent = new FillResidentEvent(map, this)
    this.updateEvent = new FillUpdateEvent(map, this)
    this.createEvent = new FillCreateEvent(map, this)

    this.createLine()

    this.residentEvent.able()
  }

  get center(): LngLat | null {
    if (!Array.isArray(this.options.position) || this.options.position.length === 0) {
      return null
    }

    if (this.geometry === null) return null

    const center = centerOfMass(this.getFeature())

    if (booleanPointInPolygon(center, this.getFeature() as GeoJSON.Feature<GeoJSON.Polygon>)) {
      const coordinates = center.geometry.coordinates
      return new LngLat(coordinates[0], coordinates[1])
    } else {
      const coordinates = this.options.position.map((item) => item.toArray())

      const [lng, lat]: number[] = polylabel([coordinates], 0.000001)
      return new LngLat(lng, lat)
    }
  }

  get geometry(): Polygon | null {
    return this.getFeature().geometry
  }

  getFeature(): Feature<Polygon | null, T['style'] & T['properties']> {
    if (
      this.line?.geometry &&
      Array.isArray(this.line.geometry.coordinates) &&
      this.line.geometry.coordinates.length > 2
    ) {
      const polygon = lineToPolygon(this.line.getFeature() as unknown as GeoJSON.LineString, {
        properties: {
          ...this.options.style,
          ...this.options.properties,
          visibility: this.options.visibility,
        },
      }) as Feature<Polygon | null, T['style'] & T['properties']>
      polygon.id = this.id
      return polygon
    } else {
      return {
        type: 'Feature',
        geometry: null,
        id: this.id,
        properties: {},
      }
    }
  }

  public override get id(): string {
    return this.options.id
  }

  move(position: LngLat): void {
    // 1. 确保有拖拽参考点和内部关联的 line 对象 如果不借助鼠标拖拽 直接移动以中心为基准点
    const drag: LngLat | null =
      this.center === null ? this.center : this.updateEvent.getDragLngLat()
    if (!this.line || !drag) return

    // 2. 计算当前鼠标所在的帧，相对于上一帧鼠标位置的经纬度偏移量 (Delta)
    const lngDiff = position.lng - drag.lng
    const latDiff = position.lat - drag.lat

    // 3. 借助底层 Line 实例，遍历并移动所有构成多边形的实点
    this.line.points.forEach((point, index) => {
      if (point.center) {
        const newPos = new LngLat(point.center.lng + lngDiff, point.center.lat + latDiff)

        // 🔥 核心思路：复用 Line 的 updatePoint
        // 传入 false 是为了防止在 for 循环中疯狂触发重绘，造成严重的性能问题
        this.line!.updatePoint(index, newPos, false)
      }
    })

    // 4. 同步最新坐标给 Fill 自身
    // (因为 line.updatePoint 内部已经更新了 line.options.position)
    this.options.position = this.line.options.position

    // 5. 触发真正的统一重绘
    this.render()
  }

  public createLine(): void {
    if (!Array.isArray(this.options.position)) return

    // 1. 提取 Fill 的颜色，如果没有设置则使用默认的主题色 #f00
    const fillColor = this.options.style?.['fill-color'] ?? DEFAULT_FILL_COLOR

    // 2. 组装边框线样式：颜色与 Fill 同步，并合并传入的 outLineStyle
    const lineStyle = {
      'line-color': fillColor,
      ...this.options.outLineStyle,
    }

    // 3. 组装实点样式：边框颜色与 Fill 同步，并合并传入的 vertexStyle
    const vertexStyle = {
      'circle-radius': 5,
      'circle-stroke-color': fillColor,
      // 'circle-color': '#fff', // 内部默认是白色，如果需要全实心也可以改成 fillColor
      ...this.options.vertexStyle,
    } as CirclePointStyle

    this.line = new Line(this.context.map, {
      isName: false,
      // midStyle: undefined,
      // name: '',
      position: this.options.position,
      properties: {},
      style: lineStyle,
      vertexStyle: vertexStyle,
      visibility: this.options.visibility,
      id: `${this.id}-line`,
    })

    this.line.points.at(-1)?.hide()
  }

  public removeLine(): void {
    this.line?.remove()
    this.line = null
  }

  override onAdd(): void {
    this.context.register.addSource(PLOT_SOURCE_NAME, EMPTY_SOURCE)

    LAYER_LIST.forEach((layer) => {
      this.context.register.addLayer(layer)
    })

    this.context.iconManage.addSvg({
      name: 'test',
      svg: '<svg t="1772630233838" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="7234" width="32" height="32"><path d="M683.287273 272.756364a20.48 20.48 0 0 0-23.272728-13.730909l-293.701818 41.658181a20.014545 20.014545 0 0 0-16.756363 14.196364L266.472727 584.145455a20.247273 20.247273 0 0 0 9.774546 23.272727l272.290909 147.316363a20.48 20.48 0 0 0 25.134545-4.18909l190.370909-210.85091a20.014545 20.014545 0 0 0 4.189091-20.48z m230.865454 251.578181l-130.327272-379.810909a43.054545 43.054545 0 0 0-46.545455-28.858181L284.625455 179.665455A43.287273 43.287273 0 0 0 249.250909 209.454545L121.716364 624.174545A43.752727 43.752727 0 0 0 142.429091 674.909091l417.512727 226.443636a43.985455 43.985455 0 0 0 52.829091-9.076363l292.538182-325.818182a43.985455 43.985455 0 0 0 8.843636-42.123637z m-77.730909 16.523637l-251.345454 279.272727a19.083636 19.083636 0 0 1-23.272728 4.189091L207.825455 631.854545a19.083636 19.083636 0 0 1-9.309091-23.272727l108.218181-351.883636a19.316364 19.316364 0 0 1 15.825455-13.498182L709.818182 189.207273a19.083636 19.083636 0 0 1 20.945454 12.8l109.381819 319.767272a19.083636 19.083636 0 0 1-3.723637 19.083637z" fill="#13227a" p-id="7235"></path></svg>',
    })
  }

  override onRemove(): void {
    this.remove()
  }

  remove(): void {
    this.options.position = []
    this.removeLine()
    this.render()
  }

  render(): void {
    if (this.line) {
      this.line.render()
      this.options.position = this.line.options.position
    }

    if (this.center) {
      this.title = new IconPoint(this.context.map, {
        icon: 'test',
        visibility: 'visible',
        id: this.id + '-fill-title-icon',
        position: this.center,
        name: this.options.name,
        isName: this.options.isName,
      })

      this.title.render()
    }

    if (this.isFocus) {
      this.context.focus.set(this.getFeature() as GeoJSON.Feature, {
        armLength: 40,
        padding: 30,
      })
    } else {
      this.context.focus.remove(this.id)
    }

    this.context.register.setGeoJSONData(PLOT_SOURCE_NAME, this.getFeature() as GeoJSON.Feature)
  }

  start(): void {
    if (this.center === null) {
      this.createEvent.able()
      this.updateEvent.disabled()
      this.residentEvent.disabled()
      this.setState({ create: true })
    }
  }

  stop(): void {
    this.createEvent.disabled()
    this.residentEvent.able()
    this.setState({ create: false })
  }

  unedit(): void {
    this.setState({ edit: false })
    this.line?.unedit()
    this.residentEvent.able()
    this.updateEvent.disabled()

    this.render()
  }

  edit(): void {
    this.setState({ edit: true })

    this.line?.edit()

    this.residentEvent.disabled()
    this.updateEvent.able()
    this.render()
  }

  focus(): void {
    this.setState({ focus: true })

    this.render()
  }

  unfocus(): void {
    this.setState({ focus: false })

    this.render()
  }

  select(): void {
    const bounds = bbox(this.getFeature() as GeoJSON.Feature) as [number, number, number, number]
    this.context.map.fitBounds(bounds, {
      padding: {
        left: 60,
        right: 60,
        top: 60,
        bottom: 60,
      },
    })

    this.context.map.once('moveend', () => {
      this.focus()
    })
  }

  unselect(): void {
    this.unfocus()
  }

  update(options: T): void {
    this.options = options

    if (this.options.position) {
      this.options.position = [...this.options.position, this.options.position[0]]
    }

    this.removeLine()
    this.createLine()
  }
}
