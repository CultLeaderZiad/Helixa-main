-- Add Final Settings to automations table
ALTER TABLE public.automations 
ADD COLUMN IF NOT EXISTS check_follow BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS typing_indicator BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS delay_seconds INTEGER NOT NULL DEFAULT 0;
