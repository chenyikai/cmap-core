export type CacheType = 'sessionstorage' | 'localstorage'

export interface CacheOptions {
  uniqueKey: string
  type: CacheType
}

export interface CacheItem {
  dataType: string
  content: unknown
  type: CacheType
  datetime: number
}
