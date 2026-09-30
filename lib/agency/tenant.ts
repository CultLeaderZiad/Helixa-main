export interface AgencyBrand {
  id: string
  name: string
  appName: string
  logoUrl: string | null
  primaryColor: string
  accentColor: string
  customDomain: string | null
}

const COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export function normalizeHost(input: string | null | undefined): string {
  const raw = String(input || "").trim().toLowerCase()
  if (!raw) return ""
  const withoutProtocol = raw.replace(/^[a-z]+:\/\//, "")
  const host = withoutProtocol.split("/")[0].split("@").pop() || ""
  return host.replace(/:\d+$/, "").replace(/\.$/, "")
}

export function platformHosts(appUrl?: string | null): Set<string> {
  const hosts = new Set<string>(["localhost", "127.0.0.1", "0.0.0.0"])
  const configured = normalizeHost(appUrl || process.env.NEXT_PUBLIC_APP_URL || "")
  if (configured) hosts.add(configured)
  return hosts
}

export function isPlatformHost(host: string, appUrl?: string | null): boolean {
  const normalized = normalizeHost(host)
  if (!normalized) return true
  if (platformHosts(appUrl).has(normalized)) return true
  return false
}

/**
 * Host-based tenant lookup. The platform's own host never selects an agency,
 * so the main Helixa domain keeps working beside a client's custom domain.
 */
export function resolveAgencyByHost(host: string | null | undefined, agencies: AgencyBrand[], appUrl?: string | null): AgencyBrand | null {
  const normalized = normalizeHost(host)
  if (!normalized || isPlatformHost(normalized, appUrl)) return null
  return agencies.find((agency) => normalizeHost(agency.customDomain) === normalized) || null
}

export function sanitizeBrand(input: {
  name?: string
  appName?: string
  logoUrl?: string | null
  primaryColor?: string
  accentColor?: string
  customDomain?: string | null
}): { ok: true; value: Omit<AgencyBrand, "id"> } | { ok: false; error: string } {
  const name = String(input.name || "").trim().slice(0, 80)
  const appName = String(input.appName || name || "Helixa").trim().slice(0, 40)
  if (!name) return { ok: false, error: "Agency name is required" }
  const primary = String(input.primaryColor || "#5b4dff")
  const accent = String(input.accentColor || "#e5a93c")
  if (!COLOR.test(primary) || !COLOR.test(accent)) return { ok: false, error: "Colors must be hex values" }
  const logo = String(input.logoUrl || "").trim()
  if (logo && !/^https:\/\//i.test(logo)) return { ok: false, error: "Logo must be an https URL" }
  const domain = normalizeHost(input.customDomain || "")
  if (domain && (domain.includes(" ") || !domain.includes("."))) return { ok: false, error: "Custom domain must be a hostname" }
  if (domain && isPlatformHost(domain)) return { ok: false, error: "That host is reserved for Helixa" }
  return {
    ok: true,
    value: {
      name,
      appName: appName || "Helixa",
      logoUrl: logo || null,
      primaryColor: primary,
      accentColor: accent,
      customDomain: domain || null,
    },
  }
}
