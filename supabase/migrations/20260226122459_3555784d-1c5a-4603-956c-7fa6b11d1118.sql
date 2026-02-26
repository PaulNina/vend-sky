
-- City groups for report grouping (e.g., "Ciudades Intermedias" = Tarija, Bermejo, Sucre)
CREATE TABLE public.city_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.city_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage city_groups"
  ON public.city_groups FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated read city_groups"
  ON public.city_groups FOR SELECT
  USING (true);

-- Mapping cities to groups
CREATE TABLE public.city_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.city_groups(id) ON DELETE CASCADE,
  city_name text NOT NULL,
  UNIQUE(group_id, city_name)
);

ALTER TABLE public.city_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage city_group_members"
  ON public.city_group_members FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated read city_group_members"
  ON public.city_group_members FOR SELECT
  USING (true);
