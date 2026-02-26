
-- Trigger to mark serial as "used" when a sale is inserted
CREATE OR REPLACE FUNCTION public.mark_serial_used()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.serials
  SET status = 'used', used_sale_id = NEW.id
  WHERE serial = NEW.serial AND status = 'available';
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mark_serial_used
AFTER INSERT ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.mark_serial_used();

-- Also create a trigger to revert serial when sale is rejected
CREATE OR REPLACE FUNCTION public.revert_serial_on_rejection()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status != 'rejected' AND NEW.status = 'rejected' THEN
    UPDATE public.serials
    SET status = 'available', used_sale_id = NULL
    WHERE serial = NEW.serial AND used_sale_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_revert_serial_on_rejection
AFTER UPDATE ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.revert_serial_on_rejection();

-- Fix existing data: mark serials that already have sales as "used"
UPDATE public.serials s
SET status = 'used', used_sale_id = sale.id
FROM (
  SELECT DISTINCT ON (serial) id, serial
  FROM public.sales
  WHERE status != 'rejected'
  ORDER BY serial, created_at ASC
) sale
WHERE s.serial = sale.serial AND s.status = 'available';
