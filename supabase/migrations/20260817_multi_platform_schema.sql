-- 20260817_multi_platform_schema.sql
-- Add 'platform' column to 'conversations' and 'messages' for multi-channel support.

-- Add to conversations
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT 'instagram';

CREATE INDEX IF NOT EXISTS idx_conversations_platform ON conversations(platform);

-- Add to messages
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT 'instagram';

CREATE INDEX IF NOT EXISTS idx_messages_platform ON messages(platform);

-- We keep is_from_instagram for backward compatibility for now,
-- but the new platform column will be used going forward.
