-- Update get_campaign_ranking to only include vendors enrolled in the campaign
CREATE OR REPLACE FUNCTION public.get_campaign_ranking(_campaign_id uuid)
RETURNS TABLE(vendor_id uuid, full_name text, city text, store_name text, total_points bigint, total_bonus_bs numeric, total_units bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    v.id AS vendor_id,
    v.full_name,
    v.city,
    v.store_name,
    COALESCE(SUM(CASE WHEN s.status = 'approved' THEN s.points ELSE 0 END), 0)::bigint AS total_points,
    COALESCE(SUM(CASE WHEN s.status = 'approved' THEN s.bonus_bs ELSE 0 END), 0) AS total_bonus_bs,
    COALESCE(COUNT(CASE WHEN s.status = 'approved' THEN 1 END), 0)::bigint AS total_units
  FROM public.vendors v
  INNER JOIN public.vendor_campaign_enrollments vce 
    ON vce.vendor_id = v.id 
    AND vce.campaign_id = _campaign_id 
    AND vce.status = 'active'
  LEFT JOIN public.sales s ON s.vendor_id = v.id AND s.campaign_id = _campaign_id
  WHERE v.is_active = true
  GROUP BY v.id, v.full_name, v.city, v.store_name
  ORDER BY total_points DESC, total_units DESC
$$;