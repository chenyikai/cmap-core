import { Module } from 'cmap-core'
import type { Map } from 'mapbox-gl'
import { at, type Demo } from '../shared/demo'

class SensorModule extends Module {
  constructor(map: Map) {
    super(map)
  }
  override onAdd(): void {
    // super() invokes onAdd(); do not read fields initialized by the subclass here.
    this.context.register.addSource('demo-sensor', {
      type: 'geojson',
      dynamic: true,
      data: { type: 'FeatureCollection', features: [] },
    })
    this.context.register.addLayer({
      zIndex: 15,
      layer: {
        id: 'demo-sensor-layer',
        source: 'demo-sensor',
        type: 'circle',
        paint: { 'circle-radius': 16, 'circle-color': '#168a97' },
      },
    })
  }
  draw(): void {
    this.context.register.setGeoJSONData('demo-sensor', {
      type: 'Feature',
      id: 'sensor-1',
      properties: { id: 'sensor-1' },
      geometry: { type: 'Point', coordinates: at(0, 0).toArray() },
    })
  }
  override onRemove(): void {
    this.context.register.removeSource('demo-sensor')
  }
}

const mount: Demo = (ctx) => {
  const module = new SensorModule(ctx.map)
  module.draw()
  ctx.cleanup(() => module.destroy())
  ctx.log(
    '自定义 SensorModule 已通过共享 ResourceRegister 注册资源。页面离开时 destroy() 清理自有 source 和 layer。',
  )
}
export default mount
