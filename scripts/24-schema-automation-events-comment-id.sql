-- Add comment_id to automation_events to track which comments have already received a private reply
ALTER TABLE public.automation_events ADD COLUMN IF NOT EXISTS comment_id TEXT;
CREATE INDEX IF NOT EXISTS idx_automation_events_comment ON public.automation_events(comment_id);
