import { Cache } from 'cmap-core'
import type { Demo } from '../shared/demo'

const mount: Demo = (ctx) => {
  const cache = new Cache({ uniqueKey: 'cmap-learning-demo', type: 'localstorage' })
  let revision = 0
  ctx.button('写入缓存', async () => {
    const value = { name: '演示港区', revision: ++revision, updatedAt: new Date().toISOString() }
    await cache.set({ name: 'port', content: value })
    ctx.log('内存和 IndexedDB 写入完成', cache.get('port'))
  })
  ctx.button('同步读取', () =>
    ctx.log('get 返回值', cache.get('port') ?? '当前未命中；写入后重试，或等待异步预热完成'),
  )
  ctx.button('删除演示记录', async () => {
    await cache.remove('port')
    ctx.log('已删除 port')
  })
  ctx.overlay.innerHTML =
    '<div class="demo-card">Cache 不依赖地图。<br>点击“写入缓存”，刷新页面后再点击“同步读取”。<br>持久化使用 IndexedDB，不是 localStorage API。</div>'
  ctx.log('使用独立演示命名空间 cmap-learning-demo，不读写业务缓存。')
}
export default mount
