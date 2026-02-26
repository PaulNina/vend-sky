
-- Add a parametrizable flag to campaigns for requiring vendor approval
ALTER TABLE public.campaigns 
ADD COLUMN require_vendor_approval boolean NOT NULL DEFAULT false;

-- COMMENT: When false (default), vendors register and can use the system immediately.
-- When true, vendors must be approved by an admin before accessing the vendor portal.
