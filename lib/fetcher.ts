import type { SWRConfiguration } from "swr"

export const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok) {
    const error = new Error(data.error || `Request failed (${res.status})`)
    ;(error as any).status = res.status
    ;(error as any).info = data
    throw error
  }
  return data
}

/**
 * Global SWR defaults to make the app feel fast and reliable:
 * - dedupingInterval: identical requests within 60s share one network call
 *   (pages were re-fetching the same session/connections/stats on every mount)
 * - revalidateOnFocus OFF: switching browser tabs no longer triggers a
 *   refetch storm across every SWR hook on the page
 * - keep previous data while revalidating to avoid layout flicker
 */
export const swrConfig: SWRConfiguration = {
  fetcher,
  dedupingInterval: 60_000,
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  keepPreviousData: true,
  shouldRetryOnError: true,
  errorRetryCount: 2,
  errorRetryInterval: 3000,
}