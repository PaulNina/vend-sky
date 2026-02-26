
-- Add scheduled registration window to campaigns
ALTER TABLE public.campaigns
  ADD COLUMN registration_open_at timestamp with time zone,
  ADD COLUMN registration_close_at timestamp with time zone;

COMMENT ON COLUMN public.campaigns.registration_open_at IS 'If set, registration auto-enables at this datetime';
COMMENT ON COLUMN public.campaigns.registration_close_at IS 'If set, registration auto-disables at this datetime';
