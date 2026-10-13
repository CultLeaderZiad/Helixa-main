<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Supabase-Postgres-3ECF8E?style=for-the-badge&logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="MIT License" />
</p>

<h1 align="center">⚡ Cyreax DM</h1>

<p align="center">
  <strong>DM automation platform for every channel — Instagram, WhatsApp, Facebook, Telegram, TikTok comment-to-DM funnels, keyword triggers, story replies, AI auto-replies, and a unified live inbox.</strong>
</p>

<p align="center">
  Production-grade DM automation for creators, agencies, and brands — with multi-tenant workspace isolation, Arabic/English bi-directional support, and granular RBAC.
</p>

---

## Getting Started

1. Copy `.env.example` to `.env.local` and populate environment variables:
   ```bash
   cp .env.example .env.local
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Run the development server:
   ```bash
   pnpm dev
   ```

## Bootstrapping Platform Admin

Platform administrators and owners are managed strictly via database RBAC (`platform_admins` table). To bootstrap the first platform owner:

```sql
-- Find or create the target account ID
SELECT id, email, role FROM accounts WHERE email = 'your-admin@example.com';

-- Promote the account to admin and grant platform ownership
UPDATE accounts SET role = 'admin' WHERE id = '<account_uuid>';
INSERT INTO platform_admins (account_id, is_owner)
VALUES ('<account_uuid>', true)
ON CONFLICT (account_id) DO UPDATE SET is_owner = true;
```

---

## Credits & License

Released under the MIT License. Copyright (c) 2026 flexhunt. See [LICENSE](./LICENSE).
This project is derived from open-source DM automation tooling, originally released under the MIT License ("Copyright (c) 2026 flexhunt"). Substantial multi-tenant architecture, local payment processing, channel integrations, dialect routing, and the Cyreax DM dashboard were engineered on top of that base.
