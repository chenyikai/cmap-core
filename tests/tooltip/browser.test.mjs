// Start the demo server first. Uses a local Playwright install or CMAP_PLAYWRIGHT_PATH.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.CMAP_PLAYWRIGHT_PATH || 'playwright')
const base = process.env.CMAP_TEST_BASE_URL || 'http://127.0.0.1:5173'
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CMAP_CHROME_PATH,
})
try {
  const page = await browser.newPage({
    viewport: { width: 1100, height: 720 },
    deviceScaleFactor: 2,
  })
  page.setDefaultTimeout(20000)
  const errors = []
  page.on('pageerror', (error) => {
    errors.push(error.message)
    console.error(error.message)
  })
  await page.goto(base + '/tests/tooltip/browser.html')
  await page.waitForFunction(() => window.tooltipHarness?.stats().visible === 4)
  if (process.env.CMAP_SCREENSHOT_PATH)
    await page.screenshot({ path: process.env.CMAP_SCREENSHOT_PATH })
  const visual = await page.evaluate(() => {
    const h = window.tooltipHarness
    return h.items
      .filter((x) => x instanceof h.Tooltip)
      .map((tip, i) => {
        const label = document.querySelectorAll('.mapboxgl-marker')[i]
        const dom = label.getBoundingClientRect()
        const box = tip.bbox
        return {
          canvasWidth: box.maxX - box.minX,
          domWidth: dom.width,
          canvasHeight: box.maxY - box.minY,
          domHeight: dom.height,
        }
      })
  })
  for (const sample of visual) {
    assert.ok(Math.abs(sample.canvasWidth - sample.domWidth) < 2, JSON.stringify(sample))
    assert.ok(Math.abs(sample.canvasHeight - sample.domHeight) < 2, JSON.stringify(sample))
  }
  console.log('Visual dimensions:', JSON.stringify(visual))

  for (const dense of [false, true]) {
    await page.evaluate((dense) => window.tooltipHarness.connectorScene(dense), dense)
    await page.waitForFunction(() => window.tooltipHarness.stats().visible > 0)
    // Include a rotation/pitch change, then verify the final actual projected geometry.
    await page.evaluate(async () => {
      const h = window.tooltipHarness
      for (const camera of [
        { pitch: 0, bearing: 0 },
        { pitch: 25, bearing: 8 },
      ]) {
        h.map.jumpTo(camera)
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
        const tips = h.items.filter((x) => x instanceof h.Tooltip && x.visible)
        const inside = (p, box, inset = 0) =>
          p.x > box.minX + inset &&
          p.x < box.maxX - inset &&
          p.y > box.minY + inset &&
          p.y < box.maxY - inset
        for (const tip of tips) {
          const endLngLat = tip.connectPoint()
          if (!endLngLat) continue
          const end = h.map.project(endLngLat)
          const start = h.map.project(tip.options.position)
          const dx = end.x - start.x,
            dy = end.y - start.y
          const length = Math.hypot(dx, dy)
          for (let j = 0; j < 100; j++) {
            const t = j / 100
            const p = { x: start.x + dx * t, y: start.y + dy * t }
            // Inner rectangle is entirely inside the rounded label background.
            if (inside(p, tip.bbox, 6)) throw new Error('Connector crosses its own text label')
            if (
              tip.options.collision &&
              tips.some((other) => other !== tip && inside(p, other.bbox))
            )
              throw new Error('Connector crosses another label')
          }
        }
      }
      h.map.jumpTo({ pitch: 0, bearing: 0 })
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    })
    if (process.env.CMAP_CONNECTOR_SCREENSHOT_PATH && !dense)
      await page.screenshot({ path: process.env.CMAP_CONNECTOR_SCREENSHOT_PATH })
    console.log(
      'Connector scene:',
      JSON.stringify({ dense, ...(await page.evaluate(() => window.tooltipHarness.stats())) }),
    )
  }

  // Legacy HTML remains the same live element, including interactions and resize tracking.
  await page.evaluate(() => {
    const h = window.tooltipHarness
    h.reset()
    const element = document.createElement('button')
    element.id = 'legacy-tooltip-button'
    element.textContent = '点击标签'
    element.style.cssText = 'width:100px;height:32px;'
    const tip = new h.Tooltip(h.map, {
      position: h.map.getCenter(),
      element,
      className: 'interactive-tooltip',
      anchor: 'center',
    })
    h.legacy = { element, tip, clicks: 0 }
    element.addEventListener('click', () => h.legacy.clicks++)
  })
  await page.locator('#legacy-tooltip-button').click()
  assert.equal(await page.evaluate(() => window.tooltipHarness.legacy.clicks), 1)
  await page.evaluate(() => {
    const h = window.tooltipHarness
    h.legacy.element.style.width = '210px'
    h.legacy.tip.setLngLat(h.map.unproject([450, 300]))
  })
  await page.waitForFunction(() => {
    const { tip, element } = window.tooltipHarness.legacy
    return tip.bbox.maxX - tip.bbox.minX === 210 && element.parentElement.offsetWidth === 210
  })
  await page.evaluate(() => window.tooltipHarness.legacy.tip.hide())
  await page.waitForFunction(() => !document.querySelector('#legacy-tooltip-button').offsetWidth)
  await page.evaluate(() => window.tooltipHarness.legacy.tip.show())
  await page.locator('#legacy-tooltip-button').click()
  assert.equal(await page.evaluate(() => window.tooltipHarness.legacy.clicks), 2)
  await page.setViewportSize({ width: 1000, height: 680 })
  await page.waitForFunction(() => {
    const { map } = window.tooltipHarness
    return document.querySelector('.cmap-tooltip-canvas').width === map.getCanvas().clientWidth * 2
  })
  await page.evaluate(() => {
    const h = window.tooltipHarness
    if (h.legacy.tip.options.element !== h.legacy.element) throw new Error('DOM element replaced')
    h.legacy.tip.remove()
    delete h.legacy
  })
  assert.equal(await page.locator('.cmap-tooltip-dom').count(), 0)
  await page.setViewportSize({ width: 1100, height: 720 })
  await page.waitForFunction(() => window.tooltipHarness.map.getCanvas().clientWidth === 1100)

  const results = []
  for (const count of [300, 1000, 5000]) {
    for (const mode of ['canvas', 'marker']) {
      const result = await page.evaluate(
        async ({ mode, count }) => {
          const h = window.tooltipHarness
          const waitFrames = (n) =>
            new Promise((resolve) => {
              const tick = () => (--n <= 0 ? resolve() : requestAnimationFrame(tick))
              requestAnimationFrame(tick)
            })
          const start = performance.now()
          h.bulk(mode, count)
          const constructionMs = performance.now() - start
          if (mode === 'canvas') {
            for (let i = 0; i < 300 && h.stats().visible !== count; i++) await waitFrames(1)
            if (h.stats().visible !== count) throw new Error('Canvas labels failed to settle')
          } else await waitFrames(3)
          const readyMs = performance.now() - start
          const frameTimes = []
          let previous = performance.now()
          for (let i = 0; i < 45; i++) {
            h.map.jumpTo({
              center: [120 + Math.sin(i / 10) * 0.0001, 30],
              bearing: Math.sin(i / 10),
            })
            await waitFrames(1)
            const now = performance.now()
            frameTimes.push(now - previous)
            previous = now
          }
          frameTimes.sort((a, b) => a - b)
          return {
            mode,
            count,
            constructionMs,
            readyMs,
            p50FrameMs: frameTimes[22],
            p95FrameMs: frameTimes[42],
            ...h.stats(),
          }
        },
        { mode, count },
      )
      if (mode === 'canvas') assert.equal(result.overlays, 1)
      results.push(result)
      console.log('Benchmark:', JSON.stringify(result))
    }
  }
  await page.evaluate(async () => {
    const h = window.tooltipHarness
    h.reset()
    const tip = new h.Tooltip(h.map, { position: h.map.getCenter(), text: '移动测试', line: true })
    await new Promise((resolve) => requestAnimationFrame(resolve))
    tip.update({ text: '更新后的文本', anchor: 'top-left' })
    h.map.jumpTo({ pitch: 50, bearing: 35 })
    await new Promise((resolve) => requestAnimationFrame(resolve))
    if (!tip.visible) throw new Error('Label disappeared after pitch/bearing update')
    tip.remove()
    h.map.remove()
  })
  assert.equal(await page.locator('.cmap-tooltip-canvas').count(), 0)
  assert.deepEqual(errors, [])
  console.log(
    'Browser checks passed; timings are local headless-browser measurements, not capacity guarantees.',
  )
} finally {
  await browser.close()
}
