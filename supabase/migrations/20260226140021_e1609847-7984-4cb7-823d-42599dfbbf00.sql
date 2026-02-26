
-- Drop the restrictive authenticated-only policy
DROP POLICY IF EXISTS "Anyone authenticated can read campaigns" ON public.campaigns;

-- Create a permissive policy allowing anyone (including anonymous/unauthenticated) to read campaigns
CREATE POLICY "Anyone can read campaigns"
ON public.campaigns
FOR SELECT
USING (true);
