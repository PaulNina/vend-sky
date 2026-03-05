
-- Phase 1: Extend campaigns with period configuration columns
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS close_reason text,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_periods_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS period_mode text NOT NULL DEFAULT 'WEEKLY',
  ADD COLUMN IF NOT EXISTS custom_days integer,
  ADD COLUMN IF NOT EXISTS anchor_date date,
  ADD COLUMN IF NOT EXISTS close_time_local text NOT NULL DEFAULT '23:59',
  ADD COLUMN IF NOT EXISTS report_on_close boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS report_recipients_mode text NOT NULL DEFAULT 'BY_CITY',
  ADD COLUMN IF NOT EXISTS enforce_sales_within_campaign boolean NOT NULL DEFAULT true;

-- Sync status with existing is_active
UPDATE public.campaigns SET status = 'active' WHERE is_active = true;
UPDATE public.campaigns SET status = 'closed' WHERE is_active = false;

-- Set anchor_date to start_date for existing campaigns
UPDATE public.campaigns SET anchor_date = start_date WHERE anchor_date IS NULL;

-- Phase 2: Create campaign_periods table
CREATE TABLE public.campaign_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  period_number integer NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'open',
  closed_at timestamptz,
  closed_by uuid,
  settlement_generated_at timestamptz,
  report_generated_at timestamptz,
  report_sent_at timestamptz,
  UNIQUE(campaign_id, period_number),
  UNIQUE(campaign_id, period_start, period_end)
);

ALTER TABLE public.campaign_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage campaign_periods" ON public.campaign_periods
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated read campaign_periods" ON public.campaign_periods
  FOR SELECT TO authenticated
  USING (true);

-- Phase 3: Add period_id to commission_payments
ALTER TABLE public.commission_payments
  ADD COLUMN IF NOT EXISTS period_id uuid REFERENCES public.campaign_periods(id);
