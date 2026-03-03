import type { Map } from 'mapbox-gl'
import { LngLat } from 'mapbox-gl'

import { IndexPoint } from '@/modules/Plot/plugins/IndexPoint'
import { Line } from '@/modules/Plot/plugins/Line'
import { Point } from '@/modules/Plot/plugins/Point'
import type { IIndexLineOptions } from '@/types/Plot/IndexLine.ts'
import { PointType } from '@/types/Plot/Line.ts'

export class IndexLine extends Line<IIndexLineOptions> {
  constructor(map: Map, options: IIndexLineOptions) {
    super(map, options)
  }

  public override createPoint(): void {
    const positions = this.options.position ?? []

    for (let i = 0; i < positions.length; i++) {
      const current = positions[i]

      const vertex = new IndexPoint(this.context.map, {
        id: `${this.id}-node-${String(i)}`, // 建议 ID 加上 node 标识
        isName: false,
        visibility: 'visible',
        position: current,
        style: this.options.vertexStyle,
        index: i + 1,
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
}
