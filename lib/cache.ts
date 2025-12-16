// Simple in-memory cache for API responses
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 300000 // 5 minutes - longer cache to reduce API calls

export function getCached(key: string) {
  const cached = cache.get(key)
  if (!cached) return null
  
  const age = Date.now() - cached.timestamp
  if (age > CACHE_DURATION) {
    cache.delete(key)
    return null
  }
  
  return cached.data
}

export function setCached(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() })
}

export function clearCache() {
  cache.clear()
}

export function invalidateCache(key: string) {
  cache.delete(key)
}

