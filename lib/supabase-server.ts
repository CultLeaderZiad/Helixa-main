import { createServerClient } from "@supabase/ssr"
import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

/**
 * Create a Supabase server client
 * Use this in API routes and server actions
 */
export async function getSupabaseServerClient() {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set")
  }
  if (!supabaseAnonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set")
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
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
 * Cached singleton for the Supabase service-role (RLS-bypass) client.
 *
 * Previous implementation created a new client on every call, which on Vercel
 * serverless meant a fresh `import("@supabase/supabase-js")` dynamic import
 * (~100-300ms cold start) plus a new TCP connection to Supabase. This module-
 * level cache reuses a single client across all requests in the same Lambda
 * invocation, dramatically reducing latency.
 */
let _bypassClient: SupabaseClient | null = null

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
export async function getSupabaseBypassClient(): Promise<SupabaseClient> {
  if (_bypassClient) return _bypassClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and " +
      "SUPABASE_SERVICE_ROLE_KEY in your Vercel environment variables."
    )
  }

  _bypassClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  return _bypassClient
}
