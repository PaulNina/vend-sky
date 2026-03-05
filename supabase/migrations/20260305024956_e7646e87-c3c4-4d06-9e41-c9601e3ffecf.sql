
-- 1. Add QR columns to vendors
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS qr_url text,
  ADD COLUMN IF NOT EXISTS qr_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS qr_expires_at timestamptz;

-- 2. Create commission_payment_status enum
DO $$ BEGIN
  CREATE TYPE public.commission_payment_status AS ENUM ('pending', 'paid');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Create commission_payments table
CREATE TABLE IF NOT EXISTS public.commission_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  units integer NOT NULL DEFAULT 0,
  amount_bs numeric NOT NULL DEFAULT 0,
  status commission_payment_status NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  paid_by uuid,
  payment_proof_url text,
  payment_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, vendor_id, period_start, period_end)
);

ALTER TABLE public.commission_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage commission_payments"
  ON public.commission_payments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Vendors read own commission_payments"
  ON public.commission_payments FOR SELECT
  TO authenticated
  USING (vendor_id IN (SELECT v.id FROM public.vendors v WHERE v.user_id = auth.uid()));

-- 4. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  read boolean NOT NULL DEFAULT false,
  data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- 5. Create email_templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  subject text NOT NULL,
  body_html text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  from_name text,
  reply_to text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage email_templates"
  ON public.email_templates FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('vendor-qr', 'vendor-qr', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', false) ON CONFLICT (id) DO NOTHING;

-- Storage RLS for vendor-qr: vendors upload/read own, admins read all
CREATE POLICY "Vendors upload own QR"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'vendor-qr' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Vendors read own QR"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'vendor-qr' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Admins read all QR"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'vendor-qr' AND public.has_role(auth.uid(), 'admin'));

-- Storage RLS for payment-proofs: admins upload/read
CREATE POLICY "Admins upload payment proofs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins read payment proofs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Vendors read own payment proofs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(), 'admin') IS FALSE AND EXISTS (
    SELECT 1 FROM public.commission_payments cp
    JOIN public.vendors v ON v.id = cp.vendor_id
    WHERE v.user_id = auth.uid() AND cp.payment_proof_url LIKE '%' || storage.filename(name) || '%'
  ));
