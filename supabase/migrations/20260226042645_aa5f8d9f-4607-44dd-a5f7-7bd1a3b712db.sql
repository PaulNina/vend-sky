
-- Add AI date validation columns to sales
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS ai_date_detected text,
  ADD COLUMN IF NOT EXISTS ai_date_confidence numeric;

-- Make sale-attachments bucket public
UPDATE storage.buckets SET public = true WHERE id = 'sale-attachments';

-- Add storage policy for public read access
CREATE POLICY "Public read sale attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'sale-attachments');

-- Allow authenticated users to upload to sale-attachments
CREATE POLICY "Authenticated upload sale attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'sale-attachments' AND auth.role() = 'authenticated');
