export const dynamic = "force-dynamic"

import { handleMetaDeauthorize } from "@/lib/meta/deletion"

/** Meta Deauthorize callback. Clears tokens and marks the connection for reconnect. */
export async function POST(request: Request) {
  return handleMetaDeauthorize(request)
}
