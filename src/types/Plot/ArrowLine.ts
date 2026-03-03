import type { IconPointStyle } from '@/types/Plot/IconPoint.ts'
import type { ILineOptions } from '@/types/Plot/Line.ts'

export interface IArrowLineOptions extends ILineOptions {
  vertexStyle: IconPointStyle
}
