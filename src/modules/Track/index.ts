import { bearing, lineString, point } from '@turf/turf'
import dayjs from 'dayjs'
import type * as GeoJSON from 'geojson'
import type { Map as MapboxglMap, MapMouseEvent } from 'mapbox-gl'
import { LngLat } from 'mapbox-gl'

import { EventState } from '@/core/EventState'
import { Module } from '@/core/Module'
import { Tooltip } from '@/core/Tooltip'
import type { ITrackOptions, TrackItem, TrackItemWithLabel } from '@/types/Track'
import { TooltipType } from '@/types/Track'

import {
  ARROW_ICON,
  ARROW_ICON_NAME,
  END_ICON,
  END_ICON_NAME,
  LAYER_LIST,
  NORMAL_ICON,
  NORMAL_ICON_NAME,
  START_ICON,
  START_ICON_NAME,
  TRACK_ICON_LAYER_NAME,
  TRACK_SOURCE_NAME,
} from './vars.ts'

export class TrackEvent extends EventState {
  protected hoverId: string | null | undefined = null
  protected hoverPointId: string | null | undefined = null
  protected track: Track

  protected _move: (e: MapMouseEvent) => void = (): void => {
    /* empty */
  }
  protected _leave: OmitThisParameter<(e: MapMouseEvent) => void> = (): void => {
    /* empty */
  }
  protected _moveEnd = (): void => {
    /* empty */
  }

  constructor(map: MapboxglMap, track: Track) {
    super(map)

    this.track = track
    this._move = this.onMove.bind(this)
    this._leave = this.onLeave.bind(this)
    this._moveEnd = this.onMoveEnd.bind(this)
    this.enabled()
  }

  public override disabled(): void {
    this.context.map.off('mousemove', TRACK_ICON_LAYER_NAME, this._move)
    this.context.map.off('mouseleave', TRACK_ICON_LAYER_NAME, this._leave)
    this.context.map.off('moveend', this._moveEnd)
    this.status = EventState.OFF
  }

  public override enabled(): void {
    if (this.status === EventState.ON) return
    this.context.map.on('mousemove', TRACK_ICON_LAYER_NAME, this._move)
    this.context.map.on('mouseleave', TRACK_ICON_LAYER_NAME, this._leave)
    this.context.map.on('moveend', this._moveEnd)
    this.status = EventState.ON
  }

  onAdd(): void {
    // Bind only after subclass fields have been initialized.
  }

  onRemove(): void {
    this.disabled()
  }

  onMoveEnd(): void {
    this.track.refreshForZoom()
  }

  onMove(e: MapMouseEvent): void {
    if (e.features?.length) {
      this.context.map.getCanvasContainer().style.cursor = 'pointer'

      const props = e.features[0].properties as { trackId?: string; pId?: string } | null
      if (!props?.trackId || !props.pId) return
      if (this.hoverId === props.trackId && this.hoverPointId === props.pId) return

      if (this.hoverId) {
        this.unhover()
      }

      this.hoverId = props.trackId
      this.hoverPointId = props.pId
      this.hover()
    }
  }

  onLeave(): void {
    this.unhover()
    this.hoverId = null
    this.hoverPointId = null
    this.context.map.getCanvasContainer().style.cursor = ''
  }

  hover(): void {
    if (!this.hoverId) return

    const tracks = this.track.trackData.get(this.hoverId)
    const track = tracks?.find((item) => item.pId === this.hoverPointId)

    const eventName = 'track-hover'
    this.context.events.emit(eventName, track)
    this.context.map.fire(eventName, track)
  }

  unhover(): void {
    if (!this.hoverId) return

    const tracks = this.track.trackData.get(this.hoverId)
    const track = tracks?.find((item) => item.pId === this.hoverPointId)

    const eventName = 'track-unhover'
    this.context.events.emit(eventName, track)
    this.context.map.fire(eventName, track)
  }
}

export class Track extends Module {
  public options: ITrackOptions
  public trackData = new Map<TrackItem['id'], TrackItemWithLabel[]>()
  private tooltips = new Map<string, Tooltip>()
  private renderedZoom?: number
  private event: TrackEvent

