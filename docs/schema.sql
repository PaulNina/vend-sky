-- ============================================================
-- ESQUEMA COMPLETO DE BASE DE DATOS - Sistema de Ventas Skyworth
-- Generado: 2026-03-05
-- Compatible con: Supabase (PostgreSQL 15+)
-- ============================================================

-- ============================================================
-- 1. EXTENSIONES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 2. ENUMS
-- ============================================================
CREATE TYPE public.app_role AS ENUM ('vendedor', 'revisor_ciudad', 'supervisor', 'admin');
CREATE TYPE public.audit_action AS ENUM ('ok', 'revert');
CREATE TYPE public.commission_payment_status AS ENUM ('pending', 'paid');
CREATE TYPE public.review_decision AS ENUM ('approved', 'rejected');
CREATE TYPE public.sale_status AS ENUM ('pending', 'approved', 'rejected', 'closed');
CREATE TYPE public.serial_status AS ENUM ('available', 'used', 'blocked');

-- ============================================================
-- 3. TABLAS
-- ============================================================

-- App Settings
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Campaigns
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subtitle text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'active',
  is_active boolean NOT NULL DEFAULT true,
  period_mode text NOT NULL DEFAULT 'WEEKLY',
  points_mode text NOT NULL DEFAULT 'product',
  custom_days integer,
  anchor_date date,
  auto_periods_enabled boolean NOT NULL DEFAULT true,
  close_time_local text NOT NULL DEFAULT '23:59',
  close_reason text,
  closed_at timestamptz,
  registration_enabled boolean NOT NULL DEFAULT true,
  registration_open_at timestamptz,
  registration_close_at timestamptz,
  require_vendor_approval boolean NOT NULL DEFAULT false,
  ai_date_validation boolean NOT NULL DEFAULT false,
  enforce_sales_within_campaign boolean NOT NULL DEFAULT true,
  report_on_close boolean NOT NULL DEFAULT true,
  report_recipients_mode text NOT NULL DEFAULT 'BY_CITY',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Campaign Periods
CREATE TABLE public.campaign_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id),
  period_number integer NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'open',
  closed_at timestamptz,
  closed_by uuid,
  settlement_generated_at timestamptz,
  report_generated_at timestamptz,
  report_sent_at timestamptz
);

-- Cities
CREATE TABLE public.cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- City Groups
CREATE TABLE public.city_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- City Group Members
CREATE TABLE public.city_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.city_groups(id),
  city_name text NOT NULL
);

-- Products
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  model_code text NOT NULL,
  size_inches numeric,
  points_value integer NOT NULL DEFAULT 0,
  bonus_bs_value numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Vendors
CREATE TABLE public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  full_name text NOT NULL,
  city text NOT NULL,
  store_name text,
  phone text,
  email text,
  talla_polera text,
  qr_url text,
  qr_uploaded_at timestamptz,
  qr_expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  pending_approval boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Serials
CREATE TABLE public.serials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serial text NOT NULL,
  product_id uuid REFERENCES public.products(id),
  status serial_status NOT NULL DEFAULT 'available',
  used_sale_id uuid,
  imported_at timestamptz NOT NULL DEFAULT now()
);

-- Restricted Serials
CREATE TABLE public.restricted_serials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serial text NOT NULL,
  reason text NOT NULL,
  source_campaign text,
  imported_at timestamptz NOT NULL DEFAULT now()
);

-- Sales
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  serial text NOT NULL,
  sale_date date NOT NULL,
  city text NOT NULL,
  week_start date NOT NULL,
  week_end date NOT NULL,
  status sale_status NOT NULL DEFAULT 'pending',
  points integer NOT NULL DEFAULT 0,
  bonus_bs numeric NOT NULL DEFAULT 0,
  ai_flag boolean DEFAULT false,
  ai_date_detected text,
  ai_date_confidence numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Sale Attachments
