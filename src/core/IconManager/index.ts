import type { Map } from 'mapbox-gl'

import { cacheKey } from '@/config'
import Cache from '@/core/Cache'
import type { Icon, Image, result } from '@/types/IconManager'
import { RESULT_CODE } from '@/types/IconManager'

class IconManager {
  static SUCCESS = RESULT_CODE.SUCCESS
  static FAIL = RESULT_CODE.FAIL

  _map: Map
  _cache: Cache = new Cache({ uniqueKey: `${cacheKey}-icon`, type: 'localstorage' })

  constructor(map: Map) {
    this._map = map
  }

  async load(icons: Icon[]): Promise<{ success: result[]; error: result[] }> {
    const results = await Promise.allSettled(icons.map((icon) => this.add(icon)))

    const success: result[] = []
    const error: result[] = []

    results.forEach((item) => {
      if (item.status === 'fulfilled') {
        success.push(item.value)
      } else {
        // TypeScript 中 rejected 的 reason 类型通常是 any/unknown
        // 根据你的 add 方法逻辑，这里 reject 的内容应该是 result 类型，所以做个断言
        error.push(item.reason as result)
      }
    })

    return { success, error }
  }

  add(icon: Icon): Promise<result> {
    return new Promise((resolve, reject) => {
      this._map.loadImage(icon.url, (err, image) => {
        if (err) {
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          reject(this.error(icon, err))
          return
        }

        if (this._map.hasImage(icon.name)) {
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          reject(this.error(icon, 'The image has been loaded！'))
          return
        }

        if (image) {
          this._cache.set({
            name: icon.name,
            content: { width: image.width, height: image.height, image },
          })
          this._map.addImage(icon.name, image, icon.options)
          resolve(this.success(icon))
        } else {
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          reject(this.error(icon, 'The image has not found！'))
          return
        }
      })
    })
  }

  has(name: Icon['name']): boolean {
    return this._map.hasImage(name)
  }

  getImage(name: string): Image {
    return this._cache.get(name) as Image
  }

  update(icon: Icon): Promise<result> {
    return new Promise((resolve, reject) => {
      if (!this._map.hasImage(icon.name)) {
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        reject(this.error(icon, 'The image has not been loaded！'))
        return
      }

      this._map.loadImage(icon.url, (err, image) => {
        if (err) {
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          reject(this.error(icon, err))
          return
        }

        if (image) {
          this._cache.set({
            name: icon.name,
            content: { width: image.width, height: image.height },
          })
          this._map.updateImage(icon.name, image)
          resolve(this.success(icon))
        } else {
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          reject(this.error(icon, 'The image has not found！'))
          return
        }
      })
    })
  }

  delete(name: string): void {
    if (this._map.hasImage(name)) {
      this._map.removeImage(name)
      this._cache.remove(name)
    }
  }

  success(icon: Icon): result {
    return {
      code: IconManager.SUCCESS,
      data: icon,
      msg: `The ${icon.name} was successfully added`,
    }
  }

  error(icon: Icon, err: string | Error): result {
    return {
      code: IconManager.FAIL,
      data: icon,
      msg: err,
    }
  }
}

export default IconManager
