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