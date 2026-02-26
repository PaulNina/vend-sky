
-- Create cities table for parameterizable city management
CREATE TABLE public.cities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read cities
CREATE POLICY "Authenticated read cities" ON public.cities FOR SELECT USING (true);

-- Admins manage cities
CREATE POLICY "Admins manage cities" ON public.cities FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed with Bolivia cities
INSERT INTO public.cities (name, display_order) VALUES
  ('La Paz', 1),
  ('El Alto', 2),
  ('Cochabamba', 3),
  ('Santa Cruz', 4),
  ('Oruro', 5),
  ('Potosí', 6),
  ('Sucre', 7),
  ('Tarija', 8),
  ('Trinidad', 9),
  ('Cobija', 10);
