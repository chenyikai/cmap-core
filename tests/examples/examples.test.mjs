import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

const root = resolve(import.meta.dirname, '../..')
const read = (file) => readFileSync(resolve(root, file), 'utf8')
function load(file) {
  const source = read(file).replace('import.meta.env.BASE_URL', "'/CMap/'")
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const exports = {}
  vm.runInNewContext(outputText, { exports, console })
  return exports
}
const { demos, guides, exampleURL, guideURL } = load('examples/shared/catalog.ts')
const { renderMarkdown } = load('examples/shared/markdown.ts')

test('every catalog entry has its own HTML, public-API scene and guide', () => {
  assert.equal(demos.length, 22)
  assert.equal(new Set(demos.map((demo) => demo.id)).size, demos.length)
  for (const demo of demos) {
    const html = read(`examples/${demo.id}/index.html`)
    assert.ok(html.includes(`data-demo="${demo.id}"`), demo.id)
    assert.ok(html.includes('../shared/main.ts'), demo.id)
    const scene = read(`examples/scenes/${demo.id}.ts`)
    assert.ok(scene.includes("from 'cmap-core'"), demo.id)
    assert.ok(scene.includes('export default'), demo.id)
    assert.doesNotMatch(scene, /from ['"](?:@\/|.*src\/)/)
    assert.ok(
      guides.some((guide) => guide.id === demo.guide),
      demo.id,
    )
  }
  assert.equal(
    readdirSync(resolve(root, 'examples/scenes')).filter((name) => name.endsWith('.ts')).length,
    demos.length,
  )
})

test('all guide files exist, have closed code fences and valid local links', () => {
  const files = ['README.md', ...guides.map((guide) => `docs/${guide.id}.md`)]
  for (const file of files) {
    const markdown = read(file)
    assert.match(markdown, /^# /, file)
    assert.equal((markdown.match(/^```/gm) ?? []).length % 2, 0, file)
    for (const [, link] of markdown.matchAll(/\[[^\]]+\]\(([^\s)]+)\)/g)) {
      if (/^(?:https?:|#)/.test(link)) continue
      const destination = resolve(root, dirname(file), link.split('#')[0])
      assert.ok(existsSync(destination), `${file}: missing ${link}`)
    }
  }
})

test('all demos are listed in the guide, including the integrated example', () => {
  const guide = read('docs/examples.md')
  for (const demo of demos) assert.ok(guide.includes(`../examples/${demo.id}/index.html`), demo.id)
  assert.ok(read('README.md').includes('examples/overview/index.html'))
})

test('navigation supports a non-root static deployment', () => {
  assert.equal(exampleURL('ship'), '/CMap/examples/ship/index.html')
  assert.equal(guideURL('ship'), '/CMap/examples/index.html?guide=ship')
  assert.ok(read('vite.demo.config.ts').includes('rollupOptions'))
})

test('Markdown renders headings, code, tables, lists and internal links', () => {
  const html = renderMarkdown(
    '# 标题\n\n## 小节\n\n[接入](getting-started.md)\n\n```ts\nconst x = "<tag>"\n```\n\n| 参数 | 说明 |\n| --- | --- |\n| `x` | 值 |\n\n- 第一项\n- 第二项\n',
    (url) => `/guide/${url}`,
  )
  assert.ok(html.includes('<h1 id="标题">'))
  assert.ok(html.includes('<h2 id="小节">'))
  assert.ok(html.includes('href="/guide/getting-started.md"'))
  assert.ok(html.includes('&lt;tag&gt;'))
  assert.ok(html.includes('<table>'))
  assert.ok(html.includes('<ul><li>第一项</li><li>第二项</li></ul>'))
})

test('Markdown does not execute raw HTML or unsafe link protocols', () => {
  const html = renderMarkdown(
    '<img src=x onerror=alert(1)>\n\n[x](javascript:alert)\n\n[x](data:text/html,test)\n\n`<script>alert(1)</script>`',
  )
  assert.ok(html.includes('&lt;img'))
  assert.ok(html.includes('&lt;script&gt;'))
  assert.doesNotMatch(html, /<img|<script|href="(?:javascript|data):/)
})

test('critical integration contracts are documented', () => {
  assert.ok(read('docs/track.md').includes('`id` 是轨迹 ID，`pId` 是该轨迹点的唯一 ID'))
  assert.ok(read('docs/resources.md').includes('空数组不会清空数据'))
  assert.ok(read('docs/ship.md').includes('船宽一半'))
  assert.ok(read('docs/getting-started.md').includes('cmap-core/style.css'))
  assert.ok(read('docs/tooltip.md').includes('构造后自动显示'))
  assert.ok(read('docs/tooltip.md').includes("button.style.pointerEvents = 'auto'"))
  assert.ok(read('examples/scenes/tooltip.ts').includes("button.style.pointerEvents = 'auto'"))
})
