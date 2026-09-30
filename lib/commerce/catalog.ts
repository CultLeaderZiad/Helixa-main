import type { OutboundCard, OutboundContent } from "@/lib/channels/types"

export interface CatalogProduct {
  id: string
  name: string
  description?: string | null
  priceCents: number
  currency: string
  imageUrl?: string | null
  productUrl?: string | null
  inStock?: boolean
  sku?: string | null
}

export interface ProductInput {
  name: string
  description?: string | null
  priceCents: number
  currency: string
  imageUrl?: string | null
  productUrl?: string | null
  inStock: boolean
  sku?: string | null
  source: "manual" | "csv" | "shopify" | "woocommerce"
  externalId?: string | null
}

export function formatMoney(cents: number, currency: string): string {
  const amount = (Number(cents) || 0) / 100
  const value = Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(2)
  return `${value} ${currency || "EGP"}`
}

export function priceToCents(raw: string): number | null {
  const cleaned = raw.trim().replace(/[^0-9.,]/g, "").replace(",", ".")
  if (!cleaned) return null
  const value = Number(cleaned)
  if (!Number.isFinite(value) || value < 0) return null
  return Math.round(value * 100)
}

export function parseProductCsv(text: string): { products: ProductInput[]; errors: string[] } {
  const lines = text.replace(/\r/g, "").split("\n").filter((line) => line.trim())
  if (lines.length < 2) return { products: [], errors: ["CSV needs a header and one row"] }
  const header = splitCsvLine(lines[0]).map((cell) => cell.trim().toLowerCase())
  const index = (name: string) => header.indexOf(name)
  const nameIndex = index("name")
  if (nameIndex < 0) return { products: [], errors: ["CSV needs a name column"] }
  const products: ProductInput[] = []
  const errors: string[] = []
  for (let row = 1; row < lines.length; row += 1) {
    const cells = splitCsvLine(lines[row])
    const name = cells[nameIndex]?.trim()
    if (!name) {
      errors.push(`Row ${row + 1} is missing a name`)
      continue
    }
    const price = priceToCents(cells[index("price")] || cells[index("price_cents")] || "0")
    const cents = index("price_cents") >= 0 && !header.includes("price") ? Number(cells[index("price_cents")] || 0) : price
    products.push({
      name: name.slice(0, 160),
      description: cell(cells, index("description")),
      priceCents: Number.isFinite(cents) ? Math.max(0, Math.round(Number(cents))) : 0,
      currency: (cell(cells, index("currency")) || "EGP").toUpperCase().slice(0, 8),
      imageUrl: cell(cells, index("image_url")),
      productUrl: cell(cells, index("url")) || cell(cells, index("product_url")),
      inStock: !/^(0|false|no)$/i.test(cell(cells, index("in_stock")) || "true"),
      sku: cell(cells, index("sku")),
      source: "csv",
      externalId: cell(cells, index("sku")) || name.toLowerCase(),
    })
  }
  return { products, errors }
}

function cell(cells: string[], index: number): string | null {
  if (index < 0) return null
  const value = cells[index]?.trim()
  return value || null
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ""
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else quoted = !quoted
      continue
    }
    if (char === "," && !quoted) {
      cells.push(current)
      current = ""
      continue
    }
    current += char
  }
  cells.push(current)
  return cells
}

export function productCard(product: CatalogProduct): OutboundCard {
  const buttons = []
  if (product.productUrl && /^https:\/\//i.test(product.productUrl)) {
    buttons.push({ type: "web_url" as const, title: "View", url: product.productUrl })
  }
  return {
    title: product.name.slice(0, 80),
    subtitle: [formatMoney(product.priceCents, product.currency), product.description || ""].filter(Boolean).join(" · ").slice(0, 80),
    image_url: product.imageUrl && /^https:\/\//i.test(product.imageUrl) ? product.imageUrl : undefined,
    buttons,
  }
}

export function productsToContent(products: CatalogProduct[], intro?: string): OutboundContent {
  const available = products.filter((product) => product.inStock !== false)
  if (available.length === 0) {
    return { message: intro || "This product isn't available right now." }
  }
  if (available.length === 1) {
    return { message: intro || undefined, card: productCard(available[0]) }
  }
  return { message: intro || undefined, cards: available.slice(0, 10).map(productCard) }
}

export function mapShopifyProduct(raw: any): ProductInput | null {
  const variant = Array.isArray(raw?.variants) ? raw.variants[0] : null
  const name = String(raw?.title || "").trim()
  if (!name) return null
  const price = priceToCents(String(variant?.price || "0")) ?? 0
  const image = raw?.image?.src || raw?.images?.[0]?.src || null
  return {
    name,
    description: String(raw?.body_html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 2000) || null,
    priceCents: price,
    currency: "USD",
    imageUrl: image,
    productUrl: null,
    inStock: variant ? variant.inventory_quantity !== 0 : true,
    sku: variant?.sku || null,
    source: "shopify",
    externalId: String(raw.id),
  }
}

export function mapWooProduct(raw: any): ProductInput | null {
  const name = String(raw?.name || "").trim()
  if (!name) return null
  return {
    name,
    description: String(raw?.short_description || raw?.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 2000) || null,
    priceCents: priceToCents(String(raw?.price || "0")) ?? 0,
    currency: String(raw?.currency || "EGP").toUpperCase(),
    imageUrl: raw?.images?.[0]?.src || null,
    productUrl: raw?.permalink || null,
    inStock: raw?.stock_status !== "outofstock",
    sku: raw?.sku || null,
    source: "woocommerce",
    externalId: String(raw.id),
  }
}
