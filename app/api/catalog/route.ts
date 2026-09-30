export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { workspaceSession, isMissingTable } from "@/lib/flows/session"
import { parseProductCsv } from "@/lib/commerce/catalog"
import { fetchShopifyProducts, fetchWooProducts } from "@/lib/commerce/sync"
import { decryptString, encryptString } from "@/lib/crypto"

export async function GET(request: NextRequest) {
  const session = await workspaceSession(request)
  if ("response" in session && session.response) return session.response
  const { data, error } = await session.supabase.from("products").select("*").eq("user_id", session.userId).order("updated_at", { ascending: false }).limit(200)
  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ products: [], migration_required: true })
    return NextResponse.json({ error: "Failed to load products" }, { status: 500 })
  }
  return NextResponse.json({ products: data || [] })
}

export async function POST(request: NextRequest) {
  const session = await workspaceSession(request)
  if ("response" in session && session.response) return session.response
  const body = await request.json().catch(() => ({}))
  if (body.csv) {
    const parsed = parseProductCsv(String(body.csv))
    if (!parsed.products.length) return NextResponse.json({ error: parsed.errors[0] || "No rows" }, { status: 400 })
    const rows = parsed.products.map((product) => ({
      workspace_id: session.workspaceId,
      user_id: session.userId,
      name: product.name,
      description: product.description,
      price_cents: product.priceCents,
      currency: product.currency,
      image_url: product.imageUrl,
      product_url: product.productUrl,
      in_stock: product.inStock,
      sku: product.sku,
      source: "csv",
      external_id: product.externalId,
      updated_at: new Date().toISOString(),
    }))
    const saved = await session.supabase.from("products").upsert(rows, { onConflict: "user_id,source,external_id" })
    if (saved.error) return NextResponse.json({ error: saved.error.message, errors: parsed.errors }, { status: 400 })
    return NextResponse.json({ imported: rows.length, errors: parsed.errors })
  }
  if (body.sync === "shopify" || body.sync === "woocommerce") {
    return syncStore(session, body.sync)
  }
  const name = String(body.name || "").trim()
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 })
  const inserted = await session.supabase.from("products").insert({
    workspace_id: session.workspaceId,
    user_id: session.userId,
    name: name.slice(0, 160),
    description: String(body.description || "").slice(0, 2000),
    price_cents: Math.max(0, Math.round(Number(body.priceCents || 0))),
    currency: String(body.currency || "EGP").toUpperCase().slice(0, 8),
    image_url: body.imageUrl || null,
    product_url: body.productUrl || null,
    in_stock: body.inStock !== false,
    sku: body.sku || null,
    source: "manual",
  }).select("id").maybeSingle()
  if (inserted.error) {
    if (isMissingTable(inserted.error)) return NextResponse.json({ error: "Run the phase 6 migration first" }, { status: 503 })
    return NextResponse.json({ error: inserted.error.message }, { status: 400 })
  }
  return NextResponse.json({ id: inserted.data?.id })
}

async function syncStore(session: { supabase: any; userId: string | number; workspaceId: string | null }, kind: "shopify" | "woocommerce") {
  const config = await session.supabase.from("integration_configs").select("config, secret_ciphertext").eq("user_id", session.userId).eq("kind", kind).maybeSingle()
  if (!config.data?.secret_ciphertext) return NextResponse.json({ error: `Save ${kind} credentials first` }, { status: 400 })
  const secret = decryptString(config.data.secret_ciphertext)
  if (!secret) return NextResponse.json({ error: "Could not read the stored secret" }, { status: 400 })
  const products = kind === "shopify"
    ? await fetchShopifyProducts(String(config.data.config?.shop || ""), secret)
    : await fetchWooProducts(String(config.data.config?.site || ""), String(config.data.config?.key || ""), secret)
  if (!products.length) return NextResponse.json({ imported: 0 })
  const rows = products.map((product) => ({
    workspace_id: session.workspaceId,
    user_id: session.userId,
    name: product.name,
    description: product.description,
    price_cents: product.priceCents,
    currency: kind === "shopify" ? String(config.data.config?.currency || product.currency) : product.currency,
    image_url: product.imageUrl,
    product_url: product.productUrl,
    in_stock: product.inStock,
    sku: product.sku,
    source: product.source,
    external_id: product.externalId,
    updated_at: new Date().toISOString(),
  }))
  const saved = await session.supabase.from("products").upsert(rows, { onConflict: "user_id,source,external_id" })
  if (saved.error) return NextResponse.json({ error: saved.error.message }, { status: 400 })
  return NextResponse.json({ imported: rows.length })
}

export async function PUT(request: NextRequest) {
  const session = await workspaceSession(request)
  if ("response" in session && session.response) return session.response
  const body = await request.json().catch(() => ({}))
  const kind = body.kind === "woocommerce" ? "woocommerce" : body.kind === "shopify" ? "shopify" : null
  if (!kind) return NextResponse.json({ error: "kind must be shopify or woocommerce" }, { status: 400 })
  let secret = ""
  try {
    secret = encryptString(String(body.secret || ""))
  } catch {
    return NextResponse.json({ error: "BYOK_ENCRYPTION_SECRET is required to store credentials" }, { status: 503 })
  }
  const saved = await session.supabase.from("integration_configs").upsert({
    user_id: session.userId,
    workspace_id: session.workspaceId,
    kind,
    config: kind === "shopify" ? { shop: body.shop, currency: body.currency || "EGP" } : { site: body.site, key: body.key },
    secret_ciphertext: secret,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,kind" })
  if (saved.error) return NextResponse.json({ error: saved.error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
