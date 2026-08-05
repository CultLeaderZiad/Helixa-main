"use client"

// Lightweight in-memory cache for read-mostly dashboard data. Lets a page
// switching back to a previously-visited tab render cached data instantly
// (no spinner), then revalidate in the background. Server remains the source
// of truth; this only avoids the blank-flash/full-spinner on repeat visits.

const resolved = new Map<string, unknown>()
const inflight = new Map<string, Promise<unknown>>()

export function readCache<T>(key: string): T | undefined {
  return resolved.get(key) as T | undefined
}

export function writeCache<T>(key: string, value: T) {
  resolved.set(key, value)
}

export function clearCache(key: string) {
  resolved.delete(key)
}

// Memoized GET helper: returns the cached value if present, otherwise fetches,
// caches the parsed result, and dedupes concurrent calls for the same key.
export function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  if (resolved.has(key)) return Promise.resolve(resolved.get(key) as T)
  if (inflight.has(key)) return inflight.get(key) as Promise<T>
  const p = fetcher()
    .then((data) => {
      resolved.set(key, data)
      return data
    })
    .finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}