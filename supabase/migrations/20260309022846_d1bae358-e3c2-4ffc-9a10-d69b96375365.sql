
-- Add observation_reason column to sales
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS observation_reason text;

-- Allow vendors to update their own sales ONLY when status is 'observed' (to resubmit)
CREATE POLICY "Vendors can resubmit observed sales"
ON public.sales
FOR UPDATE
TO authenticated
USING (
  status = 'observed'
  AND vendor_id IN (SELECT v.id FROM vendors v WHERE v.user_id = auth.uid())
)
WITH CHECK (
  vendor_id IN (SELECT v.id FROM vendors v WHERE v.user_id = auth.uid())
);

-- Allow vendors to update their own sale_attachments when sale is observed
CREATE POLICY "Vendors update attachments on observed sales"
ON public.sale_attachments
FOR UPDATE
TO authenticated
USING (
  sale_id IN (
    SELECT s.id FROM sales s
    WHERE s.status = 'observed'
    AND s.vendor_id IN (SELECT v.id FROM vendors v WHERE v.user_id = auth.uid())
  )
)
WITH CHECK (
  sale_id IN (
    SELECT s.id FROM sales s
    WHERE s.vendor_id IN (SELECT v.id FROM vendors v WHERE v.user_id = auth.uid())
  )
);
