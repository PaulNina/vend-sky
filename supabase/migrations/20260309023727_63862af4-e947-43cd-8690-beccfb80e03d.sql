
DROP FUNCTION IF EXISTS public.get_sales_by_city(date, date, uuid);

CREATE OR REPLACE FUNCTION public.get_sales_by_city(_start_date date DEFAULT NULL::date, _end_date date DEFAULT NULL::date, _campaign_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(city text, total_units bigint, total_bonus_bs numeric, total_points bigint, pending_units bigint, approved_units bigint, rejected_units bigint, observed_units bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    s.city,
    COUNT(*)::bigint AS total_units,
    COALESCE(SUM(CASE WHEN s.status = 'approved' THEN s.bonus_bs ELSE 0 END), 0) AS total_bonus_bs,
    COALESCE(SUM(CASE WHEN s.status = 'approved' THEN s.points ELSE 0 END), 0)::bigint AS total_points,
    COUNT(CASE WHEN s.status = 'pending' THEN 1 END)::bigint AS pending_units,
    COUNT(CASE WHEN s.status = 'approved' THEN 1 END)::bigint AS approved_units,
    COUNT(CASE WHEN s.status = 'rejected' THEN 1 END)::bigint AS rejected_units,
    COUNT(CASE WHEN s.status = 'observed' THEN 1 END)::bigint AS observed_units
  FROM public.sales s
  WHERE (_start_date IS NULL OR s.sale_date >= _start_date)
    AND (_end_date IS NULL OR s.sale_date <= _end_date)
    AND (_campaign_id IS NULL OR s.campaign_id = _campaign_id)
  GROUP BY s.city
  ORDER BY total_units DESC
$function$;
