export function logEvent(eventName: string, data: any) {
  const contentEl = document.getElementById('log-content')
  if (!contentEl) return

  const time = new Date().toLocaleTimeString()

  // 格式化 JSON 数据，剔除循环引用的对象(如 map 实例)
  const safeData = JSON.stringify(data, (key, value) => {
    if (key === 'map' || key === 'context' || key === 'originEvent') return '[MapObject]'
    return value
  }, 2)

  const logHtml = `[${time}] <span style="color:#fff;">${eventName}</span>\n${safeData}`

  contentEl.innerHTML = logHtml
  // 自动滚动到底部
  contentEl.scrollTop = contentEl.scrollHeight

  console.log(`[${eventName}]`, data)
}
