// import { circle as createCircle } from '@turf/turf'
// import type * as GeoJSON from 'geojson'
// import type { Feature, Polygon } from 'geojson'
// import type { Map } from 'mapbox-gl'
// import { LngLat } from 'mapbox-gl'
//
// import { Poi } from '@/modules/Plot/plugins/Poi.ts'
// import { Point } from '@/modules/Plot/plugins/Point'
// import { EMPTY_SOURCE, PLOT_SOURCE_NAME } from '@/modules/Plot/vars.ts'
// import type { ICircleOptions } from '@/types/Plot/Circle.ts'
// import type { PlotType } from '@/types/Plot/Poi.ts'
//
// import { LAYER_LIST, NAME } from './vars.ts'
//
// export class Circle extends Poi<ICircleOptions, GeoJSON.Polygon | null> {
//   static NAME: PlotType = NAME
//   override readonly LAYER: string = ''
//
//   constructor(map: Map, options: ICircleOptions) {
//     super(map, options)
//   }
//
//   get center(): LngLat | null {
//     if (!this.options.center) return null
//
//     return this.options.center
//   }
//
//   edit(): void {}
//
//   focus(): void {}
//
//   get geometry(): Polygon | null {
//     return this.getFeature().geometry
//   }
//
//   getFeature(): Feature<Polygon | null> {
//     if (this.center === null || this.options.radius === undefined) {
//       return {
//         type: 'Feature',
//         geometry: null,
//         id: this.id,
//         properties: {},
//       }
//     }
//
//     // TODO 需要做单位转换
//     const radius = this.options.radius
//     const feature = createCircle(this.center.toArray(), radius, {
//       units: this.options.unit,
//       properties: {
//         ...this.options.style,
//         ...this.options.properties,
//         visibility: this.options.visibility,
//         id: this.options.id,
//       },
//     })
//
//     feature.id = this.id
//     return feature
//   }
//
//   get id(): ICircleOptions['id'] {
//     return this.options.id
//   }
//
//   move(position: LngLat): void {}
//
//   override onAdd(): void {
//     this.context.register.addSource(PLOT_SOURCE_NAME, EMPTY_SOURCE)
//
//     LAYER_LIST.forEach((layer) => {
//       this.context.register.addLayer(layer)
//     })
//   }
//
//   override onRemove(): void {}
//
//   remove(): void {}
//
//   render(): void {
//     const feature = this.getFeature() as GeoJSON.Feature
//
//     if (this.center !== null) {
//       const [lng, lat] = this.center.toArray()
//       const point = new Point(this.context.map, {
//         id: this.id + '-center',
//         visibility: 'visible',
//         position: new LngLat(lng, lat),
//       })
//
//       point.render()
//     }
//
//     this.context.register.setGeoJSONData(PLOT_SOURCE_NAME, feature)
//   }
//
//   select(): void {}
//
//   start(): void {}
//
//   stop(): void {}
//
//   unedit(): void {}
//
//   unfocus(): void {}
//
//   unselect(): void {}
//
//   update(options: ICircleOptions): void {}
// }
