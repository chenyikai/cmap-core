/** Small, escaped renderer for the Markdown subset used by the bundled SDK guides. */
export function escapeHTML(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
  )
}

export function renderMarkdown(
  markdown: string,
  resolveLink: (url: string) => string = (url) => url,
): string {
  const inline = (text: string): string => {
    const tokens: string[] = []
    const token = (html: string) => `\u0000${tokens.push(html) - 1}\u0000`
    let value = text.replace(/`([^`]+)`/g, (_, code: string) =>
      token(`<code>${escapeHTML(code)}</code>`),
    )
    value = value.replace(/\[([^\]]+)\]\(([^\s)]+)\)/g, (_, label: string, url: string) => {
      const target = resolveLink(url)
      if (/^(?:javascript|data|vbscript):/i.test(target)) return label
      return token(`<a href="${escapeHTML(target)}">${escapeHTML(label)}</a>`)
    })
    value = escapeHTML(value).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    return value.replace(/\u0000(\d+)\u0000/g, (_, index: string) => tokens[Number(index)])
  }
  const lines = markdown.replace(/\r/g, '').split('\n')
  const output: string[] = []
  let i = 0
  const cells = (line: string) =>
    line
      .replace(/^\||\|$/g, '')
      .split(/(?<!\\)\|/)
      .map((cell) => inline(cell.trim().replace(/\\\|/g, '|')))
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i++
      continue
    }
    if (line.startsWith('```')) {
      const language = line.slice(3).trim(),
        code: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++])
      output.push(
        `<div class="code-label">${escapeHTML(language || 'text')}</div><pre><code>${escapeHTML(code.join('\n'))}</code></pre>`,
      )
      i++
      continue
    }
    const heading = /^(#{1,4}) (.+)$/.exec(line)
    if (heading) {
      const level = heading[1].length
      const id = heading[2]
        .toLowerCase()
        .replace(/[`]/g, '')
        .replace(/[^\p{L}\p{N}\s-]/gu, '')
        .replace(/\s+/g, '-')
      output.push(`<h${level} id="${escapeHTML(id)}">${inline(heading[2])}</h${level}>`)
      i++
      continue
    }
    if (line.startsWith('|') && /^\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? '')) {
      const headers = cells(line)
      i += 2
      const rows: string[] = []
      while (i < lines.length && lines[i].startsWith('|'))
        rows.push(
          `<tr>${cells(lines[i++])
            .map((cell) => `<td>${cell}</td>`)
            .join('')}</tr>`,
        )
      output.push(
        `<div class="table-scroll"><table><thead><tr>${headers.map((cell) => `<th>${cell}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`,
      )
      continue
    }
    if (/^[-*] /.test(line) || /^\d+\. /.test(line)) {
      const ordered = /^\d+\./.test(line),
        items: string[] = []
      const pattern = ordered ? /^\d+\. / : /^[-*] /
      while (i < lines.length && pattern.test(lines[i]))
        items.push(`<li>${inline(lines[i++].replace(pattern, ''))}</li>`)
      output.push(`<${ordered ? 'ol' : 'ul'}>${items.join('')}</${ordered ? 'ol' : 'ul'}>`)
      continue
    }
    if (line.startsWith('> ')) {
      output.push(`<blockquote>${inline(line.slice(2))}</blockquote>`)
      i++
      continue
    }
    const paragraph = [line]
    i++
    while (i < lines.length && lines[i].trim() && !/^(#|```|\||[-*] |> |\d+\. )/.test(lines[i]))
      paragraph.push(lines[i++])
    output.push(`<p>${inline(paragraph.join(' '))}</p>`)
  }
  return output.join('\n')
}
