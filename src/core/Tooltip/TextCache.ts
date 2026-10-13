import type { ITooltipOptions, TooltipTextStyle } from '@/types/Toolip'

import type { LabelSize } from './layout'

type TextStyle = Required<TooltipTextStyle>
export interface TextMetrics extends LabelSize {
  key: string
  lines: string[]
  style: TextStyle
  ascent: number
  descent: number
}
interface Bitmap {
  canvas: HTMLCanvasElement
  inset: number
  bytes: number
  ratio: number
}

const DEFAULT_STYLE: TextStyle = {
  fontFamily: '"Helvetica Neue", Arial, Helvetica, sans-serif',
  fontSize: 12,
  fontWeight: 'bold',
  lineHeight: 20,
  color: '#333',
  backgroundColor: 'rgba(255,255,255,0.5)',
  paddingX: 5,
  paddingY: 3,
  borderRadius: 6,
  shadowColor: 'rgba(0,0,0,0.4)',
  shadowBlur: 14,
  shadowOffsetX: 0,
  shadowOffsetY: 3,
}

function font(style: TextStyle): string {
  return `${String(style.fontWeight)} ${String(style.fontSize)}px ${style.fontFamily}`
}

/** Per-map, byte-bounded bitmap cache. Position and anchor are deliberately not part of its key. */
export class TextCache {
  private readonly measureContext: CanvasRenderingContext2D
  private themes = new Map<string, TextStyle>()
  private bitmaps = new Map<string, Bitmap>()
  private bytes = 0
  private backgrounds = new Map<string, Bitmap>()
  private backgroundBytes = 0

  private get backgroundBudget(): number {
    return Math.min(4 * 1024 * 1024, this.budget / 4)
  }

  private dimensions(
    metrics: TextMetrics,
    ratio: number,
  ): { inset: number; width: number; height: number; bytes: number } {
    const { style } = metrics
    const inset = Math.ceil(
      style.shadowBlur * 2 +
        Math.max(Math.abs(style.shadowOffsetX), Math.abs(style.shadowOffsetY)) +
        2,
    )
    const width = Math.max(1, Math.ceil((metrics.width + inset * 2) * ratio))
    const height = Math.max(1, Math.ceil((metrics.height + inset * 2) * ratio))
    return { inset, width, height, bytes: width * height * 4 }
  }

  canCache(metrics: TextMetrics, ratio: number): boolean {
    return this.bytes + this.dimensions(metrics, ratio).bytes <= this.budget - this.backgroundBudget
  }

  retain(metrics: TextMetrics[], ratio: number): void {
    const active = new Set(metrics.map((item) => `${String(ratio)}:${item.key}`))
    for (const [key, bitmap] of this.bitmaps) {
      if (!active.has(key)) {
        this.bitmaps.delete(key)
        this.bytes -= bitmap.bytes
      }
    }
  }

  constructor(
    private readonly container: HTMLElement,
    private readonly budget = 32 * 1024 * 1024,
  ) {
    const canvas = container.ownerDocument.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Tooltip requires Canvas 2D support')
    this.measureContext = context
  }

