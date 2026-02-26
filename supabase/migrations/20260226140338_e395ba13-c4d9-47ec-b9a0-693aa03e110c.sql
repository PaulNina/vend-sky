
-- Allow newly registered users to insert their own vendor record
CREATE POLICY "Users can insert own vendor record"
ON public.vendors
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow newly registered users to insert their own role
CREATE POLICY "Users can insert own role"
ON public.user_roles
FOR INSERT
WITH CHECK (auth.uid() = user_id AND role = 'vendedor'::app_role);

-- Allow vendors to update their own basic profile data
CREATE POLICY "Vendors can update own profile"
ON public.vendors
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