CREATE TABLE public.sale_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL UNIQUE REFERENCES public.sales(id),
  nota_url text NOT NULL,
  poliza_url text NOT NULL,
  tag_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Reviews
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id),
  reviewer_user_id uuid NOT NULL,
  decision review_decision NOT NULL,
  reason text NOT NULL,
  reviewed_at timestamptz NOT NULL DEFAULT now()
);

-- Supervisor Audits
CREATE TABLE public.supervisor_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id),
  supervisor_user_id uuid NOT NULL,
  action audit_action NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Commission Payments
CREATE TABLE public.commission_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id),
  period_id uuid REFERENCES public.campaign_periods(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  units integer NOT NULL DEFAULT 0,
  amount_bs numeric NOT NULL DEFAULT 0,
  status commission_payment_status NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  paid_by uuid,
  payment_proof_url text,
  payment_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- User Profiles
CREATE TABLE public.user_profiles (
  user_id uuid PRIMARY KEY,
  email text NOT NULL,
  full_name text,
  is_disabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- User Roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  city text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  data jsonb,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Admin Audit Logs
CREATE TABLE public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  action text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Vendor Blocks
CREATE TABLE public.vendor_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id),
  reason text NOT NULL,
  start_at timestamptz NOT NULL DEFAULT now(),
  end_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Vendor Store History
CREATE TABLE public.vendor_store_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id),
  previous_store text,
  new_store text,
  observation text,
  changed_by uuid NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

-- Report Recipients
CREATE TABLE public.report_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id),
  email text NOT NULL,
  city text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Email Templates
CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL DEFAULT '',
  from_name text,
  reply_to text,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. FUNCIONES
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_city(_user_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT city FROM public.vendors WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_campaign_ranking(_campaign_id uuid)
RETURNS TABLE(vendor_id uuid, full_name text, city text, store_name text, total_points bigint, total_bonus_bs numeric, total_units bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    v.id AS vendor_id, v.full_name, v.city, v.store_name,
    COALESCE(SUM(CASE WHEN s.status = 'approved' THEN s.points ELSE 0 END), 0)::bigint AS total_points,
    COALESCE(SUM(CASE WHEN s.status = 'approved' THEN s.bonus_bs ELSE 0 END), 0) AS total_bonus_bs,
    COALESCE(COUNT(CASE WHEN s.status = 'approved' THEN 1 END), 0)::bigint AS total_units
  FROM public.vendors v
  LEFT JOIN public.sales s ON s.vendor_id = v.id AND s.campaign_id = _campaign_id
  WHERE v.is_active = true
  GROUP BY v.id, v.full_name, v.city, v.store_name
  ORDER BY total_points DESC, total_units DESC
$$;

CREATE OR REPLACE FUNCTION public.get_sales_by_city(_start_date date DEFAULT NULL, _end_date date DEFAULT NULL, _campaign_id uuid DEFAULT NULL)
RETURNS TABLE(city text, total_units bigint, total_bonus_bs numeric, total_points bigint, pending_units bigint, approved_units bigint, rejected_units bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    s.city,
    COUNT(*)::bigint AS total_units,
    COALESCE(SUM(CASE WHEN s.status = 'approved' THEN s.bonus_bs ELSE 0 END), 0) AS total_bonus_bs,
    COALESCE(SUM(CASE WHEN s.status = 'approved' THEN s.points ELSE 0 END), 0)::bigint AS total_points,
    COUNT(CASE WHEN s.status = 'pending' THEN 1 END)::bigint AS pending_units,
    COUNT(CASE WHEN s.status = 'approved' THEN 1 END)::bigint AS approved_units,
    COUNT(CASE WHEN s.status = 'rejected' THEN 1 END)::bigint AS rejected_units
  FROM public.sales s
  WHERE (_start_date IS NULL OR s.sale_date >= _start_date)
    AND (_end_date IS NULL OR s.sale_date <= _end_date)
    AND (_campaign_id IS NULL OR s.campaign_id = _campaign_id)
  GROUP BY s.city
  ORDER BY total_units DESC
$$;

CREATE OR REPLACE FUNCTION public.get_top_products(_start_date date DEFAULT NULL, _end_date date DEFAULT NULL, _campaign_id uuid DEFAULT NULL, _limit integer DEFAULT 10)
RETURNS TABLE(product_id uuid, product_name text, model_code text, city text, total_units bigint, total_bonus_bs numeric)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    p.id AS product_id, p.name AS product_name, p.model_code, s.city,
    COUNT(*)::bigint AS total_units,
    COALESCE(SUM(s.bonus_bs), 0) AS total_bonus_bs
  FROM public.sales s
  JOIN public.products p ON p.id = s.product_id
  WHERE s.status = 'approved'
    AND (_start_date IS NULL OR s.sale_date >= _start_date)
    AND (_end_date IS NULL OR s.sale_date <= _end_date)
    AND (_campaign_id IS NULL OR s.campaign_id = _campaign_id)
  GROUP BY p.id, p.name, p.model_code, s.city
  ORDER BY total_units DESC
  LIMIT _limit
$$;

-- Trigger: marcar serial como usado al insertar venta
CREATE OR REPLACE FUNCTION public.mark_serial_used()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.serials
  SET status = 'used', used_sale_id = NEW.id
  WHERE serial = NEW.serial AND status = 'available';
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mark_serial_used
  AFTER INSERT ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.mark_serial_used();

-- Trigger: revertir serial al rechazar venta
CREATE OR REPLACE FUNCTION public.revert_serial_on_rejection()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status != 'rejected' AND NEW.status = 'rejected' THEN
    UPDATE public.serials
    SET status = 'available', used_sale_id = NULL
    WHERE serial = NEW.serial AND used_sale_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_revert_serial_on_rejection
  AFTER UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.revert_serial_on_rejection();

-- ============================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.city_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.city_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.serials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restricted_serials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supervisor_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_store_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- ---- app_settings ----
CREATE POLICY "Admins manage settings" ON public.app_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- ---- campaigns ----
CREATE POLICY "Admins manage campaigns" ON public.campaigns FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can read campaigns" ON public.campaigns FOR SELECT TO authenticated
  USING (true);

-- ---- campaign_periods ----
CREATE POLICY "Admins manage campaign_periods" ON public.campaign_periods FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated read campaign_periods" ON public.campaign_periods FOR SELECT TO authenticated
  USING (true);

-- ---- cities ----
CREATE POLICY "Admins manage cities" ON public.cities FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated read cities" ON public.cities FOR SELECT TO authenticated
  USING (true);

-- ---- city_groups ----
CREATE POLICY "Admins manage city_groups" ON public.city_groups FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated read city_groups" ON public.city_groups FOR SELECT TO authenticated
  USING (true);

-- ---- city_group_members ----
CREATE POLICY "Admins manage city_group_members" ON public.city_group_members FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated read city_group_members" ON public.city_group_members FOR SELECT TO authenticated
  USING (true);

-- ---- products ----
CREATE POLICY "Admins manage products" ON public.products FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated read products" ON public.products FOR SELECT TO authenticated
  USING (true);

-- ---- vendors ----
CREATE POLICY "Admins manage vendors" ON public.vendors FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own vendor record" ON public.vendors FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Vendors can update own profile" ON public.vendors FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Vendors read own data" ON public.vendors FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'supervisor')
    OR (has_role(auth.uid(), 'revisor_ciudad') AND city = get_user_city(auth.uid())));

-- ---- serials ----
CREATE POLICY "Admins manage serials" ON public.serials FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated read serials" ON public.serials FOR SELECT TO authenticated
  USING (true);

-- ---- restricted_serials ----
CREATE POLICY "Admins manage restricted" ON public.restricted_serials FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated read restricted" ON public.restricted_serials FOR SELECT TO authenticated
  USING (true);

-- ---- sales ----
CREATE POLICY "Vendors insert own sales" ON public.sales FOR INSERT TO authenticated
  WITH CHECK (vendor_id IN (SELECT v.id FROM vendors v WHERE v.user_id = auth.uid()));
CREATE POLICY "Vendors read own sales" ON public.sales FOR SELECT TO authenticated
  USING (vendor_id IN (SELECT v.id FROM vendors v WHERE v.user_id = auth.uid())
    OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'supervisor')
    OR (has_role(auth.uid(), 'revisor_ciudad') AND city = get_user_city(auth.uid())));
CREATE POLICY "Reviewers and admins update sales" ON public.sales FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'supervisor')
    OR (has_role(auth.uid(), 'revisor_ciudad') AND city = get_user_city(auth.uid())));

