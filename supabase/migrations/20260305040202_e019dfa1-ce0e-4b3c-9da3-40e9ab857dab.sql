INSERT INTO public.user_profiles (user_id, email, full_name, is_disabled, created_at, updated_at)
SELECT v.user_id, COALESCE(v.email, ''), v.full_name, NOT v.is_active, v.created_at, now()
FROM public.vendors v
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles up WHERE up.user_id = v.user_id
)
AND v.email IS NOT NULL;