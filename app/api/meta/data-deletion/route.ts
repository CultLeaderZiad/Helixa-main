export const dynamic = "force-dynamic"

import { handleMetaDataDeletion } from "@/lib/meta/deletion"

/** Meta Data Deletion Request callback. POST signed_request, return url + confirmation_code. */
export async function POST(request: Request) {
  return handleMetaDataDeletion(request)
}
