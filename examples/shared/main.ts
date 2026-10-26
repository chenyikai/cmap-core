import 'cmap-core/style.css'
import './style.css'
import { base, demos, exampleURL, guides, guideURL } from './catalog'
import type { Demo } from './demo'
import { escapeHTML, renderMarkdown } from './markdown'

const sources = import.meta.glob('../scenes/*.ts', { query: '?raw', import: 'default' })
const scenes = import.meta.glob<{ default: Demo }>('../scenes/*.ts')
const documents = import.meta.glob('../../docs/*.md', { query: '?raw', import: 'default' })
const id = document.body.dataset.demo
const guideId = new URLSearchParams(location.search).get('guide')
const demo = demos.find((item) => item.id === id)
const guide = guides.find((item) => item.id === guideId)

document.body.innerHTML = `<aside class="sidebar"><a class="brand" href="${base}examples/index.html"><span class="brand-mark">C</span><span>CMap<span class="brand-sub">SDK 开发者中心</span></span></a>
  <div class="sidebar-links"><a href="${guideURL('getting-started')}">快速接入</a><a href="${base}">原调试台 ↗</a></div>
  <label class="search"><span>查找模块</span><input id="search" placeholder="地图、船舶、Tooltip…" type="search"></label>
  <nav><div class="nav-heading">使用文档</div>${guides.map((item) => `<a data-search="${item.title}" class="${guideId === item.id ? 'active' : ''}" href="${guideURL(item.id)}">${item.title}</a>`).join('')}
  ${[...new Set(demos.map((item) => item.group))]
    .map(
      (group) =>
        `<div class="nav-heading">${group}</div>${demos
          .filter((item) => item.group === group)
          .map(
            (item) =>
              `<a data-search="${item.title}" class="${id === item.id ? 'active' : ''}" href="${exampleURL(item.id)}">${item.title}</a>`,
          )
          .join('')}`,
    )
    .join('')}</nav>
  <div class="sidebar-footer">TypeScript · Mapbox GL JS<br>本地示例无需底图 Token</div></aside>
  <main><header><div class="breadcrumb">开发者中心 / ${guide ? '使用文档' : demo ? demo.group : '概览'}</div><span id="status">${demo ? '加载中' : '文档与示例'}</span></header><div id="content"></div></main>`

document.querySelector<HTMLInputElement>('#search')!.oninput = (event) => {
  const query = (event.target as HTMLInputElement).value.toLowerCase()
  for (const item of document.querySelectorAll<HTMLElement>('[data-search]'))
    item.hidden = !item.dataset.search!.toLowerCase().includes(query)
}
const content = document.querySelector<HTMLElement>('#content')!

async function run(): Promise<void> {
  if (guideId) {
    if (!guide) throw new Error('文档不存在，请从左侧导航选择。')
    const markdown = (await documents[`../../docs/${guide.id}.md`]()) as string
    content.className = 'document'
    content.innerHTML = renderMarkdown(markdown, (url) => {
      if (url.endsWith('.md') || url.includes('.md#')) {
        const [file, anchor] = url.split('#')
        return guideURL(file.split('/').at(-1)!.replace('.md', '')) + (anchor ? '#' + anchor : '')
      }
      if (url.startsWith('../examples/')) return base + url.slice(3)
      return url
    })
    document.title = `${guide.title} · CMap SDK`
    if (location.hash)
      document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView()
    return
  }
  if (demo) {
    document.title = `${demo.title} · CMap SDK`
    content.innerHTML = `<section class="demo-heading"><div><span class="eyebrow">独立示例 / ${escapeHTML(demo.id)}</span><h1>${demo.title}</h1><p>${demo.description}</p></div><a class="text-link" href="${guideURL(demo.guide)}">阅读接入文档 ↗</a></section>
      <section id="demo"></section><details class="source"><summary>查看本示例 TypeScript 源码</summary><p>复用 shared 中的地图外壳；业务接口均从 cmap-core 公共入口导入。</p><pre><code id="source-code"></code></pre></details>`
    document.querySelector('#source-code')!.textContent = (await sources[
      `../scenes/${demo.id}.ts`
    ]()) as string
    const { createDemo } = await import('./demo')
    const context = await createDemo(document.querySelector('#demo')!)
    await (await scenes[`../scenes/${demo.id}.ts`]()).default(context)
    if (!document.querySelector('#status')!.hasAttribute('data-error'))
      document.querySelector('#status')!.textContent = '运行正常'
    return
  }
  content.innerHTML = `<section class="hero"><span class="eyebrow">CMAP CORE / 开发指南</span><h1>从第一张地图，<br>到完整的业务场景。</h1><p>接入指南、模块 API 与可操作示例集中在这里。<br>选择一个模块开始，也可以直接体验综合演示。</p><div class="hero-actions"><a class="primary-link" href="${guideURL('getting-started')}">开始接入 →</a><a class="secondary-link" href="${exampleURL('overview')}">打开综合演示</a></div><div class="hero-stats"><span><b>${demos.length}</b> 独立演示入口</span><span><b>${guides.length}</b> 文档章节</span><span><b>0</b> 必填演示密钥</span></div></section>
    <section class="catalog-heading"><h2>模块与示例</h2><span>每个示例均有独立 URL、操作按钮和源码</span></section>
    <div class="cards">${demos.map((item, index) => `<a class="card" href="${exampleURL(item.id)}"><span class="card-number">${String(index + 1).padStart(2, '0')} / ${item.group}</span><h3>${item.title}<span>↗</span></h3><p>${item.description}</p><span class="card-link">运行示例</span></a>`).join('')}</div>`
}

void run().catch((error: unknown) => {
  document.querySelector('#status')!.textContent = '加载失败'
  document.querySelector('#status')!.setAttribute('data-error', 'true')
  const message = document.createElement('pre')
  message.className = 'error'
  message.textContent = String(error)
  content.append(message)
  console.error(error)
})