-- ---- sale_attachments ----
CREATE POLICY "Read attachments" ON public.sale_attachments FOR SELECT TO authenticated
  USING (sale_id IN (SELECT s.id FROM sales s WHERE s.vendor_id IN (SELECT v.id FROM vendors v WHERE v.user_id = auth.uid()))
    OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'revisor_ciudad'));
CREATE POLICY "Vendors insert attachments" ON public.sale_attachments FOR INSERT TO authenticated
  WITH CHECK (sale_id IN (SELECT s.id FROM sales s WHERE s.vendor_id IN (SELECT v.id FROM vendors v WHERE v.user_id = auth.uid())));

-- ---- reviews ----
CREATE POLICY "Insert reviews" ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'revisor_ciudad') OR has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Read reviews" ON public.reviews FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'revisor_ciudad') OR reviewer_user_id = auth.uid());

-- ---- supervisor_audits ----
CREATE POLICY "Supervisors manage audits" ON public.supervisor_audits FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'supervisor'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'supervisor'));

-- ---- commission_payments ----
CREATE POLICY "Admins manage commission_payments" ON public.commission_payments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Vendors read own commission_payments" ON public.commission_payments FOR SELECT TO authenticated
  USING (vendor_id IN (SELECT v.id FROM vendors v WHERE v.user_id = auth.uid()));

-- ---- user_profiles ----
CREATE POLICY "Admins manage profiles" ON public.user_profiles FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users read own profile" ON public.user_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.user_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.user_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---- user_roles ----
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own role" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND role = 'vendedor');

-- ---- notifications ----
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- ---- admin_audit_logs ----
CREATE POLICY "Admins insert audit logs" ON public.admin_audit_logs FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read audit logs" ON public.admin_audit_logs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- ---- vendor_blocks ----
CREATE POLICY "Admins manage blocks" ON public.vendor_blocks FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Vendors read own blocks" ON public.vendor_blocks FOR SELECT TO authenticated
  USING (vendor_id IN (SELECT v.id FROM vendors v WHERE v.user_id = auth.uid()));

-- ---- vendor_store_history ----
CREATE POLICY "Admins manage store history" ON public.vendor_store_history FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Vendors read own store history" ON public.vendor_store_history FOR SELECT TO authenticated
  USING (vendor_id IN (SELECT vendors.id FROM vendors WHERE vendors.user_id = auth.uid()));

-- ---- report_recipients ----
CREATE POLICY "Admins manage recipients" ON public.report_recipients FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- ---- email_templates ----
CREATE POLICY "Admins manage email_templates" ON public.email_templates FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- ============================================================
-- 6. STORAGE BUCKETS (ejecutar desde SQL o dashboard)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('sale-attachments', 'sale-attachments', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('vendor-qr', 'vendor-qr', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', false);

-- ============================================================
-- 7. USUARIO ADMINISTRADOR INICIAL
-- ============================================================
-- Después de crear el usuario admin@skyworth.bo con contraseña Admin123!
-- desde el dashboard de Supabase Auth, ejecutar:
--
-- INSERT INTO public.user_profiles (user_id, email, full_name)
-- VALUES ('<UUID_DEL_USUARIO>', 'admin@skyworth.bo', 'Administrador');
--
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('<UUID_DEL_USUARIO>', 'admin');