  private theme(options: ITooltipOptions): TextStyle {
    const theme = options.theme === 'track' ? 'track' : 'ship'
    const key = `${theme}:${options.className ?? ''}`
    const cached = this.themes.get(key)
    if (cached) return cached

    const style = { ...DEFAULT_STYLE }
    const document = this.container.ownerDocument
    const box = document.createElement('div')
    box.className = `${theme}-name-box ${options.className ?? ''}`
    box.style.cssText =
      'position:absolute;visibility:hidden;pointer-events:none;left:-10000px;top:0;width:max-content'
    const text = document.createElement('div')
    text.className = `${theme}-name`
    text.textContent = 'Mg中文'
    box.appendChild(text)
    this.container.appendChild(box)
    const computed = document.defaultView?.getComputedStyle(text)
    if (computed) {
      style.fontFamily = computed.fontFamily || style.fontFamily
      style.fontSize = parseFloat(computed.fontSize) || style.fontSize
      style.lineHeight = parseFloat(computed.lineHeight) || style.lineHeight
      // Without the SDK stylesheet, retain its built-in visual defaults.
      if (
        computed.backgroundColor &&
        computed.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
        computed.backgroundColor !== 'transparent'
      ) {
        style.color = computed.color
        style.fontWeight = computed.fontWeight || style.fontWeight
        style.backgroundColor = computed.backgroundColor
        style.paddingX = parseFloat(computed.paddingLeft) || 0
        style.paddingY = parseFloat(computed.paddingTop) || 0
        style.borderRadius = parseFloat(computed.borderTopLeftRadius) || 0
        const color = /rgba?\([^)]+\)/.exec(computed.boxShadow)?.[0]
        const lengths = computed.boxShadow
          .replace(/rgba?\([^)]+\)/g, '')
          .match(/-?[\d.]+px/g)
          ?.map(parseFloat)
        style.shadowColor = color ?? 'transparent'
        style.shadowOffsetX = lengths?.[0] ?? 0
        style.shadowOffsetY = lengths?.[1] ?? 0
        style.shadowBlur = lengths?.[2] ?? 0
      }
    }
    box.remove()
    this.themes.set(key, style)
    return style
  }

  measure(options: ITooltipOptions): TextMetrics {
    const style = { ...this.theme(options), ...options.style }
    this.measureContext.font = font(style)
    const lines = (options.text ?? '').split(/\r?\n/)
    const metrics = this.measureContext.measureText('Mg')
    return {
      key: JSON.stringify([lines, style]),
      lines,
      style,
      width:
        Math.max(...lines.map((line) => this.measureContext.measureText(line).width), 0) +
        style.paddingX * 2,
      height: lines.length * style.lineHeight + style.paddingY * 2,
      ascent: metrics.fontBoundingBoxAscent || style.fontSize * 0.8,
      descent: metrics.fontBoundingBoxDescent || style.fontSize * 0.2,
    }
  }

  get(metrics: TextMetrics, ratio: number): Bitmap | undefined {
    const key = `${String(ratio)}:${metrics.key}`
    const bitmap = this.bitmaps.get(key)
    if (bitmap) {
      this.bitmaps.delete(key)
      this.bitmaps.set(key, bitmap)
    }
    return bitmap
  }

  private rasterize(metrics: TextMetrics, ratio: number, text = true): Bitmap {
    const { style, width, height } = metrics
    const dimensions = this.dimensions(metrics, ratio)
    const { inset } = dimensions
    const canvas = this.container.ownerDocument.createElement('canvas')
    canvas.width = dimensions.width
    canvas.height = dimensions.height
    const context = canvas.getContext('2d')!
    context.scale(ratio, ratio)
    context.translate(inset, inset)
    // CSS outer box-shadow is based on the opaque box, and never darkens its interior.
    context.fillStyle = '#000'
    context.shadowColor = style.shadowColor
    // shadowBlur / shadowOffset are device pixels, unlike the transformed path.
    context.shadowBlur = style.shadowBlur * ratio
    context.shadowOffsetX = style.shadowOffsetX * ratio
    context.shadowOffsetY = style.shadowOffsetY * ratio
    context.beginPath()
    const r = Math.min(style.borderRadius, width / 2, height / 2)
    context.moveTo(r, 0)
    context.arcTo(width, 0, width, height, r)
    context.arcTo(width, height, 0, height, r)
    context.arcTo(0, height, 0, 0, r)
    context.arcTo(0, 0, width, 0, r)
    context.closePath()
    context.fill()
    context.shadowColor = 'transparent'
    context.shadowBlur = 0
    context.shadowOffsetX = 0
    context.shadowOffsetY = 0
    context.globalCompositeOperation = 'destination-out'
    context.fill()
    context.globalCompositeOperation = 'source-over'
    context.fillStyle = style.backgroundColor
    context.fill()
    if (text) this.paintText(context, metrics, 0, 0)
    return { canvas, inset, ratio, bytes: dimensions.bytes }
  }

  private paintText(
    context: CanvasRenderingContext2D,
    metrics: TextMetrics,
    x: number,
    y: number,
  ): void {
    const { style } = metrics
    context.font = font(style)
    context.fillStyle = style.color
    context.textBaseline = 'alphabetic'
    const baseline =
      style.paddingY + (style.lineHeight - metrics.ascent - metrics.descent) / 2 + metrics.ascent
    metrics.lines.forEach((line, i) => {
      context.fillText(line, x + style.paddingX, y + baseline + i * style.lineHeight)
    })
  }

  create(metrics: TextMetrics, ratio: number): Bitmap {
    const cached = this.get(metrics, ratio)
    if (cached) return cached
    const bitmap = this.rasterize(metrics, ratio)
    const budget = this.budget - this.backgroundBudget
    if (bitmap.bytes <= budget) {
      while (this.bytes + bitmap.bytes > budget) {
        const oldest = this.bitmaps.entries().next().value
        if (!oldest) break
        this.bitmaps.delete(oldest[0])
        this.bytes -= oldest[1].bytes
      }
      this.bitmaps.set(`${String(ratio)}:${metrics.key}`, bitmap)
      this.bytes += bitmap.bytes
    }
    return bitmap
  }

  /** Overflow stays visible: reuse a small background cache and draw glyphs directly.
   * This avoids an endless eviction/rasterization loop when visible labels exceed the budget.
   */
  draw(
    context: CanvasRenderingContext2D,
    metrics: TextMetrics,
    ratio: number,
    x: number,
    y: number,
  ): void {
    // Placement already aligns the box and its connector to the same device-pixel origin.
    let bitmap = this.get(metrics, ratio)
    const fullLabel = !!bitmap
    if (!bitmap) {
      const key = JSON.stringify([metrics.width, metrics.height, metrics.style, ratio])
      bitmap = this.backgrounds.get(key)
      if (bitmap) {
        this.backgrounds.delete(key)
        this.backgrounds.set(key, bitmap)
      } else {
        bitmap = this.rasterize(metrics, ratio, false)
        if (bitmap.bytes <= this.backgroundBudget) {
          while (this.backgroundBytes + bitmap.bytes > this.backgroundBudget) {
            const oldest = this.backgrounds.entries().next().value
            if (!oldest) break
            this.backgrounds.delete(oldest[0])
            this.backgroundBytes -= oldest[1].bytes
          }
          this.backgrounds.set(key, bitmap)
          this.backgroundBytes += bitmap.bytes
        }
      }
    }
    context.drawImage(
      bitmap.canvas,
      x - bitmap.inset,
      y - bitmap.inset,
      bitmap.canvas.width / ratio,
      bitmap.canvas.height / ratio,
    )
    if (!fullLabel) this.paintText(context, metrics, x, y)
  }

  clear(): void {
    this.bitmaps.clear()
    this.themes.clear()
    this.bytes = 0
    this.backgrounds.clear()
    this.backgroundBytes = 0
  }
}
