export const dynamic = "force-dynamic"

import { type NextRequest } from "next/server"
import { csvResponse } from "@/app/api/contacts/route"

export async function GET(request: NextRequest) {
  return csvResponse(request)
}
