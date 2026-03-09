-- Add RLS policy to prevent sales registration in campaigns where vendor is not enrolled
-- This provides database-level enforcement of enrollment validation

CREATE POLICY "Vendors can only insert sales in enrolled campaigns"
ON public.sales
FOR INSERT
WITH CHECK (
  vendor_id IN (
    SELECT vendor_id 
    FROM public.vendor_campaign_enrollments
    WHERE campaign_id = sales.campaign_id
      AND status = 'active'
  )
);