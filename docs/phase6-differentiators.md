# Phase 6 differentiators

This stacks on phase 5 (`cursor/phase5-flows-broadcasts-eff1`). The SQL file is
`supabase/migrations/20260930_phase6_differentiators.sql`. It was not applied
to a live database.

## Manual setup

1. In the Supabase dashboard, enable the `vector` extension (pgvector), then run the phase 6 SQL file in the SQL editor. `CREATE EXTENSION` is in the file; some projects still need the extension toggled on first.
2. Keep `BYOK_ENCRYPTION_SECRET` (16+ characters). Payment gateway secrets, webhook signing secrets, and Sheets/HubSpot tokens are encrypted with it.
3. `OPENAI_API_KEY` is optional. With it, chunks use `text-embedding-3-small` at 384 dimensions. Without it, retrieval uses a local hash embedding. Re-save the knowledge base if you switch.
4. The existing Groq/BYOK layer still answers. The agent key is `send_trigger_replies`.
5. Paymob (Egypt): create an Accept account, an integration id, an iframe id, an API key, and an HMAC secret. Save them under Integrations. Point the Paymob callback at `https://<your-domain>/api/payments/paymob`.
6. Stripe: a secret key and a webhook signing secret. Point Stripe at `https://<your-domain>/api/payments/stripe` for `checkout.session.completed` and `checkout.session.expired`.
7. Shopify Admin API token and shop host, or WooCommerce REST key and site URL, are saved on the catalog screen's sync credentials (`PUT /api/catalog`).
8. Google Sheets needs an OAuth access token with the spreadsheets scope. HubSpot needs a private app token. Neither refresh flow is built.
9. `CRON_SECRET` must be set. Vercel Cron calls `/api/cron/client-reports` daily at 06:00 UTC. Weekly and monthly schedules are rows, so the daily cron is what sends them.
10. SMTP stays in Admin → app settings. If it is missing, the report row and share link are still stored and the email is skipped.

## Custom domain on Vercel

1. Save the hostname on the Agency screen. It is stored lowercased and must not be the Helixa app host.
2. In the Vercel project, open Settings → Domains and add that hostname.
3. At the client's DNS, add the record Vercel shows (usually a CNAME to `cname.vercel-dns.com`, or the A record Vercel gives for an apex).
4. Wait until Vercel marks the domain valid and the certificate is issued.
5. Requests to that host are resolved in middleware: the `Host` header is matched to `agencies.custom_domain`, and `x-helixa-agency` is set. The platform's own `NEXT_PUBLIC_APP_URL` host is never treated as a tenant.
6. Redeploy after `NEXT_PUBLIC_APP_URL` changes so the platform host stays excluded.

## What is unverified

- No live Supabase, pgvector, Paymob, Stripe, Shopify, WooCommerce, Google, HubSpot, or SMTP call was made.
- The PDF uses Helvetica, which has no Arabic glyphs. The share page is the Arabic-capable copy. The PDF is Latin labels and numbers.
- Website import does not follow redirects and only keeps visible text.
- PDF upload extracts literal strings. Compressed PDF streams are not decoded.
- Shopify sync does not page past 50 products and stores the shop currency you type, defaulting the mapper to USD when the shop response has no currency.
- Order-status flows start only when a verified Paymob or Stripe webhook moves the order.
