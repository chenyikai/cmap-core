import type { CacheOptions, CacheType } from '@/types/Cache'

/**
 * IndexedDB 存储记录结构
 */
interface IDBRecord {
  /** 存储键，格式为 `${cacheKey}${name}` */
  name: string
  /** 经过序列化过滤后的内容（不可序列化的字段会被置为 null） */
  content: unknown
  /** 缓存类型，来自构造选项 */
  type: CacheType
  /** 写入时间戳（ms） */
  datetime: number
}

/**
 * 双层缓存：内存（同步读）+ IndexedDB（异步持久化）
 *
 * - `get` 从内存 Map 同步读取，无需 await，适合在渲染路径中使用
 * - `set` / `remove` 立即更新内存，同时异步写入 IndexedDB
 * - 构造时自动从 IndexedDB 预热内存，页面重载后可复用上一次的缓存数据
 * - 不可序列化的字段（如 HTMLImageElement）仅保留在内存中，
 *   IndexedDB 只持久化可 JSON 序列化的部分
 */
class Cache {
  _options: CacheOptions
  /** 所有缓存键的统一前缀，格式为 `${uniqueKey}` */
  cacheKey: string
  cacheType: CacheType

  /** 同步读层：存储完整的原始内容（含不可序列化对象） */
  private _mem = new Map<string, unknown>()
  /** IndexedDB 数据库连接 Promise，整个实例生命周期内共享同一连接 */
  private readonly _db: Promise<IDBDatabase>

  constructor(options: CacheOptions) {
    this._options = options
    this.cacheKey = options.uniqueKey
    this.cacheType = options.type
    this._db = this._openDB()
    // 异步预热内存缓存，不阻塞构造函数
    void this._loadFromDB()
  }

  /**
   * 打开（或创建）IndexedDB 数据库
   * - 数据库名称：`cmap_${uniqueKey}`，版本号固定为 1
   * - objectStore 名称：`cache`，以 `name` 字段作为主键
   */
  private _openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(`cmap_${this._options.uniqueKey}`, 1)
      req.onupgradeneeded = (): void => {
        req.result.createObjectStore('cache', { keyPath: 'name' })
      }
      req.onsuccess = (): void => {
        resolve(req.result)
      }
      req.onerror = (): void => {
        reject(req.error ?? new Error('IndexedDB open failed'))
      }
    })
  }

  /**
   * 从 IndexedDB 读取全部记录并写入内存 Map
   * - 仅在内存中���存在对应键时才写入，避免覆盖本次会话已 set 的最新值
   * - 出错时静默忽略，不影响正常使用
   */
  private async _loadFromDB(): Promise<void> {
    const db = await this._db
    return new Promise((resolve) => {
      const req = db.transaction('cache', 'readonly').objectStore('cache').getAll()
      req.onsuccess = (): void => {
        for (const record of req.result as IDBRecord[]) {
          if (!this._mem.has(record.name)) {
            this._mem.set(record.name, record.content)
          }
        }
        resolve()
      }
      req.onerror = (): void => {
        resolve()
      }
    })
  }

  /**
   * 执行一次 IndexedDB 事务的通用封装
   * @param mode 事务模式：`readonly` 或 `readwrite`
   * @param fn   接收 objectStore 并返回 IDBRequest 的操作函数
   */
  private async _tx<T>(
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const db = await this._db
    return new Promise((resolve, reject) => {
      const store = db.transaction('cache', mode).objectStore('cache')
      const req = fn(store)
      req.onsuccess = (): void => {
        resolve(req.result)
      }
      req.onerror = (): void => {
        reject(req.error ?? new Error('IndexedDB transaction failed'))
      }
    })
  }

  /**
   * 将内容序列化为可存入 IndexedDB 的形式
   * - 通过 JSON 往返过滤不可序列化的字段（如 HTMLImageElement、函数等）
   * - 序列化失败时返回 null，不抛出异常
   */
  private _serialize(content: unknown): unknown {
    try {
      return JSON.parse(JSON.stringify(content))
    } catch {
      return null
    }
  }

  /**
   * 同步读取缓存
   * - 直接从内存 Map 返回，无需 await，可在渲染等同步路径中安全调用
   * - 若对应键不存在则返回 `undefined`
   */
  get(name: string): unknown {
    return this._mem.get(`${this.cacheKey}${name}`)
  }

  /**
   * 写入缓存
   * - 立即更新内存，同步调用方可在 set 返回后立刻通过 get 读到新值
   * - 异步将可序列化部分持久化至 IndexedDB
   * - 函数类型不支持存储，会打印警告并跳过
   */
  async set({ name, content }: { name: string; content: unknown }): Promise<void> {
    if (typeof content === 'function') {
      console.warn(`Cache.set: 函数类型不支持序列化存储，"${name}" 已跳过。`)
      return
    }
    const key = `${this.cacheKey}${name}`
    this._mem.set(key, content)
    const record: IDBRecord = {
      name: key,
      content: this._serialize(content),
      type: this.cacheType,
      datetime: Date.now(),
    }
    await this._tx('readwrite', (store) => store.put(record))
  }

  /**
   * 删除指定缓存
   * - 立即从内存中移除
   * - 异步从 IndexedDB 中删除
   */
  async remove(name: string): Promise<void> {
    const key = `${this.cacheKey}${name}`
    this._mem.delete(key)
    await this._tx('readwrite', (store) => store.delete(key))
  }

  /**
   * 清空当前实例的所有缓存，并返回被清除的条目列表
   * - 同步清空内存并立即返回结果
   * - 异步通过游标遍历 IndexedDB，删除属于当前 cacheKey 前缀的所有记录
   */
  removeAll(): { name: string | null; content: unknown }[] {
    const result: { name: string | null; content: unknown }[] = []
    for (const [key, content] of this._mem) {
      if (key.startsWith(this.cacheKey)) {
        result.push({ name: key, content })
        this._mem.delete(key)
      }
    }
    void this._db.then((db) => {
      const store = db.transaction('cache', 'readwrite').objectStore('cache')
      const req = store.openCursor()
      req.onsuccess = (e): void => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result
        if (!cursor) return
        if ((cursor.key as string).startsWith(this.cacheKey)) cursor.delete()
        cursor.continue()
      }
    })
    return result
  }
}

export default Cache
