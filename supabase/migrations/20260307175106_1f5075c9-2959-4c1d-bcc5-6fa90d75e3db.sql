ALTER TABLE public.campaigns ADD COLUMN slug text UNIQUE;

-- RLS policy to allow public read of campaign slug for landing pages
CREATE POLICY "Public read campaign by slug"
ON public.campaigns
FOR SELECT
TO anon
USING (slug IS NOT NULL AND is_active = true AND status = 'active');
