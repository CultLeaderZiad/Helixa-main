# Admin Email Campaign Center

## Overview

The Admin Email Campaign Center provides a native solution for Helixa admins to create, manage, and send email campaigns to customers directly from the dashboard, without needing external ESP dashboards (like Mailchimp or Mailgun's UI).

It leverages **Mailgun** under the hood via standard API endpoints, meaning you have complete control over the UI, data privacy, and customer filters based on native Supabase data (roles, plans).

## Core Capabilities

- **Create Campaigns**: Define subjects, preview texts, hero images, headings, features, and CTAs.
- **Audience Filtering**: Send to all customers, or segment by plan (Free Trial, Monthly, One-Time, Expired).
- **Test Mode**: Admins can send a preview email to their own email address.
- **Bulk Sending**: Sequentially chunks and sends emails using the underlying provider.

## How to Set Up

### 1. Database Migration
Run the SQL script in your Supabase SQL Editor to create the necessary tables:
\`\`\`sql
-- Look in scripts/35-schema-email-campaigns.sql
\`\`\`
This creates `email_campaigns`, `email_campaign_recipients`, and `email_logs`.

### 2. Environment Variables
Update your `.env.local` or Vercel Environment Variables to include Mailgun credentials:
\`\`\`env
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=mg.yourdomain.com
MAILGUN_FROM_EMAIL=hello@yourdomain.com
MAILGUN_FROM_NAME="Helixa"
MAILGUN_REPLY_TO=hello@yourdomain.com
\`\`\`

### 3. Usage
Navigate to the Admin Dashboard (you must be an admin), and click on **Email Campaigns** in the sidebar.

## Production Considerations

Currently, the `send` API endpoint processes emails synchronously in batches. While this works well for smaller lists (under ~500 customers), Vercel's serverless functions have execution time limits (10s for hobby, 60s for pro).

**For large-scale scaling**, you should replace the sequential loop in `app/api/admin/campaigns/[id]/send/route.ts` with a background job queue like Inngest, Quirrel, or QStash.
