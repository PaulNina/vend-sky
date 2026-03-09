
-- Add 'observed' to sale_status enum
ALTER TYPE public.sale_status ADD VALUE IF NOT EXISTS 'observed';

-- Add 'observe' to audit_action enum
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'observe';
