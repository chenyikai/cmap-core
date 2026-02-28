import { cloneDeep, set } from 'lodash-es'
import type { Map } from 'mapbox-gl'
import { LngLat } from 'mapbox-gl'

import { EventState } from '@/core/EventState'
import type { Line } from '@/modules/Plot/plugins/Line'
import type { Point } from '@/modules/Plot/plugins/Point'
import type { EventMessage } from '@/types/EventState'

export abstract class LineBaseEvent extends EventState {
  protected line: Line

  protected constructor(map: Map, line: Line) {
    super(map)

    this.line = line
  }

  public abstract override onAdd(): void

  public abstract override onRemove(): void

  public abstract override able(): void

  public abstract override disabled(): void
}

export class LineCreateEvent extends LineBaseEvent {
  constructor(map: Map, line: Line) {
    super(map, line)
  }

  public override onAdd(): void {
    /* empty */
  }
  public override onRemove(): void {
    /* empty */
  }

  public override able(): void {
    this.changeStatus()
  }
  public override disabled(): void {
    this.changeStatus()
  }
}

export class LineUpdateEvent extends LineBaseEvent {
  private onVertexUpdate = (e: EventMessage<Point>): void => {
    const current = e.instance
    const { index } = current.options.properties ?? {}
    const positions = this.line.options.position

    if (!positions || typeof index !== 'number' || !current.center) return

    set(positions, index, current.center)

    // targetVertexIdx: 相邻顶点的索引
    // targetMidIdx: 需要更新的中点索引
    const updateMidpoint = (targetVertexIdx: number, targetMidIdx: number): void => {
      const targetVertex = this.line.getPoint(targetVertexIdx)
      if (targetVertex?.center) {
        const lng = (current.center!.lng + targetVertex.center.lng) / 2
        const lat = (current.center!.lat + targetVertex.center.lat) / 2
        this.line.getMidPoint(targetMidIdx)?.move(new LngLat(lng, lat))
      }
    }

    if (index < positions.length - 1) {
      updateMidpoint(index + 1, index)
    }

    if (index > 0) {
      updateMidpoint(index - 1, index - 1)
    }

    this.line.render()
  }

  private onMidBeforeUpdate = (e: EventMessage<Point>): void => {
    this.line.modifyMid = e.instance
  }

  private onMidUpdate = (e: EventMessage<Point>): void => {
    const { index } = e.instance.options.properties ?? {}
    const { position } = cloneDeep(this.line.options)
    if (position && typeof index === 'number' && e.instance.center) {
      this.line.render()
    }
  }

  private onMidDone = (): void => {
    if (this.line.geometry?.coordinates) {
      const lonLat = this.line.geometry.coordinates
      const position = lonLat.map((item) => new LngLat(item[0], item[1]))

      this.line.modifyMid = null
      this.line.update({
        ...this.line.options,
        position,
      })

      this.line.points.forEach((point) => {
        point.edit()
      })
      this.line.midPoints.forEach((mid) => {
        mid.edit()
      })
      this.able()
    }
  }

  constructor(map: Map, line: Line) {
    super(map, line)
  }

  public override onAdd(): void {
    /* empty */
  }

  public override onRemove(): void {
    this.disabled()
  }

  // public updateMidPoint(index: number): void {}

  public override able(): void {
    this.line.points.forEach((point) => {
      point.on('Point.update', this.onVertexUpdate)
    })
    this.line.midPoints.forEach((mid) => {
      mid.on('Point.beforeUpdate', this.onMidBeforeUpdate)
      mid.on('Point.update', this.onMidUpdate)
      mid.on('Point.doneUpdate', this.onMidDone)
    })
    this.changeStatus()
  }

  public override disabled(): void {
    this.line.points.forEach((point) => {
      point.off('Point.update', this.onVertexUpdate)
    })
    this.line.midPoints.forEach((mid) => {
      mid.off('Point.beforeUpdate', this.onMidBeforeUpdate)
      mid.off('Point.update', this.onMidUpdate)
      mid.off('Point.doneUpdate', this.onMidDone)
    })
    this.changeStatus()
  }
}

export class LineResidentEvent extends LineBaseEvent {
  constructor(map: Map, line: Line) {
    super(map, line)
  }

  public override onAdd(): void {
    // this.on()
  }

  public override onRemove(): void {
    throw new Error('Method not implemented.')
  }

  public override able(): void {
    this.changeStatus()
  }

  public override disabled(): void {
    this.changeStatus()
  }
}
