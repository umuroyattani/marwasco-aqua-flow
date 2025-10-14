-- Add M-Pesa payment tracking columns to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS checkout_request_id TEXT,
ADD COLUMN IF NOT EXISTS mpesa_receipt_number TEXT,
ADD COLUMN IF NOT EXISTS payment_phone TEXT,
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_error TEXT;

-- Add index for faster checkout request lookups
CREATE INDEX IF NOT EXISTS idx_bookings_checkout_request 
ON public.bookings(checkout_request_id);