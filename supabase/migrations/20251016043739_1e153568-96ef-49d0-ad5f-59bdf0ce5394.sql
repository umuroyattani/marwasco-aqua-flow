-- Drop the old unique constraint that causes duplicate errors
ALTER TABLE public.bookings 
DROP CONSTRAINT IF EXISTS bookings_booking_date_time_slot_key;

-- Drop the confirmed bookings index if it exists
DROP INDEX IF EXISTS bookings_confirmed_time_slot_idx;

-- Create a new unique constraint that only applies to confirmed/delivered bookings
-- This allows multiple pending/failed bookings for the same slot
CREATE UNIQUE INDEX bookings_active_time_slot_idx 
ON public.bookings (booking_date, time_slot) 
WHERE status IN ('confirmed', 'delivered');

-- Add DELETE policies for users to delete their own pending/failed bookings
CREATE POLICY "Users can delete their pending or failed bookings"
ON public.bookings FOR DELETE
USING (
  auth.uid() = user_id AND 
  status IN ('pending', 'payment_failed')
);

-- Add DELETE policy for admins to delete any pending/failed bookings
CREATE POLICY "Admins can delete pending or failed bookings"
ON public.bookings FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin'::app_role) AND
  status IN ('pending', 'payment_failed')
);

-- Create function to auto-delete old failed bookings (older than 7 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_failed_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.bookings
  WHERE status IN ('pending', 'payment_failed')
  AND created_at < NOW() - INTERVAL '7 days';
END;
$$;

-- Add admin audit view for successful transactions
CREATE OR REPLACE VIEW public.admin_transaction_audit AS
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

-- Grant access to the audit view for admins
GRANT SELECT ON public.admin_transaction_audit TO authenticated;