  constructor(map: MapboxglMap, options: ITrackOptions) {
    super(map)

    this.options = options
    this.event = new TrackEvent(map, this)
  }

  override onAdd(): void {
    this.context.register.addSource(TRACK_SOURCE_NAME, {
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

    this.context.iconManage.loadSvg([
      {
        name: START_ICON_NAME,
        svg: START_ICON,
      },
      {
        name: END_ICON_NAME,
        svg: END_ICON,
      },
      {
        name: ARROW_ICON_NAME,
        svg: ARROW_ICON,
      },
      {
        name: NORMAL_ICON_NAME,
        svg: NORMAL_ICON,
      },
    ])
  }

  override onRemove(): void {
    this.removeAllTooltip()
    this.event.destroy()
  }

  load(items: TrackItem[]): void {
    if (items.length === 0) return
    const id = items[0].id

    // 按照时间升序排列
    const sorts = items
      .filter((item) => item.id === id)
      .sort((a, b) => a.time.getTime() - b.time.getTime())

    this.trackData.set(id, this.markItem(sorts))
  }

  remove(): void {
    this.removeAllTooltip()
    const removed = this.getFeature().map((feature) => ({ ...feature, geometry: null }))
    this.trackData.clear()
    this.context.register.setGeoJSONData(TRACK_SOURCE_NAME, removed)
  }

  private markItem(items: TrackItem[]): TrackItemWithLabel[] {
    if (items.length === 0) return []

    const result: TrackItemWithLabel[] = items.map((item) => ({
      ...item,
      visible: true,
      type: TooltipType.NORMAL,
    }))

    result[0].type = TooltipType.START_END
    result[result.length - 1].type = TooltipType.START_END

    let lastTimeAnchor = result[0].time.getTime()

    for (let i = 1; i < result.length - 1; i++) {
      const prev = result[i - 1]
      const cur = result[i]
      const next = result[i + 1]

      // 2. 计算航向变化

      let prevCog = prev.cog
      prevCog ??= bearing(prev.position.toArray(), cur.position.toArray())

      let curCog = cur.cog
      curCog ??= bearing(cur.position.toArray(), next.position.toArray())

      const angleDiff = Math.abs(curCog - prevCog)
      const normalizedDiff = angleDiff > 180 ? 360 - angleDiff : angleDiff

      // 3. 标记急转弯 (> 25度)
      if (normalizedDiff > 25) {
        cur.type = Math.min(cur.type, TooltipType.SHARP_TURN)
      }

      // 4. 标记启停变化 (速度 < 0.5 视为静止)
      const isPrevStopped = prevCog < 0.5
      const isCurrStopped = curCog < 0.5
      if (isPrevStopped !== isCurrStopped) {
        cur.type = Math.min(cur.type, TooltipType.STOP_GO)
      }

      // 5. 标记时间锚点 (例如：距离上一个标记点超过 30 分钟)
      // 只有当它不是其他重要类型时才标记，避免冗余
      if (cur.type === TooltipType.NORMAL) {
        const timeDiff = cur.time.getTime() - lastTimeAnchor
        // 30分钟 = 1800000ms
        if (timeDiff > 1800000) {
          cur.type = TooltipType.TIME_ANCHOR
          lastTimeAnchor = cur.time.getTime()
        }
      } else {
        // 如果当前已经是重要点位，重置时间锚点计时
        lastTimeAnchor = cur.time.getTime()
      }
    }

    return result
  }

  private simplifyTrackBySlope(
    track: TrackItemWithLabel[],
    angleThreshold = 2,
  ): TrackItemWithLabel[] {
    if (track.length <= 2) return track

    const simplified: TrackItemWithLabel[] = [track[0]] // 始终保留起点
    let lastPoint = track[0]

    for (let i = 1; i < track.length - 1; i++) {
      const currentPoint = track[i]
      const nextPoint = track[i + 1]

      const bearing1 = bearing(lastPoint.position.toArray(), currentPoint.position.toArray())
      const bearing2 = bearing(currentPoint.position.toArray(), nextPoint.position.toArray())

      let diff = Math.abs(bearing1 - bearing2)
      if (diff > 180) diff = 360 - diff

      if (diff > angleThreshold) {
        simplified.push(currentPoint)
        lastPoint = currentPoint // 更新基准点
      }
    }

    simplified.push(track[track.length - 1])

    return simplified
  }

  private simplifyTrackByZoom(track: TrackItemWithLabel[], zoom: number): TrackItemWithLabel[] {
    let threshold = 0

    if (zoom < 8) threshold = 10
    else if (zoom < 10) threshold = 5
    else if (zoom < 13) threshold = 2
    else if (zoom < 16) threshold = 1
    else threshold = 0 // 高层级保留所有点

    if (threshold === 0 || track.length < 10) return track

    return this.simplifyTrackBySlope(track, threshold)
  }

  getFeature(): GeoJSON.Feature[] {
    const features: GeoJSON.Feature[] = []
    for (const id of this.trackData.keys()) {
      const items = this.trackData.get(id)
      if (items) {
        const list = this.simplifyTrackByZoom(items, this.context.map.getZoom())
        const sortedItems = [...list].sort((a, b) => a.time.getTime() - b.time.getTime())
        const length = sortedItems.length

        const coordinates = sortedItems.map((item) => item.position.toArray())
        const latestItem = sortedItems[length - 1]
        const properties = {
          id,
          startTime: sortedItems[0].time.getTime(), // 开始时间
          endTime: latestItem.time.getTime(), // 结束时间
          count: items.length, // 点数量
        }

        sortedItems.forEach((item, index) => {
          let icon = NORMAL_ICON_NAME
          let iconSize = 0.2
          if (index === 0) {
            icon = START_ICON_NAME
            iconSize = 0.4
          } else if (index === length - 1) {
            icon = END_ICON_NAME
            iconSize = 0.4
          }

          features.push(
            point(
              item.position.toArray(),
              {
                ...item,
                id: item.pId,
                trackId: id,
                icon,
                iconSize,
                isStartEnd: index === 0 || index === length - 1,
                time: new Date(item.time).getTime(),
              },
              { id: item.pId },
            ),
          )
        })

        features.push(lineString(coordinates, properties, { id }))
      }
    }

    return features
  }

  private syncTooltips(features: GeoJSON.Feature[]): void {
    const next = new Set<string>()
    for (const feature of features) {
      if (feature.geometry.type !== 'Point') continue
      const id = String(feature.id)
      next.add(id)
      const position = new LngLat(feature.geometry.coordinates[0], feature.geometry.coordinates[1])
      const time = Number(feature.properties?.time)
      const text = dayjs(time).format('YYYY-MM-DD HH:mm:ss')
      const tooltip = this.tooltips.get(id)
      if (tooltip) {
        tooltip.update({
          position,
          ...(tooltip.options.text !== text ? { text } : {}),
        })
      } else {
        this.tooltips.set(
          id,
          new Tooltip(this.context.map, {
            id,
            position,
            text,
            theme: 'track',
            collision: true,
            className: 'mapbox-gl-track-name-tooltip',
            offsetX: 5,
            offsetY: 25,
            anchor: 'bottom-right',
          }),
        )
      }
    }
    for (const [id, tooltip] of this.tooltips) {
      if (!next.has(id)) {
        tooltip.remove()
        this.tooltips.delete(id)
      }
    }
  }

  private removeAllTooltip(): void {
    this.tooltips.forEach((tooltip) => {
      tooltip.remove()
    })
    this.tooltips.clear()
  }

  refreshForZoom(): void {
    if (this.renderedZoom !== this.context.map.getZoom()) this.render()
  }

  render(): void {
    this.renderedZoom = this.context.map.getZoom()
    const features = this.getFeature()
    this.syncTooltips(features)
    this.context.register.setGeoJSONData(TRACK_SOURCE_NAME, features)
  }
}
