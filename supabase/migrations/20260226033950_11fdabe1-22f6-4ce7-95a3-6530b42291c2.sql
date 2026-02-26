
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('vendedor', 'revisor_ciudad', 'supervisor', 'admin');
CREATE TYPE public.sale_status AS ENUM ('pending', 'approved', 'rejected', 'closed');
CREATE TYPE public.serial_status AS ENUM ('available', 'used', 'blocked');
CREATE TYPE public.review_decision AS ENUM ('approved', 'rejected');
CREATE TYPE public.audit_action AS ENUM ('ok', 'revert');

-- 1. user_roles (FIRST - needed by has_role function)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  city text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. vendors (needed by get_user_city)
CREATE TABLE public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name text NOT NULL,
  email text,
  phone text,
  city text NOT NULL,
  store_name text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- 3. Helper functions (tables exist now)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_city(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT city FROM public.vendors WHERE user_id = _user_id LIMIT 1
$$;

-- RLS on user_roles
CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS on vendors
CREATE POLICY "Vendors read own data" ON public.vendors
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'supervisor')
    OR (public.has_role(auth.uid(), 'revisor_ciudad') AND city = public.get_user_city(auth.uid()))
  );

CREATE POLICY "Admins manage vendors" ON public.vendors
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. campaigns
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subtitle text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  registration_enabled boolean NOT NULL DEFAULT true,
  ai_date_validation boolean NOT NULL DEFAULT false,
  points_mode text NOT NULL DEFAULT 'product',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read campaigns" ON public.campaigns
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage campaigns" ON public.campaigns
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. vendor_blocks
CREATE TABLE public.vendor_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
  start_at timestamptz NOT NULL DEFAULT now(),
  end_at timestamptz,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vendor_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage blocks" ON public.vendor_blocks
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Vendors read own blocks" ON public.vendor_blocks
  FOR SELECT TO authenticated
  USING (vendor_id IN (SELECT v.id FROM public.vendors v WHERE v.user_id = auth.uid()));

-- 6. products
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_code text NOT NULL UNIQUE,
  name text NOT NULL,
  size_inches numeric,
  points_value integer NOT NULL DEFAULT 0,
  bonus_bs_value numeric(10,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read products" ON public.products
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage products" ON public.products
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. serials
CREATE TABLE public.serials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serial text NOT NULL UNIQUE,
  product_id uuid REFERENCES public.products(id),
  status serial_status NOT NULL DEFAULT 'available',
  used_sale_id uuid,
  imported_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.serials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read serials" ON public.serials
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage serials" ON public.serials
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 8. restricted_serials
CREATE TABLE public.restricted_serials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serial text NOT NULL,
  reason text NOT NULL,
  source_campaign text,
  imported_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.restricted_serials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read restricted" ON public.restricted_serials
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage restricted" ON public.restricted_serials
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 9. sales
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) NOT NULL,
  vendor_id uuid REFERENCES public.vendors(id) NOT NULL,
  product_id uuid REFERENCES public.products(id) NOT NULL,
  serial text NOT NULL,
  sale_date date NOT NULL,
  week_start date NOT NULL,
  week_end date NOT NULL,
  status sale_status NOT NULL DEFAULT 'pending',
  points integer NOT NULL DEFAULT 0,
  bonus_bs numeric(10,2) NOT NULL DEFAULT 0,
  city text NOT NULL,
  ai_flag boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors read own sales" ON public.sales
  FOR SELECT TO authenticated
  USING (
    vendor_id IN (SELECT v.id FROM public.vendors v WHERE v.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'supervisor')
    OR (public.has_role(auth.uid(), 'revisor_ciudad') AND city = public.get_user_city(auth.uid()))
  );

CREATE POLICY "Vendors insert own sales" ON public.sales
  FOR INSERT TO authenticated
  WITH CHECK (vendor_id IN (SELECT v.id FROM public.vendors v WHERE v.user_id = auth.uid()));

CREATE POLICY "Reviewers and admins update sales" ON public.sales
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'supervisor')
    OR (public.has_role(auth.uid(), 'revisor_ciudad') AND city = public.get_user_city(auth.uid()))
  );

-- 10. sale_attachments
CREATE TABLE public.sale_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL UNIQUE,
  tag_url text NOT NULL,
  poliza_url text NOT NULL,
  nota_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sale_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read attachments" ON public.sale_attachments
  FOR SELECT TO authenticated
  USING (
    sale_id IN (SELECT s.id FROM public.sales s WHERE s.vendor_id IN (SELECT v.id FROM public.vendors v WHERE v.user_id = auth.uid()))
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'supervisor')
    OR public.has_role(auth.uid(), 'revisor_ciudad')
  );

CREATE POLICY "Vendors insert attachments" ON public.sale_attachments
  FOR INSERT TO authenticated
  WITH CHECK (sale_id IN (SELECT s.id FROM public.sales s WHERE s.vendor_id IN (SELECT v.id FROM public.vendors v WHERE v.user_id = auth.uid())));

-- 11. reviews
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  reviewer_user_id uuid REFERENCES auth.users(id) NOT NULL,
  decision review_decision NOT NULL,
  reason text NOT NULL,
  reviewed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read reviews" ON public.reviews
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'supervisor')
    OR public.has_role(auth.uid(), 'revisor_ciudad')
    OR reviewer_user_id = auth.uid()
  );

CREATE POLICY "Insert reviews" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'revisor_ciudad')
    OR public.has_role(auth.uid(), 'supervisor')
    OR public.has_role(auth.uid(), 'admin')
  );

-- 12. supervisor_audits
CREATE TABLE public.supervisor_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  supervisor_user_id uuid REFERENCES auth.users(id) NOT NULL,
  action audit_action NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.supervisor_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supervisors manage audits" ON public.supervisor_audits
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'));

-- 13. report_recipients
CREATE TABLE public.report_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  city text NOT NULL,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.report_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage recipients" ON public.report_recipients
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('sale-attachments', 'sale-attachments', false);

CREATE POLICY "Vendors upload attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'sale-attachments');

CREATE POLICY "Authenticated read attachments" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'sale-attachments');

-- Ranking helper function
CREATE OR REPLACE FUNCTION public.get_campaign_ranking(_campaign_id uuid)
RETURNS TABLE (
  vendor_id uuid,
  full_name text,
  city text,
  store_name text,
  total_points bigint,
  total_bonus_bs numeric,
  total_units bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    v.id AS vendor_id,
    v.full_name,
    v.city,
    v.store_name,
    COALESCE(SUM(CASE WHEN s.status = 'approved' THEN s.points ELSE 0 END), 0)::bigint AS total_points,
    COALESCE(SUM(CASE WHEN s.status = 'approved' THEN s.bonus_bs ELSE 0 END), 0) AS total_bonus_bs,
    COALESCE(COUNT(CASE WHEN s.status = 'approved' THEN 1 END), 0)::bigint AS total_units
  FROM public.vendors v
  LEFT JOIN public.sales s ON s.vendor_id = v.id AND s.campaign_id = _campaign_id
  WHERE v.is_active = true
  GROUP BY v.id, v.full_name, v.city, v.store_name
  ORDER BY total_points DESC, total_units DESC
$$;
