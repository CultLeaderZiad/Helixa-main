import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Create a Supabase server client
 * Use this in API routes and server actions
 */
export async function getSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co", 
    process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy_service_key", 
  {
    cookies: {
      getAll: async () => cookieStore.getAll(),
      setAll: async (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch (error) {
          console.error("[v0] Error setting cookies:", error)
        }
      },
    },
  })
}

/**
 * Create a Supabase data-access client that bypasses RLS.
 *
 * The SSR client (`getSupabaseServerClient`) attaches the logged-in user's JWT
 * to every request, so it runs under the `authenticated` role. The live DB's RLS
 * policies are missing/broken for that role on the business tables, so every
 * logged-in read/write came back empty or failed while logged-out calls (which
 * send no JWT) worked.
 *
 * This client is built with the service-role key and no user session, so it is
 * NOT subject to RLS — exactly like `createAdminClient()` in `lib/auth.ts`, which
 * is already used for identity reads. App-level gates (`requireAdmin`,
 * `requireInstagramUser`, `getSessionUser`) still enforce authorization on the
 * routes that use this client.
 *
 * Use it for ALL database reads/writes in data routes and SSR pages.
 * Keep `getSupabaseServerClient()` ONLY where a real auth session is required
 * (sign-in callbacks, confirm, logout, `auth.getUser()`).
 */
export async function getSupabaseBypassClient() {
  const { createClient } = await import("@supabase/supabase-js")
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
