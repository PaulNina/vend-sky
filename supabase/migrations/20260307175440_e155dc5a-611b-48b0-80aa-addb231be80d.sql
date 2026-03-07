-- Drop the old narrow policy and create a broader one that covers campaign-specific keys too
DROP POLICY IF EXISTS "Public read landing settings" ON public.app_settings;

CREATE POLICY "Public read landing settings"
ON public.app_settings
FOR SELECT
TO anon, authenticated
USING (key LIKE 'landing_%');
