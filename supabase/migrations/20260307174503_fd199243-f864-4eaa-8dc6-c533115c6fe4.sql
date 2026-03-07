
-- Allow public (anonymous) read access to landing page settings
CREATE POLICY "Public read landing settings"
ON public.app_settings
FOR SELECT
TO anon, authenticated
USING (key LIKE 'landing_%');
