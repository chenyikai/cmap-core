const coordinateKeys = {
  z: 'z',
  zoom: 'z',
  level: 'z',
  tilematrix: 'z',
  x: 'x',
  col: 'x',
  tilecol: 'x',
  y: 'y',
  row: 'y',
  tilerow: 'y',
}

/** Parse standard Web Mercator addresses without rewriting unrelated signed query parameters. */
export function parseTileAddress(input, { scheme = 'xyz', tileSize = 256, order = 'zxy' } = {}) {
  if (typeof input !== 'string' || !input.trim()) throw new Error('请输入瓦片地址。')
  const url = input.trim()
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('请输入完整的 http:// 或 https:// 瓦片地址。')
  }
  if (
    !['http:', 'https:'].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    /\s/.test(url)
  ) {
    throw new Error('请使用不含空格及内嵌用户名、密码的 HTTP/HTTPS 地址。')
  }
  if (parsed.hash) throw new Error('瓦片地址不能包含 # 片段。')
  if (
    !['xyz', 'tms'].includes(scheme) ||
    ![256, 512].includes(tileSize) ||
    !['zxy', 'zyx'].includes(order)
  ) {
    throw new Error('请检查编号规则、瓦片尺寸和路径顺序。')
  }
  if (['{z}', '{x}', '{y}'].every((token) => url.includes(token))) return null
  if (/[{}]/.test(url))
    throw new Error('模板需要同时包含 {z}、{x}、{y}，或输入一张完整的具体瓦片地址。')

  const question = url.indexOf('?')
  const path = question < 0 ? url : url.slice(0, question)
  const query = question < 0 ? '' : url.slice(question)
  const match = path.match(/\/(\d+)\/(\d+)\/(\d+)((?:@\d+x)?(?:\.(?:png|jpe?g|webp|avif))?)$/i)
  let coordinates
  let template
  if (match) {
    const [, z, first, second, suffix] = match
    coordinates = order === 'zxy' ? { z, x: first, y: second } : { z, x: second, y: first }
    const tail = order === 'zxy' ? '/{z}/{x}/{y}' : '/{z}/{y}/{x}'
    template = path.slice(0, match.index) + tail + suffix + query
  } else {
    coordinates = {}
    const segments = query.slice(1).split('&')
    const replacements = new Map()
    for (const [index, segment] of segments.entries()) {
      const entry = new URLSearchParams(segment).entries().next().value
      if (!entry) continue
      const [key, value] = entry
      const axis = Object.hasOwn(coordinateKeys, key.toLowerCase())
        ? coordinateKeys[key.toLowerCase()]
        : undefined
      if (!axis) continue
      if (Object.hasOwn(coordinates, axis))
        throw new Error(`查询参数中有重复或冲突的 ${axis} 编号，请改用明确的模板。`)
      coordinates[axis] = value
      replacements.set(index, axis)
    }
    if (!['z', 'x', 'y'].every((axis) => Object.hasOwn(coordinates, axis))) {
      throw new Error(
        '无法识别具体地址。支持末尾 /z/x/y.png（或所选行列顺序），以及 z/x/y、TileMatrix/TileCol/TileRow 查询参数；其他格式请填写模板。',
      )
    }
    template =
      path +
      '?' +
      segments
        .map((segment, index) => {
          const axis = replacements.get(index)
          return axis ? segment.slice(0, segment.indexOf('=') + 1) + `{${axis}}` : segment
        })
        .join('&')
  }

  for (const value of Object.values(coordinates)) {
    if (!/^(0|[1-9]\d*)$/.test(value) || !Number.isSafeInteger(Number(value))) {
      throw new Error(
        '自动定位仅支持不带前导零的非负整数编号；带前缀的 WMTS 矩阵等格式请填写模板及位置。',
      )
    }
  }
  const { z, x, y } = Object.fromEntries(
    Object.entries(coordinates).map(([key, value]) => [key, Number(value)]),
  )
  if (z > 22) throw new Error('自动定位支持的瓦片级别为 0–22。')
  const n = 2 ** z
  if (x >= n || y >= n)
    throw new Error(`z=${z} 时，x 和 y 必须在 0 到 ${n - 1} 之间，请检查路径顺序或瓦片矩阵。`)
  const topY = scheme === 'tms' ? n - 1 - y : y
  return {
    template,
    z,
    x,
    y,
    lng: ((x + 0.5) / n) * 360 - 180,
    lat: (Math.atan(Math.sinh(Math.PI * (1 - (2 * (topY + 0.5)) / n))) * 180) / Math.PI,
    // Source maxzoom=z keeps z=0 usable even though the UI limits map zoom to >= 0.
    zoom: Math.max(0, z - Math.log2(512 / tileSize)),
  }
}
