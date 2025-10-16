-- Fix the cleanup function to have proper search_path
CREATE OR REPLACE FUNCTION public.cleanup_old_failed_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.bookings
  WHERE status IN ('pending', 'payment_failed')
  AND created_at < NOW() - INTERVAL '7 days';
END;
$$;

-- Drop the security definer view and recreate as a regular view with RLS policy
DROP VIEW IF EXISTS public.admin_transaction_audit;

CREATE VIEW public.admin_transaction_audit 
WITH (security_invoker = true) AS
SELECT 
  b.id,
  b.booking_date,
  b.time_slot,
  b.location,
  b.litres,
  b.litres * 2 as amount,
  b.status,
  b.mpesa_receipt_number,
  b.payment_date,
  b.payment_phone,
  b.created_at,
  b.updated_at,
  p.name as customer_name,
  p.phone as customer_phone,
  p.email as customer_email,
  p.user_id
FROM public.bookings b
JOIN public.profiles p ON b.user_id = p.user_id
WHERE b.status IN ('confirmed', 'delivered')
ORDER BY b.payment_date DESC;