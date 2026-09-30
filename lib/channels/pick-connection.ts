/**
 * Choose the platform row a human reply must use.
 * Several WhatsApp numbers (or widgets, or TikTok accounts) can share a workspace.
 * The first row is never a guess: without a stored account id, more than one
 * row is ambiguous and the caller must ask which one.
 */
export function pickChannelConnection<T extends { page_id?: string | null }>(
  rows: T[] | null | undefined,
  channelAccountId?: string | null,
): { row: T | null; ambiguous: boolean } {
  const list = (rows || []).filter(Boolean)
  if (channelAccountId) {
    const match = list.find((row) => String(row.page_id || "") === String(channelAccountId))
    return { row: match || null, ambiguous: false }
  }
  if (list.length === 1) return { row: list[0], ambiguous: false }
  if (list.length === 0) return { row: null, ambiguous: false }
  return { row: null, ambiguous: true }
}
