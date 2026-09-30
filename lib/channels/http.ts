import type { FetchLike, SendOutcome } from "@/lib/channels/types"

export async function postJson(
  fetchImpl: FetchLike,
  url: string,
  body: unknown,
  headers?: Record<string, string>,
): Promise<{ ok: boolean; status: number; json: any }> {
  const response = await fetchImpl(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  })
  let json: any = null
  try {
    json = await response.json()
  } catch {
    json = null
  }
  return { ok: response.ok, status: response.status, json }
}

export function graphOutcome(json: any, id?: string): SendOutcome {
  if (json?.error) {
    const code = typeof json.error.code === "number" ? json.error.code : undefined
    const message = typeof json.error.message === "string" ? json.error.message : JSON.stringify(json.error)
    return {
      ok: false,
      code,
      error: code === 131047 ? "OUTSIDE_WINDOW" : message,
      outsideWindow: code === 131047,
    }
  }
  return { ok: true, id: id || json?.id || json?.message_id }
}

export function defaultFetch(): FetchLike {
  return (input, init) => fetch(input, init)
}
