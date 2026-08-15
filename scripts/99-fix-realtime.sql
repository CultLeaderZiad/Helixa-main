-- 99-fix-realtime.sql
-- Run this in your Supabase SQL Editor to enable real-time broadcasts for User Management and Dashboard syncing.

-- Add the tables to the supabase_realtime publication
BEGIN;

  -- Ensure publication exists
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      CREATE PUBLICATION supabase_realtime;
    END IF;
  END
  $$;

  -- Add accounts table for auth/ban syncing
  ALTER PUBLICATION supabase_realtime ADD TABLE accounts;

  -- Add users table for profile/plan syncing
  ALTER PUBLICATION supabase_realtime ADD TABLE users;

  -- Add payment_submissions for checkout syncing
  ALTER PUBLICATION supabase_realtime ADD TABLE payment_submissions;

  -- Add email_campaigns for campaign tracking
  ALTER PUBLICATION supabase_realtime ADD TABLE email_campaigns;

COMMIT;
