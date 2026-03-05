INSERT INTO public.user_roles (user_id, role, city)
SELECT v.user_id, 'vendedor'::app_role, v.city
FROM public.vendors v
WHERE v.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = v.user_id
  )
ON CONFLICT DO NOTHING;