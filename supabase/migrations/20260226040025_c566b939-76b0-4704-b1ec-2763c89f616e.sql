
-- Add pending_approval and talla_polera to vendors
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS pending_approval boolean NOT NULL DEFAULT false;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS talla_polera text;

-- Create vendor_store_history table
CREATE TABLE IF NOT EXISTS public.vendor_store_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  previous_store text,
  new_store text,
  changed_by uuid NOT NULL,
  observation text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_store_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage store history" ON public.vendor_store_history
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Vendors read own store history" ON public.vendor_store_history
FOR SELECT USING (
  vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
);
